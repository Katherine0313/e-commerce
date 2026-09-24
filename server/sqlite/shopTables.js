// ==================== 店铺数据的单一事实来源 ====================
// 「哪些表属于一个店铺、每张表的 id 列和外键列是什么」只在这里定义一次。
// 克隆沙箱（shopDB.cloneTemplate）、回收沙箱（shopDB.purgeShop）、
// 迁移加列（migrations/2026_09_15_add_shop_id.js）三处全部读这一份清单。
//
// ⚠️ 以后新增业务表时，必须把这张表登记到 SHOP_TABLES 里，否则：
//    1) 新沙箱不会克隆这张表的数据（页面空白）
//    2) 过期沙箱的数据永远不会被清理（永久残留在库里）
//
// 字段说明：
//   table  —— 表名
//   id     —— 主键列名，克隆时「整体加偏移量」
//   fks    —— 直接指向店铺内其它表的外键列，克隆时同样加偏移量
//             （SQLite 里 NULL + n = NULL，所以可空外键不会被污染成有效值）
//   clone  —— 是否参与克隆，默认 true。uploads 记录的是本店上传过的物理文件，
//             只用于回收时删文件，没有跨表引用，不需要克隆
//
// 数组顺序即克隆顺序：被依赖的表排在前面（categories 自引用、products 依赖
// categories/tags、order_items 依赖 orders 和 products，依此类推）
const SHOP_TABLES = [
  { table: 'categories', id: 'id', fks: ['parent_id'] },
  { table: 'tags', id: 'id', fks: [] },
  { table: 'products', id: 'id', fks: ['category_id', 'tag_id'] },
  { table: 'stock', id: 'id', fks: ['product_id'] },
  { table: 'business_onsale', id: 'id', fks: [] },
  { table: 'users', id: 'id', fks: [] },
  { table: 'consignee_address', id: 'id', fks: ['user_id'] },
  { table: 'orders', id: 'id', fks: ['user_id'] },
  { table: 'order_items', id: 'id', fks: ['order_id', 'product_id'] },
  { table: 'after_sales', id: 'id', fks: ['order_id'] },
  { table: 'after_sale_items', id: 'id', fks: ['after_sale_id', 'order_item_id', 'product_id'] },
  { table: 'after_sale_returns', id: 'id', fks: ['after_sale_id'] },
  { table: 'after_sale_exchange_returns', id: 'id', fks: ['after_sale_id'] },
  { table: 'after_sale_only_refunds', id: 'id', fks: ['after_sale_id'] },
  { table: 'cart', id: 'id', fks: ['user_id', 'product_id'] },
  { table: 'uploads', id: 'id', fks: [], clone: false },
];

// 模板店：演示素材的维护入口，所有沙箱都从它克隆，永不过期
const TEMPLATE_SHOP_ID = 1;
const TEMPLATE_SHOP_NAME = '杰米小店';

// 每家店的 id 号段宽度（100 万）：
//   克隆沙箱时用 shopId × ID_BLOCK 作为 id 偏移量；新建数据也用「本店号段内 MAX(id)+1」。
//   模板店占 0 号段（1 ~ 999999），沙箱 shopId=N 占 N 号段（N×1000000 ~ (N+1)×1000000-1）。
//   号段互不重叠，保证模板店与沙箱、沙箱与沙箱之间的 id 永不冲突、也互不推高。
const ID_BLOCK = 1000000;

// 沙箱有效期：24 小时
// ⚠️ 单位是「秒」，与 utils.getNow() 一致。库里所有时间戳都是 Unix 秒，
//    写成毫秒会让 expires_at 变成几千年后，沙箱永远不过期
const SANDBOX_TTL = 24 * 60 * 60;

// 同一 IP 每小时最多开几个沙箱。
// 放到 200 是因为公网上一整个公司/学校/运营商 NAT 后面的访客共用一个出口 IP，
// 20 这种量级会被同网络的人互相挤占，真实访客反而被 429 挡在外面。
// 抬高这里不会增加存储压力 —— 单个沙箱净占约 56KB，成本约束在下面的总量闸门
const SANDBOX_PER_IP_LIMIT = 200;

// 全站同时存活的沙箱上限。每个沙箱要克隆一份演示数据，实测净成本约 56KB，
// 2000 个约 110MB。注意这是 sql.js —— 整库在内存里，每次写请求都要把全库
// 导出并覆盖写盘，所以这道闸门真正管的是「每次写盘的体积」，不是为了省行数。
// 再往上调之前，先按这个口径量一遍（全量导出 + 覆盖写的耗时）
const SANDBOX_ACTIVE_LIMIT = 2000;

module.exports = {
  SHOP_TABLES,
  TEMPLATE_SHOP_ID,
  TEMPLATE_SHOP_NAME,
  ID_BLOCK,
  SANDBOX_TTL,
  SANDBOX_PER_IP_LIMIT,
  SANDBOX_ACTIVE_LIMIT,
};
