// ==================== 标签 CRUD ====================
const { getDB, saveDatabase } = require('./connection');
const { getNow, nextIdInShop, formatDates, requireShopId } = require('./utils');

// 重新统计每个标签关联的商品数（基于 products.tag_id），只处理传入的店铺
function refreshProductCounts(shopId) {
  requireShopId(shopId);
  const db = getDB();
  // 内层统计带 shop_id，否则会把别的沙箱的商品算进本店标签的计数
  db.run(`UPDATE tags SET product_count = (SELECT COUNT(*) FROM products WHERE products.tag_id = tags.id AND products.shop_id = tags.shop_id) WHERE tags.shop_id = ?`, [shopId]);
}

const TagDB = {
  getAll: (filters = {}, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    // shop_id 是本店铺的硬性过滤条件，作为第一个占位符，params 里也必须排第一
    let sql = `SELECT id, name, IFNULL(code, '') as code, type, color, sort_order, status, product_count, created_at, created_by, updated_by FROM tags WHERE shop_id = ?`;
    const params = [shopId];

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const data = [];
    while (stmt.step()) data.push(formatDates(stmt.getAsObject()));
    stmt.free();
    return data;
  },

  findById: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare(`SELECT id, name, IFNULL(code, '') as code, type, color, sort_order, status, product_count, created_at, created_by, updated_by FROM tags WHERE id = ? AND shop_id = ?`);
    stmt.bind([id, shopId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return formatDates(row);
    }
    stmt.free();
    return null;
  },

  findByCode: (code, shopId) => {
    if (!code) return null;
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM tags WHERE code = ? AND shop_id = ?');
    stmt.bind([code, shopId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return formatDates(row);
    }
    stmt.free();
    return null;
  },

  create: (data, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const id = nextIdInShop('tags', shopId);
    const now = getNow();
    try {
      const stmt = db.prepare(`INSERT INTO tags (id, shop_id, name, code, type, color, sort_order, status, created_at, created_by, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      stmt.run([
        id, shopId, data.name, data.code || null, data.type || 'custom',
        data.color || '#1890ff',
        data.sort_order || 0, data.status !== undefined ? data.status : 1,
        now, data.created_by || null, now, data.created_by || null
      ]);
      stmt.free();
    } catch (e) {
      if (e && typeof e.message === 'string' && e.message.includes('UNIQUE constraint failed')) {
        const err = new Error('标签编码已存在');
        err.code = 'TAG_CODE_DUPLICATE';
        err.status = 409;
        throw err;
      }
      throw e;
    }

    saveDatabase();
    return TagDB.findById(id, shopId);
  },

  update: (id, data, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const existing = TagDB.findById(id, shopId);
    if (!existing) return null;

    const now = getNow();
    try {
      db.run(`UPDATE tags SET name = ?, code = ?, type = ?, color = ?, sort_order = ?, status = ?, product_count = ?, updated_at = ?, updated_by = ? WHERE id = ? AND shop_id = ?`, [
        data.name !== undefined ? data.name : existing.name,
        data.code !== undefined ? data.code : existing.code,
        data.type !== undefined ? data.type : existing.type,
        data.color !== undefined ? data.color : existing.color,
        data.sort_order !== undefined ? data.sort_order : existing.sort_order,
        data.status !== undefined ? data.status : existing.status,
        data.product_count !== undefined ? data.product_count : existing.product_count,
        now,
        data.updated_by !== undefined ? data.updated_by : existing.updated_by,
        id, shopId
      ]);
    } catch (e) {
      if (e && typeof e.message === 'string' && e.message.includes('UNIQUE constraint failed')) {
        const err = new Error('标签编码已存在');
        err.code = 'TAG_CODE_DUPLICATE';
        err.status = 409;
        throw err;
      }
      throw e;
    }

    saveDatabase();
    return TagDB.findById(id, shopId);
  },

  delete: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const existing = TagDB.findById(id, shopId);
    if (!existing) return false;

    // products.tag_id 外键为 ON DELETE SET NULL，删除标签后商品会自动解绑
    db.run('DELETE FROM tags WHERE id = ? AND shop_id = ?', [id, shopId]);
    saveDatabase();
    return true;
  },

  getProductTags: (productId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare(`SELECT tags.*
      FROM products, tags
      WHERE products.tag_id = tags.id AND products.id = ? AND products.shop_id = ? AND tags.shop_id = ?`);
    stmt.bind([productId, shopId, shopId]);
    const data = [];
    while (stmt.step()) data.push(formatDates(stmt.getAsObject()));
    stmt.free();
    return data;
  },

  getTagProducts: (tagId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare(`SELECT products.* FROM products WHERE products.tag_id = ? AND products.shop_id = ? ORDER BY products.id ASC`);
    stmt.bind([tagId, shopId]);
    const data = [];
    while (stmt.step()) data.push(formatDates(stmt.getAsObject()));
    stmt.free();
    return data;
  },

  bindProductTags: (productId, tagIds, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    // 一个商品最多一个标签：取第一个，空数组则解绑
    const tagId = tagIds.length ? tagIds[0] : null;
    db.run(`UPDATE products SET tag_id = ?, updated_at = ? WHERE id = ? AND shop_id = ?`, [tagId, getNow(), productId, shopId]);
    refreshProductCounts(shopId);
    saveDatabase();
    return true;
  },

  unbindProductTag: (productId, tagId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    db.run(`UPDATE products SET tag_id = NULL, updated_at = ? WHERE id = ? AND tag_id = ? AND shop_id = ?`, [getNow(), productId, tagId, shopId]);
    refreshProductCounts(shopId);
    saveDatabase();
    return true;
  },

  unbindTagProducts: (tagId, productIds, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const now = getNow();
    let affected = 0;
    const stmt = db.prepare(`UPDATE products SET tag_id = NULL, updated_at = ? WHERE id = ? AND tag_id = ? AND shop_id = ?`);
    for (const pid of productIds) {
      stmt.run([now, pid, tagId, shopId]);
      affected += db.getRowsModified();
    }
    stmt.free();
    if (affected === 0) return false;

    refreshProductCounts(shopId);
    saveDatabase();
    return true;
  },

  bindProductsToTag: (tagId, productIds, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const now = getNow();
    const stmt = db.prepare(`UPDATE products SET tag_id = ?, updated_at = ? WHERE id = ? AND shop_id = ?`);
    for (const pid of productIds) {
      stmt.run([tagId, now, pid, shopId]);
    }
    stmt.free();

    refreshProductCounts(shopId);
    saveDatabase();
    return true;
  }
};

module.exports = { TagDB };
