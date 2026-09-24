// ==================== 购物车 CRUD ====================
const { getDB, saveDatabase } = require('./connection');
const { getNow, nextIdInShop, requireShopId } = require('./utils');

const CartDB = {
  // 查：某个用户的购物车（含快照字段）
  getAll: (userId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM cart WHERE user_id = ? AND shop_id = ? ORDER BY created_at DESC, id DESC');
    stmt.bind([userId, shopId]);
    const data = [];
    while (stmt.step()) data.push(stmt.getAsObject());
    stmt.free();
    return data;
  },

  // 查：某用户购物车里某个商品的行（不存在返回 null）
  _find: (userId, productId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM cart WHERE user_id = ? AND product_id = ? AND shop_id = ?');
    stmt.bind([userId, productId, shopId]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  },

  /**
   * 加购：已存在的商品累加数量，不存在的追加新行（写入快照字段）
   * @param {number} userId
   * @param {number} productId
   * @param {Object} data - { name, image, price, description, insurance_detail, insurance_fee }
   * @param {number} quantity
   * @param {number} shopId
   * @returns {Array} 该用户最新购物车列表
   */
  addItem: (userId, productId, data, quantity, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const now = getNow();
    const existing = CartDB._find(userId, productId, shopId);
    const insuranceDetail = Array.isArray(data.insurance_detail) ? JSON.stringify(data.insurance_detail) : '[]';
    const insuranceFee = Number(data.insurance_fee) || 0;

    if (existing) {
      db.run(`UPDATE cart SET quantity = ?, name = ?, image = ?, price = ?, description = ?, insurance_detail = ?, insurance_fee = ?, updated_at = ?
        WHERE id = ? AND shop_id = ?`,
        [existing.quantity + quantity, data.name || '', data.image || '', data.price || 0, data.description || '', insuranceDetail, insuranceFee, now, existing.id, shopId]);
    } else {
      const id = nextIdInShop('cart', shopId);
      db.run(`INSERT INTO cart (id, shop_id, user_id, product_id, name, image, price, description, quantity, insurance_detail, insurance_fee, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, shopId, userId, productId, data.name || '', data.image || '', data.price || 0, data.description || '', quantity, insuranceDetail, insuranceFee, now]);
    }

    saveDatabase();
    return CartDB.getAll(userId, shopId);
  },

  /**
   * 更新数量（最小为 1）
   * @returns {Array|null} 最新购物车列表；商品不在购物车返回 null
   */
  updateQuantity: (userId, productId, quantity, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const existing = CartDB._find(userId, productId, shopId);
    if (!existing) return null;

    db.run('UPDATE cart SET quantity = ?, updated_at = ? WHERE id = ? AND shop_id = ?',
      [Math.max(1, quantity), getNow(), existing.id, shopId]);

    saveDatabase();
    return CartDB.getAll(userId, shopId);
  },

  // 移除某个商品
  removeItem: (userId, productId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    db.run('DELETE FROM cart WHERE user_id = ? AND product_id = ? AND shop_id = ?', [userId, productId, shopId]);
    saveDatabase();
    return CartDB.getAll(userId, shopId);
  },

  // 批量移除（productIds 数组）
  removeItems: (userId, productIds, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    for (const pid of productIds) {
      db.run('DELETE FROM cart WHERE user_id = ? AND product_id = ? AND shop_id = ?', [userId, pid, shopId]);
    }
    saveDatabase();
    return CartDB.getAll(userId, shopId);
  },

  // 清空购物车
  clear: (userId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    db.run('DELETE FROM cart WHERE user_id = ? AND shop_id = ?', [userId, shopId]);
    saveDatabase();
    return [];
  }
};

module.exports = { CartDB };
