// ==================== 订单 CRUD ====================
const { getDB, saveDatabase } = require('./connection');
const { getNow, formatDates, parseTime, nextIdInShop, requireShopId } = require('./utils');
const { ORDER_STATUS } = require('../constants/orderStatus');

const OrderDB = {
  // ==================== 工具方法 ====================

  /** 生成订单号：ORD + 年月日时分秒 */
  _generateOrderNo: () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return 'ORD' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
  },

  // ==================== 增删改查 ====================

  /**
   * 创建订单
   * @param {Object} orderData  - { user_id, consignee, phone, region, detail_address, remark, pay_amount }
   * @param {Array}  items      - [{ product_id, product_name, image, sales_price, quantity, sub_total }]
   * @param {number} shopId     - 店铺隔离键（固定放最后一个参数，漏传会绑定 undefined 直接报错）
   * @returns {Object|null}     新建的订单对象（含明细）
   */
  create: (orderData, items, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const id = nextIdInShop('orders', shopId);
    const orderNo = OrderDB._generateOrderNo();
    const now = getNow();

    // 写入订单主表，初始状态：待付款
    db.run(`INSERT INTO orders (id, shop_id, user_id, order_no, pay_amount, pay_type, order_status, remark, consignee, phone, region, detail_address, shipping_type, courier, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, shopId, orderData.user_id, orderNo, orderData.pay_amount, orderData.pay_type || null,
       ORDER_STATUS.PENDING_PAY,
       orderData.remark || '', orderData.consignee, orderData.phone,
       orderData.region, orderData.detail_address, orderData.shipping_type || '商家配送',
       orderData.courier || null, now, now]);

    // 写入订单明细（is_deleted 默认 0，正常状态）；id 在本店铺号段内自增
    const itemStmt = db.prepare(`INSERT INTO order_items (id, shop_id, order_id, product_id, product_name, image, sales_price, quantity, sub_total, insurance_detail, insurance_fee, created_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`);
    let iid = nextIdInShop('order_items', shopId);
    for (const item of items) {
      const insuranceDetail = Array.isArray(item.insurance_detail) ? JSON.stringify(item.insurance_detail) : '[]';
      const insuranceFee = Number(item.insurance_fee) || 0;
      itemStmt.run([iid, shopId, id, item.product_id, item.product_name,
        item.image || '', item.sales_price, item.quantity, item.sub_total, insuranceDetail, insuranceFee, now]);
      iid++;
    }
    itemStmt.free();

    saveDatabase();
    return OrderDB.findById(id, shopId);
  },

  /**
   * 查询订单列表
   * @param {Object} filters - { user_id?, search? }  search 模糊匹配：订单编号/收货人/手机号/商品名称
   * @returns {{ data: Array, total: number }}
   */
  getAll: (filters = {}, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    // 默认过滤软删除订单（is_deleted = 1）
    // shop_id 是本店铺的硬性过滤条件，作为第一个占位符，params 里也必须排第一
    let sql = 'SELECT * FROM orders WHERE is_deleted = 0 AND shop_id = ?';
    const params = [shopId];

    // 按用户筛选
    if (filters.user_id) {
      sql += ' AND user_id = ?';
      params.push(filters.user_id);
    }

    // 日期范围筛选（默认 created_at，支持 pay_at / updated_at 等）
    const dateField = ['created_at', 'pay_at', 'updated_at', 'ship_at', 'confirm_at', 'finish_at'].includes(filters.date_field)
      ? filters.date_field : 'created_at';
    const startTs = filters.start_date ? parseTime(filters.start_date) : null;
    const endTs = filters.end_date ? parseTime(filters.end_date) : null;
    if (startTs !== null) {
      sql += ' AND ' + dateField + ' >= ?';
      params.push(startTs);
    }
    if (endTs !== null) {
      sql += ' AND ' + dateField + ' <= ?';
      params.push(endTs);
    }

    // 关键词搜索
    if (filters.search) {
      const keyword = '%' + filters.search + '%';
      sql += ' AND (order_no LIKE ? OR consignee LIKE ? OR phone LIKE ? ' +
          'OR id IN (SELECT order_id FROM order_items WHERE product_name LIKE ? AND is_deleted = 0 AND shop_id = ?))';
      params.push(keyword, keyword, keyword, keyword, shopId);
    }

    // 查总数
    const countStmt = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as count'));
    if (params.length) countStmt.bind(params);
    const total = countStmt.step() ? countStmt.getAsObject().count : 0;
    countStmt.free();

    // 查数据，按创建时间倒序
    sql += ' ORDER BY created_at DESC';

    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const data = [];
    while (stmt.step()) data.push(formatDates(stmt.getAsObject()));
    stmt.free();

    return { data, total };
  },

  /**
   * 根据 ID 查询单个订单（不含明细）
   * @param {string} id
   * @returns {Object|null}
   */
  findById: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM orders WHERE id = ? AND is_deleted = 0 AND shop_id = ?');
    stmt.bind([id, shopId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return formatDates(row);
    }
    stmt.free();
    return null;
  },

  /**
   * 查询订单明细（order_items 表）
   * @param {string} orderId
   * @returns {Array}
   */
  getItems: (orderId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM order_items WHERE order_id = ? AND is_deleted = 0 AND shop_id = ?');
    stmt.bind([orderId, shopId]);
    const data = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const obj = formatDates(row);
      // 增值保障明细：JSON 字符串 → 数组
      try {
        obj.insurance_detail = obj.insurance_detail ? JSON.parse(obj.insurance_detail) : [];
      } catch (e) {
        obj.insurance_detail = [];
      }
      data.push(obj);
    }
    stmt.free();
    return data;
  },

  /**
   // ==================== 状态流转 ====================

  /**
   * 更新订单状态（自动记录对应时间戳）
   * @param {string} id      - 订单 ID
   * @param {string} status  - 目标状态，取 ORDER_STATUS 常量
   * @param {Object} extra   - 额外字段，如 { pay_type: 'wechat' }
   * @param {number} shopId  - 店铺隔离键
   * @returns {Object|null}
   */
  updateStatus: (id, status, extra = {}, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const now = getNow();
    if (status === ORDER_STATUS.PENDING_CONFIRM) {
      // 付款 → 记录付款时间和方式
      if (extra.pay_type) {
        db.run('UPDATE orders SET order_status = ?, pay_at = ?, pay_type = ?, updated_at = ? WHERE id = ? AND shop_id = ?',
          [status, now, extra.pay_type, now, id, shopId]);
      } else {
        db.run('UPDATE orders SET order_status = ?, pay_at = ?, updated_at = ? WHERE id = ? AND shop_id = ?',
          [status, now, now, id, shopId]);
      }
    } else if (status === ORDER_STATUS.PENDING_SHIP) {
      // 确认收款
      db.run('UPDATE orders SET order_status = ?, confirm_at = ?, updated_at = ? WHERE id = ? AND shop_id = ?', [status, now, now, id, shopId]);
    } else if (status === ORDER_STATUS.SHIPPED) {
      // 发货：记录发货时间 + 物流单号 + 快递公司
      const trackingNumber = extra.tracking_number || null;
      const courier = extra.courier || null;
      db.run('UPDATE orders SET order_status = ?, ship_at = ?, courier = ?, tracking_number = ?, updated_at = ? WHERE id = ? AND shop_id = ?',
        [status, now, courier, trackingNumber, now, id, shopId]);
    } else if (status === ORDER_STATUS.FINISHED) {
      // 完成 → 标记已签收
      db.run('UPDATE orders SET order_status = ?, finish_at = ?, sign_status = ?, updated_at = ? WHERE id = ? AND shop_id = ?', [status, now, 'signed', now, id, shopId]);
    } else {
      // 取消等其他状态
      db.run('UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ? AND shop_id = ?', [status, now, id, shopId]);
    }
    saveDatabase();
    return OrderDB.findById(id, shopId);
  },

  /**
   * 通用更新订单信息（收货人、电话、地址、备注、支付方式）
   * 仅更新传入的字段，不传的字段保持原值
   * @param {string} id
   * @param {Object} data  - { consignee?, phone?, region?, detail_address?, remark?, pay_type? }
   * @param {number} shopId - 店铺隔离键
   * @returns {Object|null}
   */
  update: (id, data, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const allowed = ['consignee', 'phone', 'region', 'detail_address', 'remark', 'pay_type', 'tracking_number', 'courier', 'shipping_type'];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(key + ' = ?');
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return OrderDB.findById(id, shopId);
    values.push(getNow());
    values.push(id);
    values.push(shopId);
    db.run(`UPDATE orders SET ${fields.join(', ')}, updated_at = ? WHERE id = ? AND shop_id = ?`, values);
    saveDatabase();
    return OrderDB.findById(id, shopId);
  },

  /**
   * 软删除订单：主表 + 明细一起标记 is_deleted = 1
   * 不物理删除、保留明细，可改回 is_deleted = 0 恢复
   * @param {string} id
   * @param {number} shopId - 店铺隔离键
   * @returns {boolean}
   */
  delete: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    // findById 已带 shop_id 条件，不属于本店铺时返回 null，后面一步都不会执行
    const order = OrderDB.findById(id, shopId);
    if (!order) return false;
    const now = getNow();
    db.run('UPDATE orders SET is_deleted = 1, updated_at = ? WHERE id = ? AND shop_id = ?', [now, id, shopId]);
    db.run('UPDATE order_items SET is_deleted = 1 WHERE order_id = ? AND shop_id = ?', [id, shopId]);
    saveDatabase();
    return true;
  }
};

module.exports = { OrderDB };
