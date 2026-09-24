// ==================== 上传文件归属 CRUD ====================
// uploads 表只做一件事：记录「哪个店铺上传过哪个物理文件」，
// 沙箱过期回收时据此删磁盘文件（shopDB.deleteUploadedFiles）
const { getDB, saveDatabase } = require('./connection');
const { getNow, nextIdInShop, requireShopId } = require('./utils');

const UploadDB = {
  /**
   * 记录一个已经落盘的上传文件
   * @param {number} shopId - 店铺隔离键（来自 req.shopId）
   * @param {string} filePath - 形如 /image/upload/xxx.png 的 URL 路径
   */
  create: (shopId, filePath) => {
    requireShopId(shopId);
    const db = getDB();
    const id = nextIdInShop('uploads', shopId);
    db.run('INSERT INTO uploads (id, shop_id, path, created_at) VALUES (?, ?, ?, ?)', [id, shopId, filePath, getNow()]);
    saveDatabase();
  },
};

module.exports = { UploadDB };
