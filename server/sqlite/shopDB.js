// ==================== 店铺（数据沙箱）：开通、克隆、回收 ====================
// 隔离模型：shops 是租户主体表，所有业务表带 shop_id。
// 模板店（id=1）是演示素材的唯一来源，游客沙箱从它克隆一份独立数据。
//
// 克隆用「id 整体加偏移」而不是逐行记 old→new 映射：
// 每张表的 id 和指向它的外键偏移量完全相同，引用关系自动保持一致。
// 偏移后必然大于任何现存 id（偏移量是 100 万的整数倍，而模板数据最大 id 是 9107）。
//
// 一个已知的「不修」的地方：模板里 order_items #74 的 product_id=41 指向一个
// 根本不存在的商品（历史脏数据；该列没声明外键，所以 foreign_key_check 不报）。
// 克隆会如实复制这条悬空引用 —— 与模板行为完全一致，且偏移后落在一个谁也
// 不会用到的 id 上（新建数据走本店号段内 MAX(id)+1，号段内已有最大 id 远大于它），不存在跨店指向。
const path = require('path');
const fs = require('fs');
const { getDB, saveDatabase } = require('./connection');
const { getNow, requireShopId } = require('./utils');
const {
  SHOP_TABLES,
  TEMPLATE_SHOP_ID,
  TEMPLATE_SHOP_NAME,
  ID_BLOCK,
  SANDBOX_TTL,
  SANDBOX_ACTIVE_LIMIT,
} = require('./shopTables');

// 上传文件的磁盘根目录（uploads.path 存的是 /image/xxx 这种 URL 路径）
const PUBLIC_IMAGE_DIR = path.join(__dirname, '..', '..', 'public', 'image');

/** 只用于克隆的 16 张业务表（uploads 不克隆，它只记录本店上传过的物理文件） */
const CLONE_TABLES = SHOP_TABLES.filter(t => t.clone !== false);

/** 表的所有列名（缓存，克隆时要拼 SQL） */
const columnCache = {};
function columnsOf(db, table) {
  if (!columnCache[table]) {
    columnCache[table] = db.exec(`PRAGMA table_info(${table})`)[0].values.map(v => v[1]);
  }
  return columnCache[table];
}

/** 取标量 */
function scalar(db, sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const v = stmt.step() ? Object.values(stmt.getAsObject())[0] : null;
  stmt.free();
  return v;
}

/** 当前外键违规的条数（库里原本就有 1 条历史脏数据，所以只能比对增量） */
function fkViolationCount(db) {
  const r = db.exec('PRAGMA foreign_key_check');
  return r[0] ? r[0].values.length : 0;
}

/**
 * 所有克隆表里现存的最大 id。
 * 偏移量必须大于它，否则克隆出来的 id 会和已有数据撞主键。
 * 注意不能只查某一张表：新建数据按「号段内 MAX(id)+1」增长，
 * 而这个值可能出现在任意一张表里（号段隔离后仍应全局核对，防止号段越界）。
 */
function globalMaxId(db) {
  let max = 0;
  for (const t of CLONE_TABLES) {
    const v = scalar(db, `SELECT COALESCE(MAX(${t.id}), 0) FROM ${t.table}`);
    if (v > max) max = v;
  }
  return max;
}

/**
 * 生成某张表的克隆 SQL：id 列和外键列整体加偏移量，其余列原样复制
 * 偏移表达式需要绑参数，所以顺便把 params 按出现顺序收集好一起返回
 */
