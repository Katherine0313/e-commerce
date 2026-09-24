/**
 * 订单状态 — key 常量 + 流转规则
 */
const ORDER_STATUS = Object.freeze({
  PENDING_PAY: 'pending_pay',
  PENDING_CONFIRM: 'pending_confirm',
  PENDING_SHIP: 'pending_ship',
  SHIPPED: 'shipped',
  FINISHED: 'finished',
  CANCEL: 'cancel',
});

// 待付款订单超时自动关闭时长（秒）：下单后 30 分钟内未支付即取消并释放库存
const PENDING_PAY_TIMEOUT_SECONDS = 1800;

const ORDER_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING_PAY]: [ORDER_STATUS.PENDING_CONFIRM, ORDER_STATUS.CANCEL],
  [ORDER_STATUS.PENDING_CONFIRM]: [ORDER_STATUS.PENDING_SHIP, ORDER_STATUS.CANCEL],
  [ORDER_STATUS.PENDING_SHIP]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCEL],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.FINISHED],
  [ORDER_STATUS.FINISHED]: [],
  [ORDER_STATUS.CANCEL]: [],
});

function validateTransition(from, to) {
  const allowed = ORDER_TRANSITIONS[from];
  if (!allowed) return { valid: false, message: `未知的当前状态: ${from}` };
  if (!allowed.includes(to)) {
    const { ORDER_STATUS_MAP } = require('./dict');
    return { valid: false, message: `不允许从「${ORDER_STATUS_MAP[from] || from}」变更为「${ORDER_STATUS_MAP[to] || to}」` };
  }
  return { valid: true };
}

module.exports = { ORDER_STATUS, ORDER_TRANSITIONS, validateTransition, PENDING_PAY_TIMEOUT_SECONDS };
