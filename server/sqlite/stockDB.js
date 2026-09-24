// ==================== 库存预警 CRUD ====================
// 说明：
//   stock 表只存"预警配置"：min_stock / max_stock / alert_enabled
//   当前库存数 current_stock 在 products.stock 里（不归本表管）
//   关联查询按项目偏好用 逗号 + WHERE，不写 JOIN/ON
const { getDB, saveDatabase } = require('./connection');
const { getNow, nextIdInShop, formatDates, requireShopId } = require('./utils');

const StockDB = {

  // ==================== 查：单条预警配置（按主键 id） ====================
  findById: (id, shopId) => {
    if (id === undefined || id === null) return null;
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM stock WHERE id = ? AND shop_id = ?');
    stmt.bind([id, shopId]);
    if (!stmt.step()) { stmt.free(); return null; }
    const obj = stmt.getAsObject();
    stmt.free();
    return formatDates(obj);
  },

  // ==================== 查：单条预警配置（按 product_id） ====================
  // UNIQUE 约束保证最多一条，直接走索引
  findByProductId: (productId, shopId) => {
    if (productId === undefined || productId === null) return null;
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM stock WHERE product_id = ? AND shop_id = ?');
    stmt.bind([productId, shopId]);
    if (!stmt.step()) { stmt.free(); return null; }
    const obj = stmt.getAsObject();
    stmt.free();
    return formatDates(obj);
  },

  // ==================== 查：预警配置列表（关联商品） ====================
  // 用 LEFT JOIN：所有商品都展示，没配预警的字段为 NULL
  // search 可选：按商品名模糊搜索（LIKE %keyword%），跟 projectController.getProducts 的 search 对齐
  getListWithProducts: (search, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    let sql = `SELECT
        p.id,
        p.name,
        p.image,
        p.description,
        p.id          AS product_id,
        p.stock,
        s.id          AS stock_id,
        s.min_stock,
        s.max_stock,
        s.alert_enabled,
        s.created_at,
        s.updated_at
      FROM products p
      LEFT JOIN stock s ON s.product_id = p.id AND s.shop_id = p.shop_id`;
    const params = [];
    if (search) {
      sql += ` AND p.name LIKE ?`;
      params.push('%' + search + '%');
    }
    // shop_id 是 LEFT JOIN 左侧（products）的条件，放 WHERE 才是真正的行过滤；
    // 右侧（stock）的条件放在上面的 ON 里，否则会把「还没配预警」的商品整行滤掉
    sql += ' WHERE p.shop_id = ?';
    params.push(shopId);
    sql += ` ORDER BY p.stock ASC, p.id ASC`;
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const data = [];
    while (stmt.step()) {
      const row = formatDates(stmt.getAsObject(), ['stock_created_at', 'stock_updated_at']);
      data.push(row);
    }
    stmt.free();
    return data;
  },

  // ==================== 查：还没配预警的商品（候选项，给"新增预警"用） ====================
  // 用 NOT EXISTS 子查询，不写 LEFT JOIN
  getProductsWithoutStockConfig: (shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const sql = `SELECT
        p.id    AS product_id,
        p.name  AS product_name,
        p.image AS product_image,
        p.stock AS current_stock
      FROM products p
      WHERE NOT EXISTS (SELECT 1 FROM stock s WHERE s.product_id = p.id AND s.shop_id = p.shop_id) AND p.shop_id = ?
      ORDER BY p.id ASC`;
    const params = [shopId];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const data = [];
    while (stmt.step()) data.push(stmt.getAsObject());
    stmt.free();
    return data;
  },

  // ==================== 增：创建预警配置 ====================
  // data 必填：product_id；可选：min_stock / max_stock / alert_enabled
  create: (data, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    StockDB._validate(data);

    const productId = data.product_id;
    // 提前查一下给友好错误（UNIQUE 约束也会兜底，但报错信息不友好）
    if (StockDB.findByProductId(productId, shopId)) {
      throw new Error('该商品已存在预警配置，请用更新接口');
    }

    const id = nextIdInShop('stock', shopId);
    const now = getNow();
    db.run(`INSERT INTO stock
              (id, shop_id, product_id, min_stock, max_stock, alert_enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, shopId, productId,
       data.min_stock ?? null,
       data.max_stock ?? null,
       data.alert_enabled ?? null,
       now]);
    saveDatabase();
    return StockDB.findById(id, shopId);
  },

  // ==================== 改：更新预警配置（部分字段更新） ====================
  // 未传的字段保持原值；min/max/alert_enabled 任意组合都可以更新
  update: (id, data, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const existing = StockDB.findById(id, shopId);
    if (!existing) return null;

    // 合并"原值 + 新值"做校验，避免半更新导致非法组合
    const merged = {
      alert_enabled: data.alert_enabled !== undefined ? data.alert_enabled : existing.alert_enabled,
      min_stock:     data.min_stock     !== undefined ? data.min_stock     : existing.min_stock,
      max_stock:     data.max_stock     !== undefined ? data.max_stock     : existing.max_stock,
    };
    StockDB._validate(merged);

    const fields = [];
    const values = [];
    for (const key of ['min_stock', 'max_stock', 'alert_enabled']) {
      if (data[key] !== undefined) {
        fields.push(key + ' = ?');
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return existing;   // 啥都没改，直接返回
    fields.push('updated_at = ?');
    values.push(getNow());
    values.push(id);
    values.push(shopId);

    db.run(`UPDATE stock SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`, values);
    saveDatabase();
    return StockDB.findById(id, shopId);
  },

  // ==================== 删：删除预警配置（物理删除，本表无 is_deleted） ====================
  delete: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const existing = StockDB.findById(id, shopId);
    if (!existing) return false;
    db.run('DELETE FROM stock WHERE id = ? AND shop_id = ?', [id, shopId]);
    saveDatabase();
    return true;
  },

  // ==================== 校验（业务规则放 JS 层，DB 层只保 nullable + 非负） ====================
  _validate: (data) => {
    const { alert_enabled, min_stock, max_stock } = data;

    // alert_enabled 必须是 0 / 1 / null
    if (alert_enabled !== undefined && alert_enabled !== null
        && alert_enabled !== 0 && alert_enabled !== 1) {
      throw new Error('alert_enabled 只能是 0 / 1 / null');
    }

    // min_stock / max_stock 非空时必须 >= 0
    for (const [name, val] of [['min_stock', min_stock], ['max_stock', max_stock]]) {
      if (val !== null && val !== undefined) {
        if (typeof val !== 'number' || Number.isNaN(val) || val < 0) {
          throw new Error(name + ' 必须是非负数字');
        }
      }
    }

    // 开启预警时：min/max 都必填，且 min ≤ max
    if (alert_enabled === 1) {
      if (min_stock === null || min_stock === undefined) {
        throw new Error('开启预警时必须填写库存下限');
      }
      if (max_stock === null || max_stock === undefined) {
        throw new Error('开启预警时必须填写库存上限');
      }
      if (min_stock > max_stock) {
        throw new Error('库存下限不能大于库存上限');
      }
    }
  },
};

module.exports = { StockDB };