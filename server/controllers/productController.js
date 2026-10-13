// 导入 SQLite 数据库中的商品数据模型
const { ProductDB: Product } = require('../sqlite/database');
// 富文本白名单过滤：入库前剥掉 onerror/onload/script 等危险内容
const { cleanRichText } = require('../util/sanitizeHtml');

// 商品控制器：处理所有商品相关的接口请求
const productController = {
    // 获取全部商品列表（支持分类筛选、关键词搜索）
    getProducts: (req, res) => {
        const { category_id, search, page, pageSize } = req.query;
        // shopId 来自 token（resolveShop 中间件注入），绝不从 query 取
        const result = Product.getAll(
            { categoryId: category_id, search, page, pageSize }, req.shopId);
        res.json({ success: true, data: result.data, total: result.total });
    },

    // 根据ID获取单个商品详情
    getProductById: (req, res) => {
        const product = Product.findById(req.params.id, req.shopId);
        if (product) {
            res.json({ success: true, data: product });
        } else {
            // 标准404状态码：资源不存在
            res.status(404).json({ success: false, message: '商品不存在' });
        }
    },

    // 获取所有商品分类（扁平数组）
    getCategoriesFlat: (req, res) => {
        const categories = Product.getCategoriesFlat();
        res.json({ success: true, data: categories });
    },

    // 获取所有商品分类（树形结构）
    getCategories: (req, res) => {
        const categories = Product.getCategories(req.shopId);
        res.json({ success: true, data: categories });
    },

    // 获取所有商品品牌（去重）
    getBrands: (req, res) => {
        const brands = Product.getBrands(req.shopId);
        res.json({ success: true, data: brands });
    },

    // 获取后台仪表盘统计数据
    getDashboard: (req, res) => {
        const dashboardData = Product.getDashboardData(req.shopId);
        res.json({ success: true, data: dashboardData });
    },

    // 创建/新增商品
    createProduct: (req, res) => {
        // 入库前清洗富文本，剥掉 onerror/onload/script 等危险内容
        if (req.body.body !== undefined) {
            req.body.body = cleanRichText(req.body.body);
        }
        const product = Product.create(req.body, req.shopId);
        res.json({ success: true, data: product });
    },

    // 根据ID更新商品信息
    updateProduct: (req, res) => {
        // 局部更新只传 body 时同样先清洗，防止绕过富文本编辑器直接写接口
        if (req.body.body !== undefined) {
            req.body.body = cleanRichText(req.body.body);
        }
        const product = Product.update(req.params.id, req.body, req.shopId);
        if (product) {
            res.json({ success: true, data: product });
        } else {
            res.status(404).json({ success: false, message: '商品不存在' });
        }
    },

    // 根据ID删除商品
    deleteProduct: (req, res) => {
        const result = Product.delete(req.params.id, req.shopId);
        if (result) {
            res.json({ success: true, message: '删除成功' });
        } else {
            res.status(404).json({ success: false, message: '商品不存在' });
        }
    }

};
// 导出商品控制器，供【商品路由模块(productRoutes.js)】引入并注册接口使用
module.exports = productController;