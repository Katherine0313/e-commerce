// 导入分类数据库模型
const { CategoryDB: Category, ProductDB } = require('../sqlite/database');

// 分类控制器
const categoryController = {
    // 获取所有分类（默认返回树形结构）
    getCategories: (req, res) => {
        const categories = ProductDB.getCategories(req.shopId);
        res.json({ success: true, data: categories });
    },

    // 获取所有分类（扁平数组）
    getCategoriesFlat: (req, res) => {
        const categories = Category.getAll(req.shopId);
        res.json({ success: true, data: categories });
    },

    // 获取单个分类
    getCategoryById: (req, res) => {
        const category = Category.findById(req.params.id, req.shopId);
        if (category) {
            res.json({ success: true, data: category });
        } else {
            res.status(404).json({ success: false, message: '分类不存在' });
        }
    },

    // 创建分类
    createCategory: (req, res) => {
        try {
            const { name, parent_id, status, image, recommend } = req.body || {};
            if (!name) {
                return res.status(400).json({ success: false, message: '分类名称不能为空' });
            }
            const category = Category.create({ name, parent_id, status, image, recommend }, req.shopId);
            res.json({ success: true, data: category });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    },

    // 分类上移或下移
    moveCategory: (req, res, next) => {
        const rawId = req.params.id;
        if (rawId === undefined || rawId === null || rawId === '' || !/^\d+$/.test(String(rawId))) {
            return res.status(400).json({ success: false, message: '分类 id 不合法' });
        }
        const { direction } = req.body || {};
        if (!['up', 'down'].includes(direction)) {
            return res.status(400).json({ success: false, message: '移动方向只能是 up 或 down' });
        }
        try {
            const result = Category.move(rawId, direction, req.shopId);
            if (result.status === 'not_found') {
                return res.status(404).json({ success: false, message: '分类不存在' });
            }
            if (result.status === 'boundary') {
                const message = direction === 'up' ? '已是同级第一项，无法上移' : '已是同级最后一项，无法下移';
                return res.status(409).json({ success: false, message });
            }
            res.json({ success: true, message: '分类顺序调整成功' });
        } catch (err) {
            next(err);
        }
    },

    // 更新分类
    updateCategory: (req, res) => {
        try {
            // 校验 id：必须是数字。前端如果把 record.id 当作 id 传（实际字段是 value），
            // 会得到字面量 "undefined"，下面 ${id} 拼到 SQL 后会被 SQL.js 当成列引用，
            // 抛出 "no such column: undefined"。这里提前兜住，返回 400。
            const rawId = req.params.id;
            if (rawId === undefined || rawId === null || rawId === '' || !/^\d+$/.test(String(rawId))) {
                return res.status(400).json({ success: false, message: '分类 id 不合法' });
            }
            // 排序值只能通过箭头接口（/move）调整，不接受前端直接传 sort_order
            const { name, parent_id, status, image, recommend } = req.body || {};
            // 空 body / 没有任何可更新字段，直接 400，避免把 undefined 透传到 SQL.js 触发 500
            if (name === undefined && parent_id === undefined && status === undefined && image === undefined && recommend === undefined) {
                return res.status(400).json({ success: false, message: '请求体不能为空，至少需要一个可更新字段' });
            }
            const category = Category.update(req.params.id, { name, parent_id, status, image, recommend }, req.shopId);
            if (category) {
                res.json({ success: true, data: category });
            } else {
                res.status(404).json({ success: false, message: '分类不存在' });
            }
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    },

    // 删除分类
    deleteCategory: (req, res) => {
        const deleted = Category.delete(req.params.id, req.shopId);
        if (deleted) {
            res.json({ success: true, message: '删除成功' });
        } else {
            res.status(404).json({ success: false, message: '分类不存在' });
        }
    }
};

module.exports = categoryController;
