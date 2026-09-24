const { OrderDB: Order, ProductDB: Product, ConsigneeAddressDB, AfterSalesDB } = require('../sqlite/database');
const { validateOrder } = require('../util/validator');
const { ORDER_STATUS, validateTransition, PENDING_PAY_TIMEOUT_SECONDS } = require('../constants/orderStatus');
const { getNow } = require('../sqlite/utils');
const { COURIER_LIST, COURIER_MAP, PAY_TYPE_MAP, ORDER_STATUS_MAP, ORDER_STATUS_COLOR } = require('../constants/dict');

// 待确认 / 待发货 / 已发货：订单已进入履约流程，普通用户无权删除，仅管理员可删
const ADMIN_ONLY_DELETE_STATUSES = [ORDER_STATUS.PENDING_CONFIRM, ORDER_STATUS.PENDING_SHIP, ORDER_STATUS.SHIPPED];

/** 判断当前用户是否有权删除该订单（管理员可删所有；普通用户仅可删自己且非履约中的订单） */
function canDeleteOrder(req, order) {
  if (req.user.role === 'admin') return { ok: true };
  if (ADMIN_ONLY_DELETE_STATUSES.includes(order.order_status)) {
    return { ok: false, message: '该状态订单仅管理员可删除' };
  }
  if (Number(order.user_id) !== Number(req.user.id)) {
    return { ok: false, message: '无权操作该订单' };
  }
  return { ok: true };
}

/** 恢复订单商品库存，并返回订单明细 */
function restoreOrderStock(orderId, shopId) {
  const items = Order.getItems(orderId, shopId);
  const { getDB } = require('../sqlite/connection');
  const db = getDB();
  const stockStmt = db.prepare('SELECT stock FROM products WHERE id = ? AND shop_id = ?');
  const updateStmt = db.prepare('UPDATE products SET stock = ? WHERE id = ? AND shop_id = ?');
  for (const item of items) {
    stockStmt.bind([item.product_id, shopId]);
    const currentStock = stockStmt.step() ? stockStmt.getAsObject().stock : 0;
    stockStmt.reset();
    updateStmt.bind([currentStock + item.quantity, item.product_id, shopId]);
    updateStmt.step();
    updateStmt.reset();
  }
  stockStmt.free();
  updateStmt.free();
  return items;
}

/**
 * 取消订单的内部实现：恢复库存 + 状态改 cancel + 生成退款售后记录
 * 供「手动取消」(cancelOrder) 复用
 * @param {Object} order 订单对象
 * @param {number} shopId 店铺隔离键
 */
