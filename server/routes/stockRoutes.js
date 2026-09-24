// 导入 express 框架
const express = require('express');
// 创建路由实例：专门管理【库存预警模块】的所有接口
const router = express.Router();

// 导入库存预警控制器：封装所有库存预警的增删改查逻辑
const stockController = require('../controllers/stockController');
// 导入权限中间件：用于验证用户是否登录，保护敏感接口
const authMiddleware = require('../middleware/auth');
// 库存预警的写操作与 products 对齐，仅管理员可执行
const adminAuthMiddleware = require('../middleware/adminAuth');

// 1. 获取库存预警列表（关联商品信息）- 公共接口
router.get('/', (req, res, next) => {
  return stockController.getStockList(req, res, next);
});

// 1.1 获取库存状态常量（中文、颜色），前端启动时调用一次
//     放在 /:id 之前，避免被当作 id 路由
router.get('/status-constants', (req, res, next) => {
  return stockController.getStatusConstants(req, res, next);
});

// 2. 获取还没配预警的商品（新增预警时的候选项）- 公共接口
//    放在 /:id 之前，否则 'candidates' 会被当成 id
router.get('/candidates', (req, res, next) => {
  return stockController.getCandidateProducts(req, res, next);
});

// 3. 按 product_id 查询单条预警配置 - 公共接口
router.get('/by-product/:productId', (req, res, next) => {
  return stockController.getStockByProductId(req, res, next);
});

// 4. 按预警配置 id 查询单条 - 公共接口
router.get('/:id', (req, res, next) => {
  return stockController.getStockById(req, res, next);
});

// 5. 新增库存预警配置 - 私有接口（需登录权限）
router.post('/', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return stockController.createStock(req, res, next);
});

// 6. 更新库存预警配置 - 私有接口（需登录权限）
router.put('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return stockController.updateStock(req, res, next);
});

// 7. 删除库存预警配置 - 私有接口（需登录权限）
router.delete('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return stockController.deleteStock(req, res, next);
});

// 导出库存预警路由，供主入口文件 index.js 挂载使用
module.exports = router;