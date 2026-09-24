// ==================== 促销活动 CRUD ====================
const { getDB, saveDatabase } = require('./connection');
const { getNow, parseTime, formatDates, nextIdInShop, requireShopId } = require('./utils');

const BUSINESS_ONSALE_FIELDS = [
  'activity_name',
  'start_time',
  'end_time',
  'order_close_time',
  'limit_type',
  'limit_quantity',
  'allow_full_discount',
  'allow_coupon',
];

function validationError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function assertObject(value, message) {
  const prototype = value && typeof value === 'object'
    ? Object.getPrototypeOf(value)
    : null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || (prototype !== Object.prototype && prototype !== null)) {
    throw validationError(message);
  }
}

function normalizeId(id) {
  const normalized = typeof id === 'string' && id.trim() !== '' ? Number(id) : id;
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw validationError('id 必须是正整数');
  }
  return normalized;
}

function normalizeFilters(filters) {
  assertObject(filters, '筛选条件必须是对象');
  if (filters.search !== undefined && typeof filters.search !== 'string') {
    throw validationError('search 必须是字符串');
  }
  return {
    search: filters.search === undefined ? '' : filters.search.trim(),
  };
}

function normalizeBody(data) {
  assertObject(data, '请求体必须是 JSON 对象');
  return data;
}

