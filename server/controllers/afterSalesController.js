// ==================== 售后控制器 ====================
const { AfterSalesDB, OrderDB } = require('../sqlite/database');
const { ORDER_STATUS } = require('../constants/orderStatus');
const { AFTER_SALE_STATUS_MAP, AFTER_SALE_STATUS_COLOR, AFTER_SALE_REASON_MAP, AFTER_SALE_TYPE_MAP, PAY_TYPE_MAP } = require('../constants/dict');
const { getDB } = require('../sqlite/connection');

// 售后状态合法取值
const AFTER_SALE_STATUS = ['reviewing', 'refunding', 'refund_confirming', 'exchanging', 'returning', 'refunded', 'exchanged', 'returned', 'rejected'];

/**
 * 把主表记录 + 子表时间戳/退货信息 + 商品明细（含库存）合并成前端用的完整 DTO
 * 任何返回单条售后记录的接口（getById / review / submitReturn / create）都应走这个
 * @param {string} id
 * @param {number} shopId - 店铺隔离键（来自 req.shopId，绝不从请求参数取）
 * @returns {Object|null}
 */
const buildAfterSaleDetail = (id, shopId) => {
  const main = AfterSalesDB.findById(id, shopId);
  if (!main) return null;

  // 商品明细 + 当前库存（products）
  const items = AfterSalesDB.getItems(id, shopId);
  const db = getDB();
  const stockStmt = db.prepare('SELECT stock FROM products WHERE id = ? AND shop_id = ?');
  const itemsWithStock = items.map(item => {
    stockStmt.bind([item.product_id, shopId]);
    const stock = stockStmt.step() ? stockStmt.getAsObject().stock : 0;
    stockStmt.reset();
    return { ...item, stock };
  });
  stockStmt.free();

  // 子表全部字段：return_at / return_way / return_time_slot / review_at / rejected_at / refund_at / refunded_at / exchange_at / exchanged_at
  // 子表自增 id 会覆盖主表 id，必须先剥掉；after_sale_id 与主表 id 同义也剥掉避免冗余
  const subInfo = AfterSalesDB.getReturn(main.after_sale_type, id, shopId) || {};
  const { id: _subRowId, after_sale_id: _subAid, ...subClean } = subInfo;

  return {
    ...main,
    ...subClean,
    items: itemsWithStock,
  };
};

const afterSalesController = {
  // POST /api/after-sales — 申请售后（已发货/已完成订单）
  create: (req, res) => {
    const { order_id, after_sale_type, reason, remark, images } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id 不能为空' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: '售后原因不能为空' });
    }

    const order = OrderDB.findById(order_id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (![ORDER_STATUS.SHIPPED, ORDER_STATUS.FINISHED].includes(order.order_status)) {
      return res.status(400).json({ success: false, message: '只有已发货或已完成的订单才能申请售后' });
    }

    // 同一订单不允许重复申请售后
    const existing = AfterSalesDB.findByOrderId(order_id, req.shopId);
    if (existing) {
      return res.status(400).json({ success: false, message: '该订单已存在售后申请，请勿重复提交' });
    }

    // 快照订单明细到售后明细表（整单售后，退款金额默认 = 下单小计）
    const orderItems = OrderDB.getItems(order_id, req.shopId).map(item => ({
      order_item_id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      image: item.image,
      sales_price: item.sales_price,
      quantity: item.quantity,
      refund_amount: item.sub_total ?? (item.sales_price * item.quantity),
      insurance_detail: item.insurance_detail,
      insurance_fee: item.insurance_fee,
    }));
    const data = AfterSalesDB.create({
      order_id: Number(order_id),
      order_no: order.order_no,
      after_sale_type: after_sale_type || 'return_refund',
      reason,
      remark,
      images,
    }, orderItems, req.shopId);
    res.json({ success: true, data: buildAfterSaleDetail(data.id, req.shopId) });
  },

  // GET /api/after-sales — 售后列表
  getAll: (req, res) => {
    const { status, search, date_field, start_date, end_date } = req.query;
    const data = AfterSalesDB.getAll({ status, search, date_field, start_date, end_date }, req.shopId);
    res.json({ success: true, data });
  },

  // GET /api/after-sales/:id — 售后详情（主表平铺字段 + 商品明细+库存 + 退货信息）
  getById: (req, res) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, message: '售后ID不能为空' });
    }
    const data = buildAfterSaleDetail(id, req.shopId);
    if (!data) {
      return res.status(404).json({ success: false, message: '售后记录不存在' });
    }
    res.json({ success: true, data });
  },

  // GET /api/after-sales/status-constants — 前端取售后状态常量（中文、颜色）
  getStatusConstants: (req, res) => {
    res.json({
      success: true,
      data: {
        map: AFTER_SALE_STATUS_MAP,
        color: AFTER_SALE_STATUS_COLOR,
        reasonMap: AFTER_SALE_REASON_MAP,
        typeMap: AFTER_SALE_TYPE_MAP,
      }
    });
  },

  // PUT /api/after-sales/:id — 审核售后（更新状态，仅管理员）
  review: (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限操作' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, message: '售后ID不能为空' });
    }
    const { status, merchant_remark } = req.body;
    if (!AFTER_SALE_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: '售后状态不合法' });
    }
    const updated = AfterSalesDB.updateStatus(id, status, merchant_remark, req.shopId);
    if (!updated) {
      return res.status(404).json({ success: false, message: '售后记录不存在' });
    }
    // 返回完整 DTO（含子表时间戳 + 商品明细），不要只回 findById
    res.json({ success: true, data: buildAfterSaleDetail(id, req.shopId) });
  },

  // DELETE /api/after-sales/:id — 删除售后（软删除：主表 + 明细一起标记 is_deleted=1，仅管理员）
  deleteAfterSale: (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限操作' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, message: '售后ID不能为空' });
    }
    const ok = AfterSalesDB.softDelete(id, req.shopId);
    if (ok) {
      res.json({ success: true, message: '售后记录已删除' });
    } else {
      res.status(404).json({ success: false, message: '售后记录不存在' });
    }
  },

  // POST /api/after-sales/:id/submit-return — 用户提交退货方式（上门取件/自行寄回 + 时间段）
  submitReturn: (req, res) => {
    const id = req.params.id;
    const { return_way, return_time_slot } = req.body;
    if (!id) return res.status(400).json({ success: false, message: '售后ID不能为空' });
    if (!['pickup', 'self'].includes(return_way)) {
      return res.status(400).json({ success: false, message: 'return_way 必须是 pickup 或 self' });
    }
    if (return_way === 'pickup' && !['morning', 'afternoon'].includes(return_time_slot)) {
      return res.status(400).json({ success: false, message: '上门取件必须指定时间段（morning/afternoon）' });
    }
    const result = AfterSalesDB.submitReturn(id, return_way, return_time_slot, req.shopId);
    if (result === null) {
      return res.status(400).json({ success: false, message: '售后记录不存在或当前状态不允许提交退货方式' });
    }
    if (result === 'submitted') {
      return res.status(400).json({ success: false, message: '已提交过退货方式，不能重复提交' });
    }
    // 返回完整 DTO（含 return_at 等子表字段）
    res.json({ success: true, data: buildAfterSaleDetail(id, req.shopId) });
  },
};

module.exports = afterSalesController;
