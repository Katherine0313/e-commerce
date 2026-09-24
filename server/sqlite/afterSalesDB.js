// ==================== 售后 CRUD ====================
const { getDB, saveDatabase } = require('./connection');
const { getNow, formatDates, parseTime, RETURNS_TIME_FIELDS, nextIdInShop, requireShopId } = require('./utils');

/**
 * 售后类型 → 子表名映射
 * 主表 after_sales 只存基础信息 + 状态 + 业务字段；
 * 所有「操作时间戳 + 退货信息」分散到三张子表，由 after_sale_type 决定
 */
const SUB_TABLE_MAP = {
  return_refund: 'after_sale_returns',         // 退货退款
  exchange: 'after_sale_exchange_returns',     // 换货
  only_refund: 'after_sale_only_refunds',      // 仅退款
};

/** 状态 → 写入的子表列名 + 是否启用映射表 */
const STATUS_COLUMN_MAP = {
  returning:    'review_at',     // 退货退款/换货 审核通过（→ 等待买家退货）
  refunding:    'review_at',     // 仅退款 审核通过（→ 商家开始退款）
  rejected:     'rejected_at',   // 拒绝售后
  refund_confirming: 'refund_at',       // 确认退款
  refunded:     'refunded_at',   // 退款完成
  returned:     'refunded_at',   // 仅退款完成（语义等同 refunded）
  exchanging:   'exchange_at',   // 换货专属：商家确认收货，开始换货
  exchanged:    'exchanged_at',  // 换货专属：换货完成
};