function buildCloneSql(db, table, shopId, offset) {
  const spec = SHOP_TABLES.find(t => t.table === table);
  const cols = columnsOf(db, table);
  const fkSet = new Set(spec.fks);

  const exprs = cols.map(col => {
    if (col === 'shop_id') return ['?', shopId];
    if (col === spec.id) return [`${col} + ?`, offset];
    if (fkSet.has(col)) {
      // categories.parent_id 要防悬空引用：模板里 id=801 的 parent_id=8 已不存在
      // （历史脏数据），直接偏移会克隆出一条指向不存在分类的行。
      // 落成 NULL 后它会变成一级分类，在新沙箱里反而可见了。
      if (table === 'categories' && col === 'parent_id') {
        return [
          `CASE WHEN ${col} IN (SELECT id FROM categories WHERE shop_id = ${TEMPLATE_SHOP_ID}) ` +
          `THEN ${col} + ? ELSE NULL END`,
          offset,
        ];
      }
      return [`${col} + ?`, offset];
    }
    // 全局唯一键要改写，否则第二个沙箱开始克隆就撞约束
    if (table === 'tags' && col === 'code') {
      // tags.code 有全局 UNIQUE。模板里现在是 NULL（UNIQUE 允许多个 NULL），
      // 但一旦模板建了带 code 的标签，不改写就会 UNIQUE constraint failed
      return [`CASE WHEN ${col} IS NULL THEN NULL ELSE ${col} || '-s' || ? END`, shopId];
    }
    if (table === 'users' && col === 'username') {
      // users.username 有全局 UNIQUE
      return [`${col} || '_s' || ?`, shopId];
    }
    if (table === 'users' && col === 'password') {
      // 不能把模板账号的真实密码克隆出去。用 SQLite 自带的 randomblob 逐行生成随机串 ——
      // 如果改成绑一个 JS 参数，整张表所有行会共用同一个值
      return ['hex(randomblob(16))', null];
    }
    return [col, null];
  });

  const params = [];
  for (const [, p] of exprs) if (p !== null) params.push(p);
  const selectList = exprs.map(([e]) => e).join(', ');
  const colList = cols.join(', ');

  // after_sale_only_refunds 里模板有 11 行孤儿（after_sale_id 指向不存在的售后单，
  // 该表没声明外键所以不被约束）。不过滤的话每个沙箱白背 11 行永远查不出来的垃圾
  const where = table === 'after_sale_only_refunds'
    ? `shop_id = ${TEMPLATE_SHOP_ID} AND after_sale_id IN (SELECT id FROM after_sales WHERE shop_id = ${TEMPLATE_SHOP_ID})`
    : `shop_id = ${TEMPLATE_SHOP_ID}`;

  return {
    sql: `INSERT INTO ${table} (${colList}) SELECT ${selectList} FROM ${table} WHERE ${where}`,
    params,
  };
}

