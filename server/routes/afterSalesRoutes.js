const express = require('express');
const router = express.Router();
const afterSalesController = require('../controllers/afterSalesController');
const authMiddleware = require('../middleware/auth');

// 所有售后接口都需要登录
router.post('/', authMiddleware, (req, res) => afterSalesController.create(req, res));
router.get('/', authMiddleware, (req, res) => afterSalesController.getAll(req, res));
router.get('/status-constants', authMiddleware, (req, res) => afterSalesController.getStatusConstants(req, res));
router.get('/:id', authMiddleware, (req, res) => afterSalesController.getById(req, res));
router.put('/:id', authMiddleware, (req, res) => afterSalesController.review(req, res));
router.post('/:id/submit-return', authMiddleware, (req, res) => afterSalesController.submitReturn(req, res));
router.delete('/:id', authMiddleware, (req, res) => afterSalesController.deleteAfterSale(req, res));

module.exports = router;
