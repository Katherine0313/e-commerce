const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');
// 分类的写操作与 products 对齐，仅管理员可执行
const adminAuthMiddleware = require('../middleware/adminAuth');

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [分类]
 *     summary: 获取所有分类
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', (req, res, next) => {
  return categoryController.getCategories(req, res, next);
});

// 必须在 /:id 之前注册，否则 /flat 会被 :id 吞掉
router.get('/flat', (req, res, next) => {
  return categoryController.getCategoriesFlat(req, res, next);
});

router.post('/:id/move', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return categoryController.moveCategory(req, res, next);
});

router.get('/:id', (req, res, next) => {
  return categoryController.getCategoryById(req, res, next);
});

router.post('/', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return categoryController.createCategory(req, res, next);
});

router.put('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return categoryController.updateCategory(req, res, next);
});

router.delete('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return categoryController.deleteCategory(req, res, next);
});

module.exports = router;