function findRawById(id, shopId) {
  requireShopId(shopId);
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM business_onsale WHERE id = ? AND shop_id = ?');
  stmt.bind([id, shopId]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function getActivityStatus(row, now) {
  if (now < row.start_time) return 'not_started';
  if (now <= row.end_time) return 'ongoing';
  return 'ended';
}

function toResponse(row, now = getNow()) {
  if (!row) return null;
  return formatDates({
    ...row,
    activity_status: getActivityStatus(row, now),
  }, ['start_time', 'end_time']);
}

function assertWritableFields(data) {
  for (const key of Object.keys(data)) {
    if (!BUSINESS_ONSALE_FIELDS.includes(key)) {
      throw validationError('不允许修改字段：' + key);
    }
  }
}

function normalizeTime(name, value) {
  let timestamp;
  if (typeof value === 'number') {
    timestamp = value;
  } else if (typeof value === 'string') {
    timestamp = parseTime(value);
  } else {
    timestamp = null;
  }
  if (!Number.isInteger(timestamp) || timestamp <= 0) {
    throw validationError(name + ' 必须是有效的 Unix 秒时间戳或日期时间字符串');
  }
  return timestamp;
}

function normalizePatch(data) {
  assertWritableFields(data);
  const patch = {};

  if (data.activity_name !== undefined) {
    if (typeof data.activity_name !== 'string' || data.activity_name.trim() === '') {
      throw validationError('activity_name 必须是非空字符串');
    }
    patch.activity_name = data.activity_name.trim();
  }

  for (const field of ['start_time', 'end_time']) {
    if (data[field] !== undefined) patch[field] = normalizeTime(field, data[field]);
  }

  if (data.order_close_time !== undefined) {
    if (!Number.isInteger(data.order_close_time) || data.order_close_time <= 0) {
      throw validationError('order_close_time 必须是正整数秒');
    }
    patch.order_close_time = data.order_close_time;
  }

  if (data.limit_type !== undefined) {
    if (data.limit_type !== 0 && data.limit_type !== 1) {
      throw validationError('limit_type 只能是 0 或 1');
    }
    patch.limit_type = data.limit_type;
  }

  if (data.limit_quantity !== undefined) {
    if (data.limit_quantity !== null
        && (!Number.isInteger(data.limit_quantity) || data.limit_quantity <= 0)) {
      throw validationError('limit_quantity 必须是 null 或正整数');
    }
    patch.limit_quantity = data.limit_quantity;
  }

  for (const field of ['allow_full_discount', 'allow_coupon']) {
    if (data[field] !== undefined) {
      if (data[field] !== 0 && data[field] !== 1) {
        throw validationError(field + ' 只能是 0 或 1');
      }
      patch[field] = data[field];
    }
  }

  return patch;
}

function validateRecord(data) {
  if (typeof data.activity_name !== 'string' || data.activity_name.trim() === '') {
    throw validationError('activity_name 必须是非空字符串');
  }
  if (!Number.isInteger(data.start_time) || data.start_time <= 0) {
    throw validationError('start_time 必须是正整数秒时间戳');
  }
  if (!Number.isInteger(data.end_time) || data.end_time <= 0) {
    throw validationError('end_time 必须是正整数秒时间戳');
  }
  if (data.end_time <= data.start_time) {
    throw validationError('end_time 必须晚于 start_time');
  }
  if (!Number.isInteger(data.order_close_time) || data.order_close_time <= 0) {
    throw validationError('order_close_time 必须是正整数秒');
  }
  if (data.limit_type !== 0 && data.limit_type !== 1) {
    throw validationError('limit_type 只能是 0 或 1');
  }
  if (data.limit_type === 0 && data.limit_quantity !== null) {
    throw validationError('不限购时 limit_quantity 必须为 null');
  }
  if (data.limit_type === 1
      && (!Number.isInteger(data.limit_quantity) || data.limit_quantity <= 0)) {
    throw validationError('限购时 limit_quantity 必须是正整数');
  }
  for (const field of ['allow_full_discount', 'allow_coupon']) {
    if (data[field] !== 0 && data[field] !== 1) {
      throw validationError(field + ' 只能是 0 或 1');
    }
  }
}

const BusinessOnsaleDB = {

  // ==================== 查：促销活动列表 ====================
  getAll: (filters = {}, shopId) => {
    requireShopId(shopId);
    const { search } = normalizeFilters(filters);
    // shop_id 是本店铺的硬性过滤条件，作为第一个占位符，params 里也必须排第一
    let sql = 'SELECT * FROM business_onsale WHERE shop_id = ?';
    const params = [shopId];
    if (search) {
      sql += ' AND activity_name LIKE ?';
      params.push('%' + search + '%');
    }
    sql += ' ORDER BY created_at DESC, id DESC';

    const db = getDB();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();

    const now = getNow();
    return rows.map(row => toResponse(row, now));
  },

  // ==================== 查：单条促销活动 ====================
  findById: (id, shopId) => {
    return toResponse(findRawById(normalizeId(id), shopId));
  },

  // ==================== 增：创建促销活动 ====================
  create: (data, shopId) => {
    requireShopId(shopId);
    const patch = normalizePatch(normalizeBody(data));
    const record = {
      ...patch,
      order_close_time: patch.order_close_time ?? 1800,
      limit_type: patch.limit_type ?? 0,
      limit_quantity: patch.limit_quantity ?? null,
      allow_full_discount: patch.allow_full_discount ?? 0,
      allow_coupon: patch.allow_coupon ?? 0,
    };
    validateRecord(record);

    const db = getDB();
    const now = getNow();
    const id = nextIdInShop('business_onsale', shopId);
    db.run(`INSERT INTO business_onsale
              (id, shop_id, activity_name, start_time, end_time, order_close_time,
               limit_type, limit_quantity, allow_full_discount, allow_coupon, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id,
      shopId,
      record.activity_name,
      record.start_time,
      record.end_time,
      record.order_close_time,
      record.limit_type,
      record.limit_quantity,
      record.allow_full_discount,
      record.allow_coupon,
      now,
    ]);
    saveDatabase();
    return BusinessOnsaleDB.findById(id, shopId);
  },

  // ==================== 改：局部更新促销活动 ====================
  update: (id, data, shopId) => {
    requireShopId(shopId);
    const normalizedId = normalizeId(id);
    const body = normalizeBody(data);
    assertWritableFields(body);
    if (Object.keys(body).length === 0) {
      throw validationError('至少提交一个可修改字段');
    }

    const existing = findRawById(normalizedId, shopId);
    if (!existing) return null;

    const patch = normalizePatch(body);
    if (patch.limit_type !== undefined
        && patch.limit_type !== existing.limit_type
        && patch.limit_quantity === undefined) {
      throw validationError('修改 limit_type 时必须同时提交匹配的 limit_quantity');
    }
    const merged = { ...existing, ...patch };
    validateRecord(merged);

    const changedFields = Object.keys(patch)
      .filter(field => !Object.is(existing[field], patch[field]));
    if (changedFields.length === 0) return toResponse(existing);

    const fields = changedFields.map(field => field + ' = ?');
    const values = changedFields.map(field => patch[field]);
    fields.push('updated_at = ?');
    values.push(getNow(), normalizedId, shopId);

    const db = getDB();
    db.run(`UPDATE business_onsale SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`, values);
    saveDatabase();
    return BusinessOnsaleDB.findById(normalizedId, shopId);
  },

  // ==================== 删：物理删除促销活动 ====================
  delete: (id, shopId) => {
    requireShopId(shopId);
    const normalizedId = normalizeId(id);
    if (!findRawById(normalizedId, shopId)) return false;
    const db = getDB();
    db.run('DELETE FROM business_onsale WHERE id = ? AND shop_id = ?', [normalizedId, shopId]);
    saveDatabase();
    return true;
  },
};

module.exports = { BusinessOnsaleDB };
