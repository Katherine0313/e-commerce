// ==================== 数据库连接（单例） ====================
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');

let db = null;
let SQL = null;

/** 打开已有数据库文件（不再建表、不再导入种子数据） */
async function ensureDB() {
  if (db) return db;
  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
  return db;
}

/** 获取当前数据库实例 */
function getDB() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 ensureDB()');
  }
  return db;
}

/** 保存数据库到文件（原地写入，不替换文件，让 Navicat 等外部工具刷新即可看到最新数据） */
function saveDatabase() {
  const d = getDB();
  const data = d.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  d.run('PRAGMA foreign_keys = ON');
}

module.exports = { ensureDB, getDB, saveDatabase, dbPath };
