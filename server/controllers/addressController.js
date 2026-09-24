const { ConsigneeAddressDB } = require('../sqlite/database');

const addressController = {
  // 获取当前用户的地址列表
  getAll: (req, res) => {
    const data = ConsigneeAddressDB.getAll({ user_id: req.user.id }, req.shopId);
    res.json({ success: true, data });
  },

  // 获取单个地址
  getById: (req, res) => {
    const address = ConsigneeAddressDB.findById(req.params.id, req.user.id, req.shopId);
    if (address) {
      res.json({ success: true, data: address });
    } else {
      res.status(404).json({ success: false, message: '地址不存在' });
    }
  },

  // 新建地址
  create: (req, res) => {
    console.log('[Address] create called, user:', req.user.id, 'body:', JSON.stringify(req.body));
    const data = { ...req.body, user_id: req.user.id };
    const address = ConsigneeAddressDB.create(data, req.shopId);
    res.json({ success: true, data: address });
  },

  // 更新地址
  update: (req, res) => {
    const data = { ...req.body, user_id: req.user.id };
    const address = ConsigneeAddressDB.update(req.params.id, data, req.shopId);
    if (address) {
      res.json({ success: true, data: address });
    } else {
      res.status(404).json({ success: false, message: '地址不存在' });
    }
  },

  // 删除地址
  delete: (req, res) => {
    const result = ConsigneeAddressDB.delete(req.params.id, req.user.id, req.shopId);
    if (result) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ success: false, message: '地址不存在' });
    }
  }
};

module.exports = addressController;
