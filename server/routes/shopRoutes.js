// 导入 express 框架
const express = require('express');
// 创建路由实例：专门管理【店铺（体验沙箱）模块】的所有接口
const router = express.Router();

// 导入店铺控制器：开通沙箱、查询当前店铺
const shopController = require('../controllers/shopController');
// 导入登录校验中间件
const authMiddleware = require('../middleware/auth');

// 1. 一键体验：开通一个全新的沙箱店铺并直接返回 token - 公共接口（不需要登录）
router.post('/sandbox', (req, res, next) => {
  return shopController.createSandbox(req, res, next);
});

// 2. 获取当前登录账号所属的店铺信息（店名、有效期）- 私有接口（需登录权限）
router.get('/current', authMiddleware, (req, res, next) => {
  return shopController.getCurrentShop(req, res, next);
});

// 导出店铺路由，供主入口文件 index.js 挂载使用
module.exports = router;