const AfterSalesDB = {
  /** 生成售后单号：AS + 年月日时分秒 */
  _generateAfterSaleNo: () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return 'AS' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
  },

  /** 把数据库行格式化为返回对象：时间戳转字符串、images 字符串转数组 */
  _format: (row) => {
    if (!row) return row;
    const out = formatDates(row);
    if (typeof out.images === 'string') {
      try { out.images = JSON.parse(out.images); } catch (e) { out.images = []; }
    }
    if (!Array.isArray(out.images)) out.images = [];
    return out;
  },

  /** 格式化明细行：时间戳转字符串、insurance_detail 字符串转数组 */
  _formatItem: (row) => {
    const out = formatDates(row);
    if (typeof out.insurance_detail === 'string') {
      try { out.insurance_detail = JSON.parse(out.insurance_detail); } catch (e) { out.insurance_detail = []; }
    }
    if (!Array.isArray(out.insurance_detail)) out.insurance_detail = [];
    return out;
  },

  /** 格式化子表行：按 RETURNS_TIME_FIELDS 把时间戳转字符串 */
  _formatReturn: (row) => {
    if (!row) return row;
    return formatDates(row, RETURNS_TIME_FIELDS);
  },

  /** 根据 after_sale_type 取子表名，未知类型返回 null */
  _subTable: (afterSaleType) => SUB_TABLE_MAP[afterSaleType] || null,

  /**
   * 创建售后申请（id 由 SQLite AUTOINCREMENT 自动生成）+ 写入明细 + 写子表占位行
   * @param {Object} data - { order_id, order_no, after_sale_type, reason, remark, images, ... }
   * @param {Array}  items - [{ order_item_id, product_id, product_name, image, sales_price, quantity, refund_amount, insurance_detail, insurance_fee }]
   * @param {number} shopId - 店铺隔离键
   * @returns {Object|null}
   */
  create: (data, items = [], shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const now = getNow();
    const type = data.after_sale_type || 'return_refund';
    const subTable = AfterSalesDB._subTable(type);
    if (!subTable) {
      throw new Error(`未知的售后类型：${type}`);
    }
    const afterSaleNo = data.after_sale_no || AfterSalesDB._generateAfterSaleNo();
    const initialStatus = 'reviewing';

    const id = nextIdInShop('after_sales', shopId);
    db.run(`INSERT INTO after_sales
      (id, shop_id, order_id, order_no, after_sale_no, after_sale_type, reason, remark, images, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        shopId,
        data.order_id,
        data.order_no,
        afterSaleNo,
        type,
        data.reason,
        data.remark || '',
        JSON.stringify(Array.isArray(data.images) ? data.images : []),
        initialStatus,
        now,
        now,
      ]);

    // 写子表占位行（所有时间戳/退货字段先为 NULL，等状态推进再写）
    const subId = nextIdInShop(subTable, shopId);
    db.run(
      `INSERT INTO ${subTable} (id, shop_id, after_sale_id, created_at, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [subId, shopId, id, now, now]
    );

    // 写售后明细（id 在本店铺号段内自增）
    const stmt = db.prepare(`INSERT INTO after_sale_items (id, shop_id, after_sale_id, order_item_id, product_id, product_name, image, sales_price, quantity, refund_amount, insurance_detail, insurance_fee, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    let itemId = nextIdInShop('after_sale_items', shopId);
    for (const item of items) {
      stmt.run([
        itemId,
        shopId,
        id,
        item.order_item_id ?? null,
        item.product_id,
        item.product_name,
        item.image || '',
        item.sales_price || 0,
        item.quantity || 1,
        item.refund_amount ?? 0,
        JSON.stringify(Array.isArray(item.insurance_detail) ? item.insurance_detail : []),
        Number(item.insurance_fee) || 0,
        now,
        now,
      ]);
      itemId++;
    }
    stmt.free();

    saveDatabase();
    return AfterSalesDB.findById(id, shopId);
  },

  /** 列出需要 LEFT JOIN 从 orders 补回的字段 */
  _ORDER_JOIN_FIELDS: ['consignee', 'phone', 'region', 'detail_address', 'order_status', 'sign_status', 'pay_at', 'confirm_at', 'ship_at', 'finish_at', 'pay_type', 'pay_amount'],

  /**
   * 主表 + orders JOIN 一段：主表只剩 created_at/updated_at，
   * 其余时间戳统一从子表读，由 controller.getById 通过 getReturn 合并
   *
   * 店铺条件写在 ON 里而不是 WHERE 里：这是 LEFT JOIN，条件挪到 WHERE 会把
   * 「订单缺失」的行整行滤掉，改变语义。写成 o.shop_id = a.shop_id 还有个好处 ——
   * 万一 order_id 异常指向了别的店铺的订单，这一侧会落成 NULL，
   * 而不是把别人店铺的收货人姓名/电话/详细地址带出来
   */
  _JOIN_SQL: `SELECT
    a.id, a.order_id, a.after_sale_no, a.order_no, a.after_sale_type, a.status,
    a.reason, a.remark, a.images, a.created_at, a.updated_at,
    a.is_deleted, a.merchant_remark,
    o.consignee, o.phone, o.region, o.detail_address,
    o.order_status, o.sign_status, o.pay_at, o.confirm_at, o.ship_at, o.finish_at,
    o.pay_type, o.pay_amount
    FROM after_sales a
    LEFT JOIN orders o ON o.id = a.order_id AND o.shop_id = a.shop_id`,

  /**
   * 查询售后列表（默认过滤软删除，只返回本店铺的）
   * @param {Object} filters - { status?, search?, date_field?, start_date?, end_date? }
   * @param {number} shopId  - 店铺隔离键（固定放最后一个参数，漏传会绑定 undefined 直接报错）
   * @returns {Array}
   */
  getAll: (filters = {}, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    let sql = AfterSalesDB._JOIN_SQL + ' WHERE a.is_deleted = 0 AND a.shop_id = ?';
    const params = [shopId];
    if (filters.status) {
      sql += ' AND a.status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      const keyword = '%' + filters.search + '%';
      sql += ' AND (a.order_no LIKE ? OR a.after_sale_no LIKE ? '
         + 'OR o.consignee LIKE ? OR o.phone LIKE ?)';
      params.push(keyword, keyword, keyword, keyword);
    }
    // 日期范围筛选（默认 a.created_at；只暴露主表可访问的字段并加别名，
    // 避免与 orders.created_at 歧义；子表时间戳不在此处）
    const dateFieldMap = {
      created_at: 'a.created_at',
      updated_at: 'a.updated_at',
    };
    const dateField = dateFieldMap[filters.date_field] || 'a.created_at';
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
    sql += ' ORDER BY a.created_at DESC, a.id DESC';

    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const data = [];
    while (stmt.step()) data.push(AfterSalesDB._format(stmt.getAsObject()));
    stmt.free();
    return data;
  },

  /** 根据 ID 查询单条售后记录（过滤软删除，且必须是本店铺的） */
  findById: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare(AfterSalesDB._JOIN_SQL + ' WHERE a.id = ? AND a.is_deleted = 0 AND a.shop_id = ?');
    stmt.bind([id, shopId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return AfterSalesDB._format(row);
    }
    stmt.free();
    return null;
  },

  /** 查询售后明细（过滤软删除，且必须是本店铺的） */
  getItems: (afterSaleId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM after_sale_items WHERE after_sale_id = ? AND is_deleted = 0 AND shop_id = ? ORDER BY id ASC');
    stmt.bind([afterSaleId, shopId]);
    const data = [];
    while (stmt.step()) data.push(AfterSalesDB._formatItem(stmt.getAsObject()));
    stmt.free();
    return data;
  },

  /**
   * 查询子表的全部字段（退货信息 + 所有操作时间戳）
   * controller.getById 把这里返回的字段全部 spread 到主表响应顶层
   * 字段名与前端当前用法一致，前端不用改
   * @param {string} afterSaleType - 'return_refund' / 'only_refund' / 'exchange'
   * @param {string} afterSaleId
   * @param {number} shopId
   * @returns {Object|null}
   */
  getReturn: (afterSaleType, afterSaleId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const tableName = AfterSalesDB._subTable(afterSaleType);
    if (!tableName) return null;
    const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE after_sale_id = ? AND is_deleted = 0 AND shop_id = ?`);
    stmt.bind([afterSaleId, shopId]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = AfterSalesDB._formatReturn(stmt.getAsObject());
    stmt.free();
    return row;
  },

  /** 查询本店铺所有已存在售后记录的订单 ID（用于前端禁用「申请售后」按钮，过滤软删除） */
  getOrderIds: (shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare('SELECT DISTINCT order_id FROM after_sales WHERE is_deleted = 0 AND shop_id = ?');
    stmt.bind([shopId]);
    const ids = [];
    while (stmt.step()) ids.push(stmt.getAsObject().order_id);
    stmt.free();
    return ids;
  },

  /** 根据订单 ID 查询售后记录（返回最新一条，用于重复申请校验，过滤软删除，限本店铺） */
  findByOrderId: (orderId, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const stmt = db.prepare(AfterSalesDB._JOIN_SQL + ' WHERE a.order_id = ? AND a.is_deleted = 0 AND a.shop_id = ? ORDER BY a.id DESC LIMIT 1');
    stmt.bind([orderId, shopId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return AfterSalesDB._format(row);
    }
    stmt.free();
    return null;
  },

  /**
   * 更新售后状态 + 同步写子表时间戳
   * 1) 主表只动 status / merchant_remark / updated_at，不写任何业务时间戳
   * 2) 按 after_sale_type 找到对应子表
   * 3) 按 status 在 STATUS_COLUMN_MAP 中找子表列名，写入
   * @returns {Object|null} 更新后的售后记录
   */
  updateStatus: (id, status, merchantRemark = '', shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const now = getNow();

    // 1) 先取类型（查不到说明不属于本店铺，直接返回 null）
    const typeStmt = db.prepare('SELECT after_sale_type FROM after_sales WHERE id = ? AND is_deleted = 0 AND shop_id = ?');
    typeStmt.bind([id, shopId]);
    if (!typeStmt.step()) {
      typeStmt.free();
      return null;
    }
    const afterSaleType = typeStmt.getAsObject().after_sale_type;
    typeStmt.free();

    // 2) 更新主表（status / merchant_remark / updated_at），不写任何业务时间戳
    db.run(
      `UPDATE after_sales
       SET status = ?, merchant_remark = ?, updated_at = ?
       WHERE id = ? AND is_deleted = 0 AND shop_id = ?`,
      [status, merchantRemark || '', now, id, shopId]
    );

    // 3) 写子表时间戳（按状态查列名）
    const columnName = STATUS_COLUMN_MAP[status];
    if (columnName) {
      const subTable = AfterSalesDB._subTable(afterSaleType);
      if (subTable) {
        db.run(
          `UPDATE ${subTable}
           SET ${columnName} = ?, updated_at = ?
           WHERE after_sale_id = ? AND is_deleted = 0 AND shop_id = ?`,
          [now, now, id, shopId]
        );
      }
    }

    saveDatabase();
    return AfterSalesDB.findById(id, shopId);
  },

  /**
   * 软删除售后：主表 + 明细 + 子表一起打 is_deleted = 1
   * 不物理删除、保留明细，可改回 is_deleted = 0 恢复
   */
  softDelete: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    // findById 里已带 shop_id 条件，不属于本店铺时返回 null，后面一步都不会执行
    const order = AfterSalesDB.findById(id, shopId);
    if (!order) return false;
    const now = getNow();
    const subTable = AfterSalesDB._subTable(order.after_sale_type);

    db.run('UPDATE after_sales SET is_deleted = 1, updated_at = ? WHERE id = ? AND shop_id = ?', [now, id, shopId]);
    db.run('UPDATE after_sale_items SET is_deleted = 1, updated_at = ? WHERE after_sale_id = ? AND shop_id = ?', [now, id, shopId]);
    if (subTable) {
      db.run(`UPDATE ${subTable} SET is_deleted = 1, updated_at = ? WHERE after_sale_id = ? AND shop_id = ?`, [now, id, shopId]);
    }
    saveDatabase();
    return true;
  },

  /**
   * 用户提交退货方式（仅在 status='returning' 时可调用）
   * 按 after_sale_type 写入对应的子表 return_way/return_time_slot/return_at
   * 主表不再推进状态：return_refund → 'refunding'；exchange → 保持 'returning'
   * @param {string} id
   * @param {string} returnWay       - 'pickup' / 'self'
   * @param {string} [returnTimeSlot] - 'morning' / 'afternoon'；自行寄回可空
   * @param {number} shopId
   * @returns {Object|string|null}    - 成功返回更新后的售后单；'submitted' 表示已提交过；null 表示记录不存在/状态不对
   */
  submitReturn: (id, returnWay, returnTimeSlot, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const now = getNow();

    // 1) 查记录 + 类型（不限制状态，已提交过的也能查到；查不到说明不属于本店铺）
    const saleStmt = db.prepare('SELECT after_sale_type FROM after_sales WHERE id = ? AND is_deleted = 0 AND shop_id = ?');
    saleStmt.bind([id, shopId]);
    if (!saleStmt.step()) {
      saleStmt.free();
      return null;
    }
    const afterSaleType = saleStmt.getAsObject().after_sale_type;
    saleStmt.free();

    // 仅退款不调本接口
    if (afterSaleType === 'only_refund') return null;
    const tableName = AfterSalesDB._subTable(afterSaleType);
    if (!tableName) return null;

    // 2) 是否已提交过（显式查一下能给出更明确的 'submitted'）
    const existStmt = db.prepare(`SELECT id FROM ${tableName} WHERE after_sale_id = ? AND is_deleted = 0 AND return_at IS NOT NULL AND shop_id = ?`);
    existStmt.bind([id, shopId]);
    if (existStmt.step()) {
      existStmt.free();
      return 'submitted';
    }
    existStmt.free();

    // 3) 状态必须是 returning
    const statusStmt = db.prepare('SELECT status FROM after_sales WHERE id = ? AND status = ? AND shop_id = ?');
    statusStmt.bind([id, 'returning', shopId]);
    if (!statusStmt.step()) {
      statusStmt.free();
      return null;
    }
    statusStmt.free();

    // 4) UPSERT 到子表：占位行已在 create() 写入，这里 UPDATE 即可
    db.run(
      `UPDATE ${tableName}
       SET return_way = ?, return_time_slot = ?, return_at = ?, updated_at = ?
       WHERE after_sale_id = ? AND is_deleted = 0 AND shop_id = ?`,
      [returnWay, returnTimeSlot || null, now, now, id, shopId]
    );

    // 5) 主表推进状态：return_refund → 'refunding'；exchange → 保持 'returning'
    if (afterSaleType === 'return_refund') {
      db.run('UPDATE after_sales SET status = ?, updated_at = ? WHERE id = ? AND shop_id = ?', ['refunding', now, id, shopId]);
    } else {
      db.run('UPDATE after_sales SET updated_at = ? WHERE id = ? AND shop_id = ?', [now, id, shopId]);
    }

    saveDatabase();
    return AfterSalesDB.findById(id, shopId);
  },

  /**
   * 硬删除本店铺内所有没有 order_items 的订单
   * 关联的 after_sales / after_sale_items / 三张子表 一并物理删除
   *
   * ⚠️ 当前没有任何路由调用它。这是**不可恢复的物理删除**（绕过软删除直接 DELETE），
   *    千万不要接成后台的「数据清理」入口。shopId 已经是必传参数，
   *    漏传会直接抛错而不是退化成全库删除
   * @returns {{ orders: number, afterSales: number }}
   */
  purgeEmptyOrders: (shopId) => {
    requireShopId(shopId);
    const db = getDB();
    // 1) 找出空订单的 id
    const orderIds = [];
    const orderStmt = db.prepare(`
      SELECT orders.id
      FROM orders
      LEFT JOIN order_items ON order_items.order_id = orders.id AND order_items.shop_id = orders.shop_id
      WHERE order_items.id IS NULL AND orders.shop_id = ?
    `);
    orderStmt.bind([shopId]);
    while (orderStmt.step()) orderIds.push(orderStmt.getAsObject().id);
    orderStmt.free();

    if (orderIds.length === 0) {
      return { orders: 0, afterSales: 0 };
    }

    // 2) 找出这些订单关联的售后单 id
    const afterSaleIds = [];
    const asStmt = db.prepare('SELECT id FROM after_sales WHERE order_id = ? AND shop_id = ?');
    for (const oid of orderIds) {
      asStmt.bind([oid, shopId]);
      while (asStmt.step()) afterSaleIds.push(asStmt.getAsObject().id);
      asStmt.reset();
    }
    asStmt.free();

    // 3) 删关联表
    for (const asId of afterSaleIds) {
      db.run('DELETE FROM after_sale_returns WHERE after_sale_id = ? AND shop_id = ?', [asId, shopId]);
      db.run('DELETE FROM after_sale_exchange_returns WHERE after_sale_id = ? AND shop_id = ?', [asId, shopId]);
      db.run('DELETE FROM after_sale_only_refunds WHERE after_sale_id = ? AND shop_id = ?', [asId, shopId]);
      db.run('DELETE FROM after_sale_items WHERE after_sale_id = ? AND shop_id = ?', [asId, shopId]);
      db.run('DELETE FROM after_sales WHERE id = ? AND shop_id = ?', [asId, shopId]);
    }
    for (const oid of orderIds) {
      db.run('DELETE FROM orders WHERE id = ? AND shop_id = ?', [oid, shopId]);
    }

    saveDatabase();
    return { orders: orderIds.length, afterSales: afterSaleIds.length };
  },

  /**
   * 硬删除本店铺内所有没有 after_sale_items 的售后单（含之前软删除的 is_deleted=1）
   * 关联的三张子表一并物理删除
   *
   * ⚠️ 同 purgeEmptyOrders：当前无路由调用，不可恢复，不要接后台入口
   * @returns {{ afterSales: number }}
   */
  purgeEmptyAfterSales: (shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const afterSaleIds = [];
    const stmt = db.prepare(`
      SELECT after_sales.id
      FROM after_sales
      LEFT JOIN after_sale_items ON after_sale_items.after_sale_id = after_sales.id AND after_sale_items.shop_id = after_sales.shop_id
      WHERE after_sale_items.id IS NULL AND after_sales.shop_id = ?
    `);
    stmt.bind([shopId]);
    while (stmt.step()) afterSaleIds.push(stmt.getAsObject().id);
    stmt.free();

    if (afterSaleIds.length === 0) {
      return { afterSales: 0 };
    }

    for (const asId of afterSaleIds) {
      db.run('DELETE FROM after_sale_returns WHERE after_sale_id = ? AND shop_id = ?', [asId, shopId]);
      db.run('DELETE FROM after_sale_exchange_returns WHERE after_sale_id = ? AND shop_id = ?', [asId, shopId]);
      db.run('DELETE FROM after_sale_only_refunds WHERE after_sale_id = ? AND shop_id = ?', [asId, shopId]);
      db.run('DELETE FROM after_sales WHERE id = ? AND shop_id = ?', [asId, shopId]);
    }

    saveDatabase();
    return { afterSales: afterSaleIds.length };
  },
};

module.exports = { AfterSalesDB };