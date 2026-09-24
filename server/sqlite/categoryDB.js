// ==================== 分类 CRUD ====================
// Model 层：只负责分类的增删改查和排序，不处理请求和响应
const { getDB, saveDatabase } = require('./connection');
const { nextIdInShop, requireShopId } = require('./utils');

const CategoryDB = {
  // ==================== 查：分类扁平列表 ====================
  // 排序规则统一为 sort_order 升序，相同排序值再按 id 升序，保证顺序稳定
  getAll: (shopId) => {
    requireShopId(shopId);
    const db = getDB();
    // product_count 的实时子查询也要带 shop_id，否则会把别家沙箱的商品算进本店分类
    const result = db.exec('SELECT id, name, parent_id, sort_order, status, recommend, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND shop_id = c.shop_id) as product_count FROM categories c WHERE c.shop_id = ? ORDER BY sort_order ASC, id ASC', [shopId]);
    if (!result[0]) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  },

  // ==================== 查：根据 id 查单个分类 ====================
  findById: (id, shopId) => {
    if (id === undefined || id === null) return null;
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT id, name, parent_id, sort_order, status, recommend, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND shop_id = c.shop_id) as product_count FROM categories c WHERE c.id = ? AND c.shop_id = ?');
    stmt.bind([id, shopId]);
    if (!stmt.step()) { stmt.free(); return null; }
    const columns = stmt.getColumnNames();
    const row = stmt.get();
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    stmt.free();
    return obj;
  },

  // 校验父分类是否合法：不能选自己，也不能把分类挂到自己的后代下面形成循环
  _wouldCreateCycle: (targetId, newParent, shopId) => {
    if (newParent === null || newParent === undefined) return false;
    if (Number(newParent) === Number(targetId)) return true;
    let cursor = newParent;
    const seen = new Set();
    while (cursor !== null && cursor !== undefined) {
      if (Number(cursor) === Number(targetId)) return true;
      if (seen.has(cursor)) return true;
      seen.add(cursor);
      const parent = CategoryDB.findById(cursor, shopId);
      if (!parent) break;
      cursor = parent.parent_id;
    }
    return false;
  },

  // 查某个分类下的同级分类（一级分类的 parentId 为 null），只取 id 和排序值
  _getSiblings: (parentId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const sql = parentId === null
      ? 'SELECT id, sort_order FROM categories WHERE parent_id IS NULL AND shop_id = ? ORDER BY sort_order ASC, id ASC'
      : 'SELECT id, sort_order FROM categories WHERE parent_id = ? AND shop_id = ? ORDER BY sort_order ASC, id ASC';
    const stmt = db.prepare(sql);
    if (parentId === null) stmt.bind([shopId]);
    else stmt.bind([parentId, shopId]);
    const siblings = [];
    while (stmt.step()) siblings.push(stmt.getAsObject());
    stmt.free();
    return siblings;
  },

  // 查同级分类里最大的排序值再加 1，让新分类排到同级末尾
  _getNextSortOrder: (parentId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const sql = parentId === null
      ? 'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM categories WHERE parent_id IS NULL AND shop_id = ?'
      : 'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM categories WHERE parent_id = ? AND shop_id = ?';
    const stmt = db.prepare(sql);
    if (parentId === null) stmt.bind([shopId]);
    else stmt.bind([parentId, shopId]);
    const sortOrder = stmt.step() ? stmt.getAsObject().next_sort_order : 1;
    stmt.free();
    return sortOrder;
  },

  // ==================== 增：新增分类 ====================
  // sort_order 由服务端计算，前端不需要传
  create: (data, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const { name, status = 1, recommend = 0 } = data;
    const parentId = data.parent_id ?? null;
    if (CategoryDB._wouldCreateCycle(null, parentId, shopId)) {
      throw new Error('parent_id 不合法：不能引用自身或造成循环');
    }
    const id = nextIdInShop('categories', shopId);
    const sortOrder = CategoryDB._getNextSortOrder(parentId, shopId);
    db.run('INSERT INTO categories (id, shop_id, name, parent_id, sort_order, status, recommend) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, shopId, name, parentId, sortOrder, status, recommend]);
    saveDatabase();
    return CategoryDB.findById(id, shopId);
  },

  // ==================== 改：同级内上移 / 下移一位 ====================
  // 返回 moved（成功）、not_found（分类不存在）、boundary（已在同级首尾）三种结果
  move: (id, direction, shopId) => {
    requireShopId(shopId);
    const existing = CategoryDB.findById(id, shopId);
    if (!existing) return { status: 'not_found' };

    // 按分类真实的 parent_id 取同级列表，天然限制了一级只和一级、二级只和同父的二级互换
    const siblings = CategoryDB._getSiblings(existing.parent_id, shopId);
    const currentIndex = siblings.findIndex(category => Number(category.id) === Number(id));
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    // 目标位置越界说明已经在首项或末项，直接返回边界状态
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= siblings.length) {
      return { status: 'boundary' };
    }

    // 先备份原排序值，文件保存失败时用来还原
    const originalSortOrders = siblings.map(category => ({
      id: category.id,
      sort_order: category.sort_order,
    }));
    // 交换目标项和相邻项的位置
    [siblings[currentIndex], siblings[targetIndex]] = [siblings[targetIndex], siblings[currentIndex]];
    const db = getDB();
    let transactionOpen = false;
    try {
      // 整个同级一起重新编号为 1、2、3……，顺便修掉历史重复或跳号的排序值
      db.run('BEGIN TRANSACTION');
      transactionOpen = true;
      siblings.forEach((category, index) => {
        db.run('UPDATE categories SET sort_order = ? WHERE id = ? AND shop_id = ?', [index + 1, category.id, shopId]);
      });
      db.run('COMMIT');
      transactionOpen = false;
      try {
        saveDatabase();
      } catch (err) {
        // 文件保存失败时恢复内存中的原顺序，避免接口失败后仍展示新顺序
        db.run('BEGIN TRANSACTION');
        transactionOpen = true;
        originalSortOrders.forEach(category => {
          db.run('UPDATE categories SET sort_order = ? WHERE id = ? AND shop_id = ?', [category.sort_order, category.id, shopId]);
        });
        db.run('COMMIT');
        transactionOpen = false;
        throw err;
      }
      return { status: 'moved' };
    } catch (err) {
      // 事务还没提交就出错，回滚保证库内顺序不变
      if (transactionOpen) db.run('ROLLBACK');
      throw err;
    }
  },

  // ==================== 改：更新分类 ====================
  // 只更新实际传进来的字段
  update: (id, data, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const existing = CategoryDB.findById(id, shopId);
    if (!existing) return null;
    if (data.parent_id !== undefined && CategoryDB._wouldCreateCycle(id, data.parent_id, shopId)) {
      throw new Error('parent_id 不合法：不能引用自身或造成循环');
    }
    const fields = [];
    const values = [];
    // sort_order 不在可更新字段里：前端不再传，排序只由 move 调整
    for (const key of ['name', 'parent_id', 'status', 'recommend']) {
      if (data[key] !== undefined) {
        fields.push(key + ' = ?');
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return existing;
    values.push(id);
    values.push(shopId);
    db.run(`UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`, values);
    saveDatabase();
    return CategoryDB.findById(id, shopId);
  },

  // ==================== 删：删除分类 ====================
  delete: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const existing = CategoryDB.findById(id, shopId);
    if (!existing) return false;
    db.run('DELETE FROM categories WHERE id = ? AND shop_id = ?', [id, shopId]);
    saveDatabase();
    return true;
  }
};

module.exports = { CategoryDB };
