// 1. 导入 Express 框架（用于创建路由）
const express = require('express');

// 2. 创建路由实例（Router 是一个小型的"子应用"，可以有自己的路由和中间件）
const router = express.Router();

// 3. 导入控制器（负责处理具体的业务逻辑）
const uploadController = require('../controllers/uploadController');

// 4. 导入认证中间件（用于验证用户是否登录，防止未授权访问）
const authMiddleware = require('../middleware/auth');

// 5. 导入文件上传中间件（使用 multer 库处理文件上传）
const upload = require('../middleware/upload');

router.post('/', authMiddleware, upload.single('file'), (req, res, next) => {
  return uploadController.uploadFile(req, res, next);
});

// 7. 导出路由模块（供 index.js 注册使用）
module.exports = router;