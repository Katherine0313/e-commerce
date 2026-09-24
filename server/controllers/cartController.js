// ==================== 购物车控制器 ====================
const { CartDB, ProductDB: Product } = require('../sqlite/database');

// JSON 字符串 → 数组（增值保障明细）
const parseInsurance = (s) => {
  if (!s) return [];
  try { return JSON.parse(s); } catch (e) { return []; }
};

// 数据库行 → 前端需要的字段（时间戳等内部字段不返回）
const toItem = (row) => ({
  product_id: row.product_id,
  name: row.name,
  image: row.image,
  price: row.price,
  description: row.description,
  quantity: row.quantity,
  insurance_detail: parseInsurance(row.insurance_detail),
  insurance_fee: row.insurance_fee || 0
});

const cartController = {
  // GET /api/cart — 当前用户购物车列表
  getCart: (req, res) => {
    const data = CartDB.getAll(req.user.id, req.shopId).map(toItem);
    res.json({ success: true, data });
  },

  // POST /api/cart — 加入购物车
  addItem: (req, res) => {
    const { product_id, name, image, price, description, quantity, insurance_detail, insurance_fee } = req.body;
    if (product_id === undefined || product_id === null) {
      return res.status(400).json({ success: false, message: 'product_id 不能为空' });
    }
    const pid = Number(product_id);
    // 商品必须属于本店铺：拿别的店铺的商品 id 加购一律 404（快照字段才不会存进陌生商品）
    if (!Product.findById(pid, req.shopId)) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const data = CartDB.addItem(req.user.id, pid, { name, image, price, description, insurance_detail, insurance_fee }, qty, req.shopId);
    res.json({ success: true, data: data.map(toItem) });
  },

  // PUT /api/cart/:product_id — 更新数量
  updateQuantity: (req, res) => {
    const pid = Number(req.params.product_id);
    const quantity = parseInt(req.body.quantity, 10);
    if (!Number.isFinite(quantity)) {
      return res.status(400).json({ success: false, message: 'quantity 不能为空' });
    }
    const data = CartDB.updateQuantity(req.user.id, pid, quantity, req.shopId);
    if (data === null) {
      return res.status(404).json({ success: false, message: '商品不在购物车中' });
    }
    res.json({ success: true, data: data.map(toItem) });
  },

  // DELETE /api/cart/:product_id — 移除某个商品
  removeItem: (req, res) => {
    const pid = Number(req.params.product_id);
    const data = CartDB.removeItem(req.user.id, pid, req.shopId);
    res.json({ success: true, data: data.map(toItem) });
  },

  // DELETE /api/cart — 清空购物车（可选 body.product_ids 批量删除）
  clear: (req, res) => {
    const { product_ids } = req.body || {};
    let data;
    if (Array.isArray(product_ids) && product_ids.length) {
      data = CartDB.removeItems(req.user.id, product_ids.map(Number), req.shopId);
    } else {
      data = CartDB.clear(req.user.id, req.shopId);
    }
    res.json({ success: true, data: data.map(toItem) });
  }
};

module.exports = cartController;
