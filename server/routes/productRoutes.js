// 导入 express 框架
const express = require('express');
// 创建路由实例：专门管理【商品模块】的所有接口
const router = express.Router();

// 导入商品控制器：封装所有商品的增删改查、筛选、统计逻辑
const productController = require('../controllers/productController');
// 导入权限中间件：用于验证用户是否登录，保护敏感接口
const authMiddleware = require('../middleware/auth');
// 导入管理员权限中间件：限制仅管理员可执行增删改操作
const adminAuthMiddleware = require('../middleware/adminAuth');

// 1. 获取商品列表（支持分页、分类筛选、关键词搜索）- 公共接口
router.get('/', (req, res, next) => {
  return productController.getProducts(req, res, next);
});

// 注：分类相关端点（/categories、/categories/flat）已迁移到 /api/categories 旗下，
// 见 server/routes/categoryRoutes.js，避免分类接口分散在两个前缀下。

// 3. 获取所有商品品牌（去重）- 公共接口
router.get('/brands', (req, res, next) => {
  return productController.getBrands(req, res, next);
});

// 4. 获取商品仪表盘统计数据（总数量、总库存、总价值）- 私有接口（需登录）
router.get('/dashboard', authMiddleware, (req, res, next) => {
  return productController.getDashboard(req, res, next);
});

// 4. 根据商品ID查询单个商品详情 - 公共接口
router.get('/:id', (req, res, next) => {
  return productController.getProductById(req, res, next);
});

// 5. 新增商品 - 私有接口（需登录且管理员）
router.post('/', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return productController.createProduct(req, res, next);
});

// 6. 根据商品ID修改商品信息 - 私有接口（需登录且管理员）
router.put('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return productController.updateProduct(req, res, next);
});

// 7. 根据商品ID删除商品 - 私有接口（需登录且管理员）
router.delete('/:id', authMiddleware, adminAuthMiddleware, (req, res, next) => {
  return productController.deleteProduct(req, res, next);
});

// 导出商品路由，供主入口文件 index.js 挂载使用
module.exports = router;