function performCancel(order, shopId) {
  const items = restoreOrderStock(order.id, shopId);
  // updateStatus 的签名是 (id, status, extra, shopId)，无额外字段时 extra 要占位传 {}
  const updated = Order.updateStatus(order.id, ORDER_STATUS.CANCEL, {}, shopId);

  // 取消订单 → 自动生成售后记录（仅退款）
  const afterSaleItems = items.map(item => ({
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
  AfterSalesDB.create({
    order_id: Number(order.id),
    order_no: order.order_no,
    after_sale_type: 'only_refund',
    reason: 'cancel',
    remark: '希望尽快退款',
  }, afterSaleItems, shopId);

  return updated;
}

/** 超时关闭待付款订单：释放库存后软删除订单及明细，不生成退款售后 */
function closeExpiredPendingPayOrder(order, shopId) {
  restoreOrderStock(order.id, shopId);
  Order.updateStatus(order.id, ORDER_STATUS.CANCEL, {}, shopId);
  return Order.delete(order.id, shopId);
}

/**
 * 扫描并关闭超时的待付款订单：created_at + 1800s ≤ now 的订单自动软删除、释放库存
 *
 * ⚠️ 这个函数由 setInterval 调用，**没有 req**，拿不到 req.shopId。
 *    所以必须自己把 shop_id 一起查出来往下传，不能写成「默认模板店」——
 *    那会让其它店铺的订单永远不被超时关闭
 */
function sweepExpiredPendingPayOrders() {
  const { getDB } = require('../sqlite/connection');
  const db = getDB();
  const expireThreshold = getNow() - PENDING_PAY_TIMEOUT_SECONDS;
  const stmt = db.prepare('SELECT id, shop_id FROM orders WHERE order_status = ? AND is_deleted = 0 AND created_at <= ?');
  stmt.bind([ORDER_STATUS.PENDING_PAY, expireThreshold]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  for (const row of rows) {
    const order = Order.findById(row.id, row.shop_id);
    // 二次确认仍是待付款，避免与支付操作并发时误取消已付款订单
    if (!order || order.order_status !== ORDER_STATUS.PENDING_PAY) continue;
    closeExpiredPendingPayOrder(order, row.shop_id);
  }
}

const orderController = {
  // POST /api/orders — 创建订单
  createOrder: (req, res) => {
    try {
      const { consignee, phone, region, detail_address, remark, items } = req.body;

      // 1. 校验参数
      validateOrder(req.body);

      // 2. 逐个查商品，取名称、图片、售价，同时校验库存
      const orderItems = [];
      let totalAmount = 0;
      for (const item of items) {
        const product = Product.findById(item.product_id, req.shopId);
        if (!product) {
          return res.status(400).json({ success: false, message: '商品ID ' + item.product_id + ' 不存在' });
        }
        const price = product.sales_price || product.price || 0;
        const stockNow = product.stock || 0;
        if (stockNow < item.quantity) {
          return res.status(400).json({ success: false, message: '商品「' + product.name + '」库存不足（剩余' + stockNow + '件）' });
        }
        // 增值保障：单件保障费 + 明细（前端购物车带入）
        const insuranceFee = Number(item.insurance_fee) || 0;
        const insuranceDetail = Array.isArray(item.insurance_detail) ? item.insurance_detail : [];
        // 按件计算：sub_total = (单价 + 单件保障费) × 数量
        const subTotal = parseFloat(((price + insuranceFee) * item.quantity).toFixed(2));
        orderItems.push({
          product_id: item.product_id,
          product_name: product.name,
          image: product.image,
          sales_price: price,
          quantity: item.quantity,
          sub_total: subTotal,
          insurance_detail: insuranceDetail,
          insurance_fee: insuranceFee
        });
        totalAmount += subTotal;
      }

      // 3. 扣库存（商品必须属于本店铺，否则 findById 返回 null）
      for (const item of items) {
        const product = Product.findById(item.product_id, req.shopId);
        if (!product) continue;
        const newStock = (product.stock || 0) - item.quantity;
        Product.update(item.product_id, { stock: newStock }, req.shopId);
      }

      // 4. 写入订单
      const payAmount = parseFloat(totalAmount.toFixed(2));
      const order = Order.create({
        user_id: req.user.id, consignee, phone, region, detail_address, remark,
        pay_amount: payAmount
      }, orderItems, req.shopId);

      // 4.5 同步收货地址到地址簿（已有相同地址则跳过）
      ConsigneeAddressDB.syncFromOrder(req.user.id, consignee, phone, region, detail_address, req.shopId);

      // 5. 返回
      res.json({
        success: true,
        data: { ...order, items: Order.getItems(order.id, req.shopId) }
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('创建订单失败：', err);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  },

  // GET /api/orders — 订单列表
  //   ?user_id=xxx   → 筛选指定用户
  //   ?all=true      → 查询全部订单（不限用户）
  //   ?search=xxx    → 按订单编号/收货人/手机号/商品名称模糊搜索
  //   ?start_date=x  → 按创建时间范围筛选
  //   ?end_date=x    → 按创建时间范围筛选
  //   默认           → 仅当前登录用户
  getOrders: (req, res) => {
    const { all } = req.query;
    const filters = {};

    // 搜索参数校验
    const rawSearch = req.query.search;
    if (rawSearch !== undefined && rawSearch !== null) {
      const trimmed = String(rawSearch).trim();
      if (trimmed.length > 0 && trimmed.length <= 100) {
        filters.search = trimmed;
      }
    }

    // 日期范围筛选（默认按创建时间，可通过 date_field 指定列）
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date) filters.end_date = req.query.end_date;
    if (req.query.date_field) filters.date_field = req.query.date_field;

    if (req.user.role === 'admin') {
      // 管理员：?all=true 时查全部；显式传 user_id 时按该用户筛选
      if (all !== 'true' && req.query.user_id) filters.user_id = req.query.user_id;
    } else {
      // 普通用户：只能看自己的订单。
      // 请求里带的 user_id 一律忽略 —— 原来会直接采信，等于让同一店铺里的买家用
      // ?user_id= 翻看别人的订单。店铺之间靠 shop_id 隔离，同店铺内的越权要在这里挡
      filters.user_id = req.user.id;
    }

    const result = Order.getAll(filters, req.shopId);
    // 已申请售后的订单 ID 集合，用于前端禁用「申请售后」按钮
    const afterSaleOrderIds = new Set(AfterSalesDB.getOrderIds(req.shopId).map(Number));
    // courier/pay_type 存的是英文 key，覆写为中文 label 再返回给前端
    const data = (result.data || []).map(order => ({
      ...order,
      courier: order.courier ? COURIER_MAP[order.courier] || order.courier : null,
      pay_type: order.pay_type ? PAY_TYPE_MAP[order.pay_type] || order.pay_type : null,
      has_after_sale: afterSaleOrderIds.has(Number(order.id)),
    }));
    res.json({ success: true, data, total: result.total });
  },

  // GET /api/orders/:id — 订单详情
  getOrderById: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    // 只能看自己的订单（admin 可看全部）
    if (req.user.role !== 'admin' && order.user_id !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: '无权查看该订单' });
    }
    const items = Order.getItems(req.params.id, req.shopId);
    // 从 products 查库存
    const { getDB } = require('../sqlite/connection');
    const db = getDB();
    const stockStmt = db.prepare('SELECT stock FROM products WHERE id = ? AND shop_id = ?');
    const itemsWithStock = items.map(item => {
      stockStmt.bind([item.product_id, req.shopId]);
      const stock = stockStmt.step() ? stockStmt.getAsObject().stock : 0;
      stockStmt.reset();
      return { ...item, stock };
    });
    stockStmt.free();
    // courier/pay_type 覆写为中文
    const courierLabel = order.courier ? COURIER_MAP[order.courier] || order.courier : null;
    const payTypeLabel = order.pay_type ? PAY_TYPE_MAP[order.pay_type] || order.pay_type : null;
    res.json({ success: true, data: { ...order, courier: courierLabel, pay_type: payTypeLabel, items: itemsWithStock } });
  },

  // GET /api/orders/status-constants — 前端取状态常量（中文、颜色）
  getStatusConstants: (req, res) => {
    res.json({
      success: true,
      data: {
        map: ORDER_STATUS_MAP,
        color: ORDER_STATUS_COLOR,
      }
    });
  },

  // GET /api/orders/couriers — 快递公司列表
  getCouriers: (req, res) => {
    res.json({
      success: true,
      data: COURIER_LIST,
    });
  },

  // PUT /api/orders/:id — 更新订单信息（收货人、电话、地址、备注等）
  updateOrder: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (req.user.role !== 'admin' && order.user_id !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: '无权操作该订单' });
    }
    const updated = Order.update(req.params.id, req.body, req.shopId);
    res.json({ success: true, data: updated });
  },

  // DELETE /api/orders/:id — 删除订单（软删除：仅标记 is_deleted=1，不物理删除、不恢复库存、保留明细）
  deleteOrder: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    const perm = canDeleteOrder(req, order);
    if (!perm.ok) {
      return res.status(403).json({ success: false, message: perm.message });
    }
    Order.delete(req.params.id, req.shopId);
    res.json({ success: true, message: '订单已删除' });
  },

  // DELETE /api/orders/batch-delete — 批量删除订单（body 带 ids 数组）
  batchDeleteOrders: (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids 必须是非空数组' });
      }

      const results = { success: 0, failed: 0, errors: [] };

      for (const id of ids) {
        const order = Order.findById(id, req.shopId);
        if (!order) {
          results.failed++;
          results.errors.push(`${id}: 订单不存在`);
          continue;
        }
        const perm = canDeleteOrder(req, order);
        if (!perm.ok) {
          results.failed++;
          results.errors.push(`${id}: ${perm.message}`);
          continue;
        }
        Order.delete(id, req.shopId);
        results.success++;
      }

      res.json({ success: true, data: results });
    } catch (err) {
      console.error('批量删除订单失败：', err);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  },

  // PUT /api/orders/:id/pay — 支付（pending_pay → pending_confirm）
  payOrder: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (req.user.role !== 'admin' && order.user_id !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: '无权操作该订单' });
    }
    const result = validateTransition(order.order_status, ORDER_STATUS.PENDING_CONFIRM);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }
    const updated = Order.updateStatus(req.params.id, ORDER_STATUS.PENDING_CONFIRM, { pay_type: req.body.pay_type || null }, req.shopId);
    res.json({ success: true, data: updated });
  },

  // PUT /api/orders/:id/confirm — 确认收款（pending_confirm → pending_ship）
  confirmOrder: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (req.user.role !== 'admin' && order.user_id !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: '无权操作该订单' });
    }
    const result = validateTransition(order.order_status, ORDER_STATUS.PENDING_SHIP);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }
    const updated = Order.updateStatus(req.params.id, ORDER_STATUS.PENDING_SHIP, {}, req.shopId);
    res.json({ success: true, data: updated });
  },

  // PUT /api/orders/:id/ship — 发货（pending_ship → shipped，商家操作，仅管理员）
  shipOrder: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '发货是商家操作，仅管理员可执行' });
    }
    const result = validateTransition(order.order_status, ORDER_STATUS.SHIPPED);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }
    // 前端可传 tracking_number（物流单号）和 courier（快递公司）
    const trackingNumber = req.body.tracking_number || ('YT' + Date.now());
    const courier = req.body.courier || null;
    const updated = Order.updateStatus(req.params.id, ORDER_STATUS.SHIPPED, { tracking_number: trackingNumber, courier: courier }, req.shopId);
    res.json({ success: true, data: updated });
  },

  // PUT /api/orders/:id/finish — 完成订单（shipped → finished）
  finishOrder: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (req.user.role !== 'admin' && order.user_id !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: '无权操作该订单' });
    }
    const result = validateTransition(order.order_status, ORDER_STATUS.FINISHED);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }
    const updated = Order.updateStatus(req.params.id, ORDER_STATUS.FINISHED, {}, req.shopId);
    res.json({ success: true, data: updated });
  },

  // GET /api/orders/:id/logistics — 查询物流轨迹（假数据，每单不同；优先使用发货时真实数据）
  getLogistics: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (req.user.role !== 'admin' && order.user_id !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: '无权查看该订单' });
    }

    // 优先使用发货时真实选择的快递公司和单号
    const realCourier = order.courier ? COURIER_MAP[order.courier] || order.courier : null;
    const realTracking = order.tracking_number || null;

    // 用订单 id 做种子，让每单的城市/路线不一样
    const idNum = parseInt(String(order.id).replace(/\D/g, ''), 10) || 1;
    const seed = idNum % 97;

    const cities = ['杭州', '北京', '上海', '广州', '深圳', '成都', '武汉', '南京', '西安', '重庆'];
    const districts = ['萧山', '朝阳', '浦东', '天河', '南山', '武侯', '洪山', '江宁', '雁塔', '渝北'];

    const originCity = cities[seed % cities.length];
    const originDistrict = districts[(seed + 3) % districts.length];
    const destCity = cities[(seed + 5) % cities.length];

    // 快递公司：有真实数据就用真实的，否则随机生成
    const courierName = realCourier || ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '申通快递', '极兔速递', '京东物流', '德邦快递'][(seed + 7) % 8];
    const courierShort = courierName.replace(/速运|快递|速递|物流/g, '');
    const trackingNumber = realTracking || order.tracking_number || ('YT' + Date.now());

    // 模拟时间偏移
    const addHours = (baseStr, hours) => {
      if (!baseStr) return '';
      const d = new Date(baseStr);
      d.setHours(d.getHours() + hours + (seed % 7));
      return d.toISOString().replace('T', ' ').substring(0, 19);
    };

    const shipTime = order.ship_at || '';
    const finishTime = order.finish_at || '';

    const status = order.order_status;
    let traces;
    if (status === ORDER_STATUS.SHIPPED) {
      traces = [
        { time: shipTime, status: '已揽件', desc: `【${originCity}${originDistrict}营业点】${courierShort}快递员已揽件，即将发往分拣中心` },
        { time: addHours(shipTime, 2), status: '运输中', desc: `【${originCity}分拣中心】快件已完成分拣，准备发往${destCity}` },
        { time: addHours(shipTime, 6), status: '运输中', desc: `【${originCity}中转部】快件已发出，正在运往${destCity}` },
        { time: addHours(shipTime, 18), status: '运输中', desc: `快件已到达${destCity}中转中心` },
        { time: '', status: '运输中', desc: `【${destCity}分拣中心】快件正在分拣，即将安排派送` },
      ];
    } else if (status === ORDER_STATUS.FINISHED) {
      traces = [
        { time: shipTime, status: '已揽件', desc: `【${originCity}${originDistrict}营业点】${courierShort}快递员已揽件，即将发往分拣中心` },
        { time: addHours(shipTime, 2), status: '运输中', desc: `【${originCity}分拣中心】快件已完成分拣，准备发往${destCity}` },
        { time: addHours(shipTime, 6), status: '运输中', desc: `【${originCity}中转部】快件已发出，正在运往${destCity}` },
        { time: addHours(shipTime, 18), status: '运输中', desc: `快件已到达${destCity}中转中心` },
        { time: addHours(shipTime, 22), status: '运输中', desc: `【${destCity}分拣中心】快件正在分拣，即将安排派送` },
        { time: addHours(shipTime, 24), status: '派送中', desc: `【${destCity}】${courierShort}快递员${['张伟', '李强', '王磊', '刘洋', '陈明'][seed % 5]}正在为您派送，请保持电话畅通` },
        { time: finishTime, status: '已签收', desc: '快件已由本人签收，感谢使用' },
      ];
    } else {
      traces = [];
    }

    res.json({
      success: true,
      data: {
        courier: courierName,
        tracking_number: trackingNumber,
        traces,
      },
    });
  },

  // PUT /api/orders/:id/cancel — 取消（pending_pay / pending_confirm / pending_ship → cancel）
  cancelOrder: (req, res) => {
    const order = Order.findById(req.params.id, req.shopId);
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (req.user.role !== 'admin' && order.user_id !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: '无权操作该订单' });
    }
    const result = validateTransition(order.order_status, ORDER_STATUS.CANCEL);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }
    const updated = performCancel(order, req.shopId);
    res.json({ success: true, data: updated });
  }
};

module.exports = orderController;
module.exports.sweepExpiredPendingPayOrders = sweepExpiredPendingPayOrders;
