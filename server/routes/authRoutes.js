// 导入 express 框架
const express = require('express');
// 创建路由实例（专门用来管理 用户相关的接口）
const router = express.Router();

// 导入 用户控制器（处理登录、注册、登出的核心逻辑）
const authController = require('../controllers/authController');
// 导入 权限中间件（验证用户是否登录、token是否有效）
const authMiddleware = require('../middleware/auth');

// 1. 登录接口：公共接口，无需登录即可访问
router.post('/login', (req, res, next) => {
  return authController.login(req, res, next);
});

// 2. 注册接口：公共接口，无需登录即可访问
router.post('/register', (req, res, next) => {
  return authController.register(req, res, next);
});

// 3. 获取用户信息接口：私有接口，必须先登录（authMiddleware验证）
router.get('/user/info', authMiddleware, (req, res, next) => {
  return authController.getUserInfo(req, res, next);
});

// 4. 登出接口：私有接口，必须先登录
router.post('/logout', authMiddleware, (req, res, next) => {
  return authController.logout(req, res, next);
});

// 导出路由，供主文件 index.js 引入使用
module.exports = router;