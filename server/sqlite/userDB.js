// ==================== 用户 CRUD ====================
const { getDB, saveDatabase } = require('./connection');
const { nextIdInShop, requireShopId } = require('./utils');
const { TEMPLATE_SHOP_ID } = require('./shopTables');

const UserDB = {
  findByUsername: (username) => {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([username]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  findById: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ? AND shop_id = ?');
    stmt.bind([id, shopId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  validateCredentials: (username, password) => {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');
    stmt.bind([username, password]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  // 注册接口目前无前端页面，新用户统一落进模板店（保持注册接口原有行为，本次不改动）
  create: (userData) => {
    const db = getDB();
    const id = nextIdInShop('users', TEMPLATE_SHOP_ID);
    db.run(`INSERT INTO users (id, username, password, phone, name, birthday, role, shop_id) VALUES (?, ?, ?, ?, ?, ?, 'user', ?)`, [
      id,
      userData.username,
      userData.password,
      userData.phone || '',
      userData.name || '',
      userData.birthday || '',
      TEMPLATE_SHOP_ID
    ]);

    saveDatabase();

    return {
      id,
      username: userData.username,
      phone: userData.phone,
      role: 'user'
    };
  }
};

module.exports = { UserDB };