const ShopDB = {
  /** 按 id 查店铺（不过滤有效期，是否过期由调用方判断，好给出更准确的原因） */
  findById: (id) => {
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM shops WHERE id = ?');
    stmt.bind([id]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  },

  /** 当前未被回收的沙箱数量（模板店不计） */
  countActiveSandboxes: () => {
    const db = getDB();
    return scalar(db, 'SELECT COUNT(*) FROM shops WHERE is_template = 0');
  },

  /**
   * 一键体验：开店 → 克隆模板数据 → 返回店铺和沙箱管理员用户
   *
   * 全程一个事务，最后只写一次盘。克隆期间必须关外键：
   * categories 是自引用（parent_id 指向 categories.id），子行可能先于父行插入。
   * 注意 sql.js 里 PRAGMA foreign_keys 在事务内是「静默无效」的，
   * 所以必须在 BEGIN 之前关、COMMIT 之后开。
   */
  createSandbox: () => {
    const db = getDB();
    const now = getNow();

    // 0. 容量上限：没有这道闸门，脚本刷沙箱会把磁盘和内存撑爆
    if (ShopDB.countActiveSandboxes() >= SANDBOX_ACTIVE_LIMIT) {
      const err = new Error('体验名额已满，请稍后再试');
      err.status = 429;
      throw err;
    }

    // 先建店铺行，拿到它的 id 才能算偏移量
    // （这条 INSERT 在事务外，所以下面失败时要在 catch 里单独清掉）
    db.run(
      'INSERT INTO shops (name, is_template, created_at, expires_at) VALUES (?, 0, ?, ?)',
      [TEMPLATE_SHOP_NAME, now, now + SANDBOX_TTL]
    );
    const shopId = scalar(db, 'SELECT last_insert_rowid()');
    const offset = shopId * ID_BLOCK;

    let inTransaction = false;
    try {
      // 1. 偏移量必须大于现存最大 id，否则克隆体一插进去就撞模板店的主键
      const maxId = globalMaxId(db);
      if (maxId >= offset) {
        throw new Error(`现存最大 id ${maxId} 已达本店号段起点 ${offset}，需调大 ID_BLOCK`);
      }

      const fkBefore = fkViolationCount(db);

      db.run('PRAGMA foreign_keys = OFF');
      db.run('BEGIN');
      inTransaction = true;

      for (const t of CLONE_TABLES) {
        const { sql, params } = buildCloneSql(db, t.table, shopId, offset);
        db.run(sql, params);

        // 逐表比对行数：克隆必须完整。过滤掉孤儿的那张表允许少 11 行，单独放行
        const srcCount = scalar(db, `SELECT COUNT(*) FROM ${t.table} WHERE shop_id = ${TEMPLATE_SHOP_ID}`);
        const dstCount = scalar(db, `SELECT COUNT(*) FROM ${t.table} WHERE shop_id = ?`, [shopId]);
        if (t.table === 'after_sale_only_refunds') {
          const orphans = scalar(db,
            `SELECT COUNT(*) FROM after_sale_only_refunds WHERE shop_id = ${TEMPLATE_SHOP_ID} ` +
            `AND after_sale_id NOT IN (SELECT id FROM after_sales WHERE shop_id = ${TEMPLATE_SHOP_ID})`);
          if (dstCount !== srcCount - orphans) {
            throw new Error(`克隆 ${t.table} 行数不符：模板 ${srcCount} - 孤儿 ${orphans} ≠ 新店 ${dstCount}`);
          }
        } else if (dstCount !== srcCount) {
          throw new Error(`克隆 ${t.table} 行数不符：模板 ${srcCount} → 新店 ${dstCount}`);
        }
      }

      // 核验要在 COMMIT 之前做，这样不合格可以直接回滚
      const fkAfter = fkViolationCount(db);
      if (fkAfter !== fkBefore) {
        throw new Error(`克隆引入了新的外键违规：${fkBefore} → ${fkAfter}`);
      }

      db.run('COMMIT');
      inTransaction = false;
      db.run('PRAGMA foreign_keys = ON');

      // 沙箱管理员 = 克隆出来的那个模板 admin（id 偏移后）
      const adminId = scalar(db,
        `SELECT MIN(id) FROM users WHERE shop_id = ? AND role = 'admin'`, [shopId]);
      if (!adminId) throw new Error('克隆后找不到沙箱管理员账号');

      saveDatabase();
      return { shop: ShopDB.findById(shopId), userId: adminId, username: `admin_s${shopId}` };
    } catch (err) {
      if (inTransaction) {
        db.run('ROLLBACK');
        db.run('PRAGMA foreign_keys = ON');
      }
      // 回滚只撤销事务内的克隆，事务外那条 shops 行（以及已提交的克隆数据）要单独清掉。
      // 不会写盘：失败路径上 saveDatabase 从未被调用，磁盘文件仍是上一次成功的状态
      try {
        ShopDB.purgeShop(shopId);
      } catch (e) { /* 清理失败不影响主错误抛出 */ }
      throw err;
    }
  },

  /** 把 uploads 表里记录的物理文件删掉（文件可能已被手工删过，忽略失败） */
  deleteUploadedFiles: (shopId) => {
    const db = getDB();
    const stmt = db.prepare('SELECT path FROM uploads WHERE shop_id = ?');
    stmt.bind([shopId]);
    const paths = [];
    while (stmt.step()) paths.push(stmt.getAsObject().path);
    stmt.free();

    let removed = 0;
    for (const urlPath of paths) {
      // urlPath 形如 /image/upload/xxx.png，拼到 public/image 下
      const rel = String(urlPath).replace(/^\/image\//, '');
      const abs = path.resolve(PUBLIC_IMAGE_DIR, rel);
      // 防目录穿越：解析后的路径必须仍在 public/image 之内
      if (!abs.startsWith(PUBLIC_IMAGE_DIR)) continue;
      try {
        fs.unlinkSync(abs);
        removed++;
      } catch (e) { /* 文件不存在就跳过 */ }
    }
    return removed;
  },

  /**
   * 回收单个店铺：删掉它在所有业务表里的数据、上传文件、店铺行
   * 顺序是克隆顺序的逆序（先删子表再删父表）
   */
  purgeShop: (shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const files = ShopDB.deleteUploadedFiles(shopId);
    for (const t of [...SHOP_TABLES].reverse()) {
      db.run(`DELETE FROM ${t.table} WHERE shop_id = ?`, [shopId]);
    }
    db.run('DELETE FROM shops WHERE id = ? AND is_template = 0', [shopId]);
    return { shopId, files };
  },

  /** 定时回收：扫出过期沙箱逐个清理，整个批次只写一次盘 */
  sweepExpired: () => {
    const db = getDB();
    const stmt = db.prepare(
      'SELECT id FROM shops WHERE is_template = 0 AND expires_at IS NOT NULL AND expires_at <= ?'
    );
    stmt.bind([getNow()]);
    const expired = [];
    while (stmt.step()) expired.push(stmt.getAsObject().id);
    stmt.free();

    if (!expired.length) return { purged: 0 };

    let files = 0;
    for (const shopId of expired) {
      files += ShopDB.purgeShop(shopId).files;
    }
    // 整批只写一次文件（saveDatabase 是全库导出+覆盖写，很贵）
    saveDatabase();
    console.log(`[Shop] 已回收 ${expired.length} 个过期沙箱（id: ${expired.join(',')}），删除上传文件 ${files} 个`);
    return { purged: expired.length, files };
  },
};

module.exports = { ShopDB, ID_BLOCK, CLONE_TABLES };
