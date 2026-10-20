/**
 * 库存预警的前端口径，工作台和库存列表两处共用，避免同一套判定写三遍跑偏。
 * 注意：状态只能拿 products.stock 与上下限实时算，取值对齐后端 STOCK_STATUS。
 * 字段统一驼峰（后台 Admin 端对接契约）。
 */

/** 预警是否开启：sql.js 里布尔字段可能是 1/0/true/false，商品没配预警时 LEFT JOIN 出来是 null */
export const isAlertOn = (v) => v === 1 || v === true;

/**
 * 库存状态三档：low / high / normal。
 * 没开预警、或上下限没配齐时返回 ''（算不出来），调用处自行决定怎么展示。
 */
export const stockStatusOf = (r) => {
  if (!isAlertOn(r?.alertEnabled)) return '';
  if (r.minStock == null || r.maxStock == null) return '';
  const stock = Number(r.stock);
  if (stock < Number(r.minStock)) return 'low';
  if (stock > Number(r.maxStock)) return 'high';
  return 'normal';
};
