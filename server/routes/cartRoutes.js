const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/auth');

// 所有购物车接口都需要登录
router.get('/', authMiddleware, (req, res) => cartController.getCart(req, res));
router.post('/', authMiddleware, (req, res) => cartController.addItem(req, res));
router.put('/:product_id', authMiddleware, (req, res) => cartController.updateQuantity(req, res));
router.delete('/:product_id', authMiddleware, (req, res) => cartController.removeItem(req, res));
router.delete('/', authMiddleware, (req, res) => cartController.clear(req, res));

module.exports = router;
