// ==================== 数据库统一入口 ====================
const { ensureDB } = require('./connection');
const { ProductDB } = require('./productDB');
const { OrderDB } = require('./orderDB');
const { TagDB } = require('./tagDB');
const { CategoryDB } = require('./categoryDB');
const { ConsigneeAddressDB } = require('./addressDB');
const { UserDB } = require('./userDB');
const { CartDB } = require('./cartDB');
const { AfterSalesDB } = require('./afterSalesDB');
const { StockDB } = require('./stockDB');
const { BusinessOnsaleDB } = require('./businessOnsaleDB');
const { UploadDB } = require('./uploadDB');
const { saveDatabase } = require('./connection');

let initialized = false;

async function startup() {
  if (initialized) return { ProductDB, TagDB, ConsigneeAddressDB, OrderDB, UserDB, CartDB, AfterSalesDB, StockDB, BusinessOnsaleDB, UploadDB };

  await ensureDB(); // 仅打开已有数据库文件，不建表、不导种子

  initialized = true;
  console.log('[Database] 数据库连接就绪');
  return { ProductDB, TagDB, ConsigneeAddressDB, OrderDB, UserDB, CartDB, AfterSalesDB, StockDB, BusinessOnsaleDB, UploadDB };
}

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
