// ==================== 收货地址 CRUD ====================
const { getDB, saveDatabase } = require('./connection');
const { getNow, nextIdInShop, formatDates, requireShopId } = require('./utils');
const { validateAddress } = require('../util/validator');

const ConsigneeAddressDB = {
  getAll: (filters = {}, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM consignee_address WHERE user_id = ? AND shop_id = ? ORDER BY is_default DESC, created_at DESC');
    stmt.bind([filters.user_id, shopId]);
    const data = [];
    while (stmt.step()) data.push(formatDates(stmt.getAsObject()));
    stmt.free();
    return data;
  },

  findById: (id, userId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM consignee_address WHERE id = ? AND user_id = ? AND shop_id = ?');
    stmt.bind([id, userId, shopId]);
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
    validateAddress(data);

    const now = getNow();
    const isDefault = data.is_default ? 1 : 0;
    const id = nextIdInShop('consignee_address', shopId);
    const userId = data.user_id;

    if (isDefault) {
      db.run('UPDATE consignee_address SET is_default = 0 WHERE user_id = ? AND shop_id = ?', [userId, shopId]);
    }

    db.run(`INSERT INTO consignee_address (id, shop_id, user_id, consignee, phone, region, detail_address, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id, shopId, userId,
      data.consignee || '', data.phone || '', data.region || '', data.detail_address || '',
      isDefault, now
    ]);

    saveDatabase();
    return ConsigneeAddressDB.findById(id, userId, shopId);
  },

  update: (id, data, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const userId = data.user_id;
    const existing = ConsigneeAddressDB.findById(id, userId, shopId);
    if (!existing) return null;

    validateAddress(data, true);

    const now = getNow();
    const isDefault = data.is_default !== undefined ? (data.is_default ? 1 : 0) : existing.is_default;

    if (isDefault) {
      db.run('UPDATE consignee_address SET is_default = 0 WHERE user_id = ? AND id != ? AND shop_id = ?', [userId, id, shopId]);
    }

    db.run(`UPDATE consignee_address SET consignee = ?, phone = ?, region = ?, detail_address = ?, is_default = ?, updated_at = ? WHERE id = ? AND user_id = ? AND shop_id = ?`, [
      data.consignee !== undefined ? data.consignee : existing.consignee,
      data.phone !== undefined ? data.phone : existing.phone,
      data.region !== undefined ? data.region : existing.region,
      data.detail_address !== undefined ? data.detail_address : existing.detail_address,
      isDefault, now, id, userId, shopId
    ]);

    saveDatabase();
    return ConsigneeAddressDB.findById(id, userId, shopId);
  },

  delete: (id, userId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM consignee_address WHERE user_id = ? AND shop_id = ?');
    countStmt.bind([userId, shopId]);
    const beforeCount = countStmt.step() ? countStmt.getAsObject().count : 0;
    countStmt.free();

    db.run('DELETE FROM consignee_address WHERE id = ? AND user_id = ? AND shop_id = ?', [id, userId, shopId]);

    const afterStmt = db.prepare('SELECT COUNT(*) as count FROM consignee_address WHERE user_id = ? AND shop_id = ?');
    afterStmt.bind([userId, shopId]);
    const afterCount = afterStmt.step() ? afterStmt.getAsObject().count : 0;
    afterStmt.free();

    if (beforeCount > afterCount) {
      saveDatabase();
      return true;
    }
    return false;
  },

  syncFromOrder: (userId, consignee, phone, region, detailAddress, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare(
      'SELECT id FROM consignee_address WHERE user_id = ? AND consignee = ? AND phone = ? AND region = ? AND detail_address = ? AND shop_id = ?'
    );
    stmt.bind([userId, consignee || '', phone || '', region || '', detailAddress || '', shopId]);
    if (stmt.step()) {
      stmt.free();
      return;
    }
    stmt.free();

    const now = getNow();
    const id = nextIdInShop('consignee_address', shopId);
    db.run(`INSERT INTO consignee_address (id, shop_id, user_id, consignee, phone, region, detail_address, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`, [id, shopId, userId, consignee || '', phone || '', region || '', detailAddress || '', now]);

    saveDatabase();
  }
};

module.exports = { ConsigneeAddressDB };
