// ==================== 数据库模块（向后兼容转发） ====================
// 实际逻辑已拆分至:
//   connection.js   — 数据库连接单例
//   tables.js       — 建表 SQL
//   seed.js         — 种子数据
//   productDB.js    — 商品 CRUD
//   orderDB.js      — 订单 CRUD
//   tagDB.js        — 标签 CRUD
//   categoryDB.js   — 分类 CRUD
//   addressDB.js    — 收货地址 CRUD
//   userDB.js       — 用户 CRUD
//   stockDB.js      — 库存预警 CRUD
//   businessOnsaleDB.js — 促销活动 CRUD
//   index.js        — startup() + 统一导出

const {
  ProductDB,
  TagDB,
  CategoryDB,
  ConsigneeAddressDB,
  OrderDB,
  UserDB,
  CartDB,
  AfterSalesDB,
  StockDB,
  BusinessOnsaleDB,
  UploadDB,
  startup,
  saveDatabase,
} = require('./index');

module.exports = {
  ProductDB,
  TagDB,
  CategoryDB,
  ConsigneeAddressDB,
  OrderDB,
  UserDB,
  CartDB,
  AfterSalesDB,
  StockDB,
  BusinessOnsaleDB,
  UploadDB,
  startup,
  saveDatabase,
};
