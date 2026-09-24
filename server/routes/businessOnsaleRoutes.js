// 导入 express 框架
const express = require('express');
// 创建路由实例：专门管理【促销活动模块】的所有接口
const router = express.Router();

// 导入促销活动控制器
const businessOnsaleController = require('../controllers/businessOnsaleController');
// 导入登录和管理员权限中间件
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');

// 1. 获取促销活动列表（支持活动名称搜索）- 需登录
router.get('/', authMiddleware, (req, res, next) => {
  return businessOnsaleController.getBusinessOnsales(req, res, next);
});

// 2. 根据 id 获取促销活动 - 需登录
router.get('/:id', authMiddleware, (req, res, next) => {
  return businessOnsaleController.getBusinessOnsaleById(req, res, next);
});

// 3. 创建促销活动 - 仅管理员
router.post('/', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return businessOnsaleController.createBusinessOnsale(req, res, next);
});

// 4. 局部更新促销活动 - 仅管理员
router.put('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return businessOnsaleController.updateBusinessOnsale(req, res, next);
});

// 5. 删除促销活动 - 仅管理员
router.delete('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return businessOnsaleController.deleteBusinessOnsale(req, res, next);
});

module.exports = router;
