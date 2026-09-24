// 导入 express 框架
const express = require('express');
const router = express.Router();

// 导入标签控制器
const tagController = require('../controllers/tagController');
// 导入权限中间件
const authMiddleware = require('../middleware/auth');
// 标签的写操作与 products 对齐，仅管理员可执行
const adminAuthMiddleware = require('../middleware/adminAuth');

// ------------------- 标签接口路由定义 -------------------
// 获取标签列表（支持 type 筛选）
router.get('/', (req, res, next) => {
  return tagController.getTags(req, res, next);
});

// 获取单个标签
router.get('/:id', (req, res, next) => {
  return tagController.getTagById(req, res, next);
});

// 创建标签 [需登录]
router.post('/', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return tagController.createTag(req, res, next);
});

// 更新标签 [需登录]
router.put('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return tagController.updateTag(req, res, next);
});

// 删除标签 [需登录]
router.delete('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return tagController.deleteTag(req, res, next);
});

// 获取某商品的所有标签
router.get('/products/:product_id/tags', (req, res, next) => {
  return tagController.getProductTags(req, res, next);
});

// 给商品绑定标签 [需登录]
router.post('/products/:product_id/tags', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return tagController.bindProductTags(req, res, next);
});

// 解绑商品标签 [需登录]
router.delete('/products/:product_id/tags/:tagId', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return tagController.unbindProductTag(req, res, next);
});

// 给一个标签批量绑定商品（tag-centric） [需登录]
router.post('/:tagId/products', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return tagController.bindProductsToTag(req, res, next);
});

// 获取标签关联的商品列表
router.get('/:tagId/products', (req, res, next) => {
  return tagController.getTagProducts(req, res, next);
});

// 批量解绑标签下的商品 [需登录]
router.delete('/:tagId/products', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return tagController.unbindTagProducts(req, res, next);
});

// 导出标签路由
module.exports = router;