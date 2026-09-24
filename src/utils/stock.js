/**
 * 库存预警的前端口径，工作台和库存列表两处共用，避免同一套判定写三遍跑偏。
 * 注意：stock 表里虽然有个 stock_status 列，但后端从不写它（30 行全是 NULL），
 * 所以状态只能拿 products.stock 与上下限实时算，取值对齐后端 constants/dict.js 的 STOCK_STATUS。
 */

/** 预警是否开启：sql.js 里布尔字段可能是 1/0/true/false，商品没配预警时 LEFT JOIN 出来是 null */
export const isAlertOn = (v) => v === 1 || v === true;

/**
 * 库存状态三档：low / high / normal。
 * 没开预警、或上下限没配齐时返回 ''（算不出来），调用处自行决定怎么展示。
 */
export const stockStatusOf = (r) => {
  if (!isAlertOn(r?.alert_enabled)) return '';
  if (r.min_stock == null || r.max_stock == null) return '';
  const stock = Number(r.stock);
  if (stock < Number(r.min_stock)) return 'low';
  if (stock > Number(r.max_stock)) return 'high';
  return 'normal';
};
