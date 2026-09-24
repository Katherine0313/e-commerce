// 导入 SQLite 数据库中的库存预警数据模型
const { StockDB } = require('../sqlite/database');
// 库存状态常量（map / color），前端启动时调用一次
const { STOCK_STATUS_MAP, STOCK_STATUS_COLOR } = require('../constants/dict');

// 库存预警控制器：处理所有库存预警相关的接口请求
const stockController = {

  // 获取库存状态常量（中文、颜色），前端启动时调用一次
  getStatusConstants: (req, res) => {
    res.json({
      success: true,
      data: {
        map: STOCK_STATUS_MAP,
        color: STOCK_STATUS_COLOR,
      }
    });
  },

  // 获取库存预警列表（关联商品 + 销售信息，含预警状态），支持 ?search= 商品名模糊搜索
  getStockList: (req, res) => {
    try {
      const { search } = req.query;
      const data = StockDB.getListWithProducts(search, req.shopId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 获取还没配预警的商品（新增预警时的候选项）
  getCandidateProducts: (req, res) => {
    try {
      const data = StockDB.getProductsWithoutStockConfig(req.shopId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // 根据预警配置 id 查询单条
  getStockById: (req, res) => {
    const stock = StockDB.findById(req.params.id, req.shopId);
    if (stock) {
      res.json({ success: true, data: stock });
    } else {
      res.status(404).json({ success: false, message: '库存预警配置不存在' });
    }
  },

  // 根据 product_id 查询单条
  getStockByProductId: (req, res) => {
    const stock = StockDB.findByProductId(req.params.productId, req.shopId);
    if (stock) {
      res.json({ success: true, data: stock });
    } else {
      res.status(404).json({ success: false, message: '该商品未配置库存预警' });
    }
  },

  // 新增库存预警配置（重复 product_id 自动转为更新）
  createStock: (req, res) => {
    try {
      const existing = StockDB.findByProductId(req.body.product_id, req.shopId);
      if (existing) {
        const stock = StockDB.update(existing.id, req.body, req.shopId);
        return res.json({ success: true, data: stock });
      }
      const stock = StockDB.create(req.body, req.shopId);
      res.json({ success: true, data: stock });
    } catch (err) {
      // 业务校验抛错 → 400，外键约束报错也是 400（数据不合法）
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // 更新库存预警配置（部分字段更新）
  updateStock: (req, res) => {
    try {
      const stock = StockDB.update(req.params.id, req.body, req.shopId);
      if (stock) {
        res.json({ success: true, data: stock });
      } else {
        res.status(404).json({ success: false, message: '库存预警配置不存在' });
      }
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // 删除库存预警配置
  deleteStock: (req, res) => {
    const ok = StockDB.delete(req.params.id, req.shopId);
    if (ok) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ success: false, message: '库存预警配置不存在' });
    }
  },
};

// 导出库存预警控制器，供【库存预警路由模块(stockRoutes.js)】引入并注册接口使用
module.exports = stockController;