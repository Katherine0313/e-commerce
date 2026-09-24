const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// 所有订单接口都需要登录
router.post('/', authMiddleware, (req, res) => orderController.createOrder(req, res));
router.get('/', authMiddleware, (req, res) => orderController.getOrders(req, res));
router.get('/status-constants', authMiddleware, (req, res) => orderController.getStatusConstants(req, res));
router.get('/couriers', authMiddleware, (req, res) => orderController.getCouriers(req, res));
router.delete('/batch-delete', authMiddleware, (req, res) => orderController.batchDeleteOrders(req, res));
router.get('/:id', authMiddleware, (req, res) => orderController.getOrderById(req, res));
router.put('/:id', authMiddleware, (req, res) => orderController.updateOrder(req, res));
router.delete('/:id', authMiddleware, (req, res) => orderController.deleteOrder(req, res));
router.put('/:id/pay', authMiddleware, (req, res) => orderController.payOrder(req, res));
router.put('/:id/confirm', authMiddleware, (req, res) => orderController.confirmOrder(req, res));
router.put('/:id/ship', authMiddleware, (req, res) => orderController.shipOrder(req, res));
router.put('/:id/finish', authMiddleware, (req, res) => orderController.finishOrder(req, res));
router.put('/:id/cancel', authMiddleware, (req, res) => orderController.cancelOrder(req, res));
router.get('/:id/logistics', authMiddleware, (req, res) => orderController.getLogistics(req, res));

module.exports = router;
