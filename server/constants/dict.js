/**
 * 数据字典 — 所有 key → 中文 label 的映射，统一管理
 */
const DICT = Object.freeze({
  // 支付方式
  PAY_TYPE: {
    MAP: Object.freeze({
      WeChat: '微信',
      Alipay: '支付宝',
      BankCard: '银行卡',
    }),
  },
// 订单状态
  ORDER_STATUS: {
    MAP: Object.freeze({
      pending_pay: '待付款',
      pending_confirm: '待确认',
      pending_ship: '待发货',
      shipped: '已发货',
      finished: '已完成',
      cancel: '已取消',
    }),
    COLOR: Object.freeze({
      pending_pay: 'gold',
      pending_confirm: 'blue',
      pending_ship: 'cyan',
      shipped: 'purple',
      finished: 'success',
      cancel: 'default',
    }),
  },
  // 售后状态
  AFTER_SALE_STATUS: {
    MAP: Object.freeze({
      // 售后审核
      reviewing: '商家审核中',
      // 售后进行中
      refunding: '退款中',
      refund_confirming: '确认退款中',
      exchanging: '换货中',
      returning: '退货中',
      // 售后成功
      refunded: '已退款',
      exchanged: '已换货',
      returned: '已退货',
      // 售后关闭
      rejected: '售后拒绝',
    }),
    COLOR: Object.freeze({
      reviewing: 'processing',
      refunding: 'processing',
      refund_confirming: 'processing',
      exchanging: 'processing',
      returning: 'processing',
      refunded: 'success',
      exchanged: 'success',
      returned: 'success',
      rejected: 'error',
    }),
  },
  // 售后原因
  AFTER_SALE_REASON: {
    MAP: Object.freeze({
      quality: '质量问题',
      seven_days: '七天无理由',
      wrong_goods: '发错货',
      rejected: '用户拒收',
      other: '其他',
      cancel: '用户取消订单',
    }),
  },
  // 售后类型
  AFTER_SALE_TYPE: {
    MAP: Object.freeze({
      only_refund: '仅退款',
      return_refund: '退货退款',
      exchange: '换货',
    }),
  },
  // 库存状态（基于 current_stock 与 min_stock/max_stock 实时计算）
  STOCK_STATUS: {
    MAP: Object.freeze({
      high: '高库存',
      normal: '正常',
      low: '低库存',
    }),
    COLOR: Object.freeze({
      high: 'blue',
      normal: 'green',
      low: 'red',
    }),
  },
  COURIER: {
    OPTIONS: [
      { value: 'shunfeng', label: '顺丰速运' },
      { value: 'yuantong', label: '圆通速递' },
      { value: 'zhongtong', label: '中通快递' },
      { value: 'yunda', label: '韵达快递' },
      { value: 'shentong', label: '申通快递' },
      { value: 'jitu', label: '极兔速递' },
      { value: 'debang', label: '德邦快递' },
      { value: 'youzhengguonei', label: '邮政国内' },
    ],
    get MAP() {
      return Object.freeze(this.OPTIONS.reduce((m, i) => { m[i.value] = i.label; return m; }, {}));
    },
  },

});

const COURIER_LIST = DICT.COURIER.OPTIONS;
const COURIER_MAP = DICT.COURIER.MAP;
const PAY_TYPE_MAP = DICT.PAY_TYPE.MAP;
const ORDER_STATUS_MAP = DICT.ORDER_STATUS.MAP;
const ORDER_STATUS_COLOR = DICT.ORDER_STATUS.COLOR;
const AFTER_SALE_STATUS_MAP = DICT.AFTER_SALE_STATUS.MAP;
const AFTER_SALE_STATUS_COLOR = DICT.AFTER_SALE_STATUS.COLOR;
const AFTER_SALE_REASON_MAP = DICT.AFTER_SALE_REASON.MAP;
const AFTER_SALE_TYPE_MAP = DICT.AFTER_SALE_TYPE.MAP;
const STOCK_STATUS_MAP = DICT.STOCK_STATUS.MAP;
const STOCK_STATUS_COLOR = DICT.STOCK_STATUS.COLOR;

module.exports = { DICT, COURIER_LIST, COURIER_MAP, PAY_TYPE_MAP, ORDER_STATUS_MAP, ORDER_STATUS_COLOR,
  AFTER_SALE_STATUS_MAP, AFTER_SALE_STATUS_COLOR, AFTER_SALE_REASON_MAP, AFTER_SALE_TYPE_MAP,
  STOCK_STATUS_MAP, STOCK_STATUS_COLOR};
