// ==================== 工具函数 ====================
const { getDB } = require('./connection');
const { TEMPLATE_SHOP_ID, ID_BLOCK } = require('./shopTables');

/** 所有存时间戳的字段名（读接口返回前统一格式化用） */
const TIME_FIELDS = ['created_at', 'updated_at', 'pay_at', 'confirm_at', 'ship_at', 'finish_at', 'bound_at', 'review_at', 'refund_at', 'refunded_at', 'order_created_at', 'rejected_at'];

/** 子表（三张）的额外时间戳字段（after_sale_returns / after_sale_exchange_returns / after_sale_only_refunds）*/
const RETURNS_TIME_FIELDS = ['return_at', 'exchange_at', 'exchanged_at', 'review_at', 'rejected_at', 'refund_at', 'refunded_at'];

/** 当前时间：Unix 秒 */
function getNow() {
  return Math.floor(Date.now() / 1000);
}

/** 时间戳（秒）→ 本地时间字符串：YYYY-MM-DD HH:mm:ss */
function formatTime(ts) {
  if (ts === null || ts === undefined || ts === '') return ts;
  const n = Number(ts);
  // 非数字（如旧格式的日期字符串）原样返回，作为兜底
  if (!Number.isFinite(n)) return ts;
  const d = new Date(n * 1000);
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' +
    pad(d.getMinutes()) + ':' +
    pad(d.getSeconds());
}

/** 日期字符串（YYYY-MM-DD HH:mm[:ss]，本地时区）→ Unix 秒；解析失败返回 null */
function parseTime(str) {
  if (str === null || str === undefined || str === '') return null;
  // 已是纯数字（秒）则直接返回
  if (/^\d+$/.test(String(str).trim())) {
    const n = Number(str);
    return Number.isFinite(n) ? n : null;
  }
  const d = new Date(String(str).trim().replace(' ', 'T'));
  return Number.isFinite(d.getTime()) ? Math.floor(d.getTime() / 1000) : null;
}

/** 把对象中所有时间字段格式化为字符串（返回新对象） */
function formatDates(row, extraFields = []) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  const fields = extraFields.length ? [...TIME_FIELDS, ...extraFields] : TIME_FIELDS;
  for (const f of fields) {
    if (f in out) out[f] = formatTime(out[f]);
  }
  return out;
}

/**
 * 通用：生成某张表在指定店铺内的下一个自增 id（号段内 MAX(id)+1）
 *
 * 隔离除了 shop_id 列，还有「id 号段」这一层：每家店的数据 id 只在自己的号段内自增，
 * 模板店用 0 号段（历史数据 id 本来就落在 1~9107），沙箱 shopId=N 用 N 号段
 * （克隆时 id 已整体偏移 N×ID_BLOCK）。号段互不重叠，所以各店 id 永不冲突、也互不推高。
 *
 * 为什么必须是「号段内 MAX」而不是「全局 MAX」：
 * 全局 MAX(id)+1 会让某店新建数据的 id 跳到「号段最大的那个店」之后 —— 比如开过沙箱后，
 * 库里最大 id 来自沙箱的 1700xxxx，这时在模板店新增商品，id 会跟着跳到 1700xxxx，
 * 而不是接在模板店已有的 9107 后面，模板店数据 id 就断号、难管理了。
 * 号段内 MAX 则让每家店各自在自己的号段里连续增长。
 *
 * @param {string} tableName - 表名（内部常量传入，不来自用户输入）
 * @param {number} shopId    - 店铺隔离键
 */
function nextIdInShop(tableName, shopId) {
  requireShopId(shopId);
  const db = getDB();
  // 号段下界：模板店=0，沙箱 shopId=N 则 N×ID_BLOCK
  const lo = (shopId === TEMPLATE_SHOP_ID ? 0 : shopId) * ID_BLOCK;
  const hi = lo + ID_BLOCK - 1;
  // lo/hi 是服务端算出的整数，直接拼进 SQL 安全（不是用户输入）
  const stmt = db.prepare(
    `SELECT COALESCE(MAX(id), ${lo}) + 1 AS n FROM ${tableName} WHERE id >= ${lo} AND id <= ${hi}`
  );
  const next = stmt.step() ? stmt.getAsObject().n : lo + 1;
  stmt.free();
  // 号段耗尽保护：正常业务不可能在一家店一张表里塞满 100 万行，真到了说明有 bug
  if (next > hi) {
    const err = new Error(`${tableName} 在店铺 ${shopId} 的 id 号段已耗尽`);
    err.status = 500;
    throw err;
  }
  return next;
}

/**
 * 店铺 id 守卫：所有带 shop_id 过滤的 DB 函数第一行调用
 *
 * 为什么宁可变 500 也不放过：shopId 为 undefined 时，如果直接绑进 SQL，
 * sql.js 会抛「tried to bind a value of an unknown type (undefined)」；
 * 但如果某个查询恰好没绑参数，就可能退化成不带店铺条件的全表查询 ——
 * 那就成了静默跨店铺串数据。所以这里主动抛错，响亮失败。
 */
function requireShopId(shopId) {
  if (!Number.isSafeInteger(shopId) || shopId <= 0) {
    const err = new Error('缺少有效的 shopId（内部错误，请检查调用方是否透传）');
    err.status = 500;
    throw err;
  }
  return shopId;
}

module.exports = { getNow, formatTime, parseTime, formatDates, nextIdInShop, requireShopId, RETURNS_TIME_FIELDS };