// 导入 SQLite 数据库中的促销活动数据模型
const { BusinessOnsaleDB } = require('../sqlite/database');

function handleError(err, res, next) {
  if (err.status === 400) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
}

const businessOnsaleController = {

  // 获取促销活动列表，支持活动名称模糊搜索
  getBusinessOnsales: (req, res, next) => {
    try {
      const data = BusinessOnsaleDB.getAll(req.query, req.shopId);
      res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res, next);
    }
  },

  // 根据 id 获取促销活动
  getBusinessOnsaleById: (req, res, next) => {
    try {
      const data = BusinessOnsaleDB.findById(req.params.id, req.shopId);
      if (!data) {
        return res.status(404).json({ success: false, message: '促销活动不存在' });
      }
      res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res, next);
    }
  },

  // 创建促销活动
  createBusinessOnsale: (req, res, next) => {
    try {
      const data = BusinessOnsaleDB.create(req.body, req.shopId);
      res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res, next);
    }
  },

  // 局部更新促销活动
  updateBusinessOnsale: (req, res, next) => {
    try {
      const data = BusinessOnsaleDB.update(req.params.id, req.body, req.shopId);
      if (!data) {
        return res.status(404).json({ success: false, message: '促销活动不存在' });
      }
      res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res, next);
    }
  },

  // 删除促销活动
  deleteBusinessOnsale: (req, res, next) => {
    try {
      const ok = BusinessOnsaleDB.delete(req.params.id, req.shopId);
      if (!ok) {
        return res.status(404).json({ success: false, message: '促销活动不存在' });
      }
      res.json({ success: true, message: '删除成功' });
    } catch (err) {
      return handleError(err, res, next);
    }
  },
};

module.exports = businessOnsaleController;
