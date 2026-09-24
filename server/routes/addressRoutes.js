const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authMiddleware = require('../middleware/auth');

// 获取地址列表
router.get('/', authMiddleware, (req, res, next) => {
  return addressController.getAll(req, res, next);
});

// 获取单个地址
router.get('/:id', authMiddleware, (req, res, next) => {
  return addressController.getById(req, res, next);
});

// 新建地址
router.post('/', authMiddleware, (req, res, next) => {
  return addressController.create(req, res, next);
});

// 更新地址
router.put('/:id', authMiddleware, (req, res, next) => {
  return addressController.update(req, res, next);
});

// 删除地址
router.delete('/:id', authMiddleware, (req, res, next) => {
  return addressController.delete(req, res, next);
});

module.exports = router;
