// 导入 SQLite 数据库中的标签数据模型
const { TagDB: Tag } = require('../sqlite/database');

// 把数据库层抛出的 typed error 翻译成 HTTP 响应
function handleDbError(e, res, next) {
    if (e && e.code === 'TAG_CODE_DUPLICATE') {
        return res.status(409).json({ success: false, message: e.message });
    }
    return next(e);
}

// 标签控制器：处理所有标签相关的接口请求
const tagController = {
    // 获取标签列表
    getTags: (req, res) => {
        const { type } = req.query;
        const tags = Tag.getAll({ type }, req.shopId);
        res.json({ success: true, data: tags });
    },

    // 获取单个标签
    getTagById: (req, res) => {
        const tag = Tag.findById(req.params.id, req.shopId);
        if (tag) {
            res.json({ success: true, data: tag });
        } else {
            res.status(404).json({ success: false, message: '标签不存在' });
        }
    },
    // 创建标签
    createTag: (req, res, next) => {
        try {
            const operatorId = req.user?.id;
            const tag = Tag.create({
                ...req.body,
                created_by: operatorId,
                updated_by: operatorId
            }, req.shopId);
            res.json({ success: true, data: tag });
        } catch (e) {
            handleDbError(e, res, next);
        }
    },

    // 更新标签
    updateTag: (req, res, next) => {
        try {
            const operatorId = req.user?.id;
            const tag = Tag.update(req.params.id, {
                ...req.body,
                updated_by: operatorId
            }, req.shopId);
            if (tag) {
                res.json({ success: true, data: tag });
            } else {
                res.status(404).json({ success: false, message: '标签不存在' });
            }
        } catch (e) {
            handleDbError(e, res, next);
        }
    },

    // 删除标签
    deleteTag: (req, res) => {
        const deleted = Tag.delete(req.params.id, req.shopId);
        if (deleted) {
            res.json({ success: true, message: '删除成功' });
        } else {
            res.status(404).json({ success: false, message: '标签不存在' });
        }
    },

    // 获取商品标签列表
    getProductTags: (req, res) => {
        const { product_id } = req.params;
        const productTags = Tag.getProductTags(product_id, req.shopId);
        res.json({ success: true, data: productTags });
    },

    // 获取标签关联的商品列表
    getTagProducts: (req, res) => {
        const { tagId } = req.params;
        const products = Tag.getTagProducts(tagId, req.shopId);
        res.json({ success: true, data: products });
    },

    // 绑定商品标签（一个商品最多一个标签，直接写入 products.tag_id）
    bindProductTags: (req, res) => {
        const { product_id } = req.params;
        const { tagIds } = req.body;

        if (!Array.isArray(tagIds)) {
            return res.status(400).json({ success: false, message: 'tagIds 必须是数组' });
        }

        Tag.bindProductTags(product_id, tagIds, req.shopId);
        const productTags = Tag.getProductTags(product_id, req.shopId);
        res.json({ success: true, data: productTags });
    },

    // 解绑商品标签
    unbindProductTag: (req, res) => {
        const { product_id, tagId } = req.params;
        Tag.unbindProductTag(product_id, tagId, req.shopId);
        res.json({ success: true, message: '解绑成功' });
    },

    // 批量解绑标签下的商品
    unbindTagProducts: (req, res) => {
        const tagId = parseInt(req.params.tagId, 10);
        const { product_ids } = req.body;

        if (!Array.isArray(product_ids)) {
            return res.status(400).json({ success: false, message: 'product_ids 必须为数组' });
        }

        if (product_ids.length === 0) {
            return res.json({ success: true, message: '批量解绑成功' });
        }

        if (!Tag.findById(tagId, req.shopId)) {
            return res.status(404).json({ success: false, message: '标签不存在' });
        }

        if (!Tag.unbindTagProducts(tagId, product_ids, req.shopId)) {
            return res.status(400).json({ success: false, message: '未找到可解绑的关联记录' });
        }

        res.json({ success: true, message: '批量解绑成功' });
    },

    // 给一个标签批量绑定商品（一个商品最多一个标签，直接写入 products.tag_id）
    bindProductsToTag: (req, res) => {
        const tagId = parseInt(req.params.tagId, 10);
        const { product_ids } = req.body;

        if (!Array.isArray(product_ids) || product_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'product_ids 必须是非空数组' });
        }

        if (!Tag.findById(tagId, req.shopId)) {
            return res.status(404).json({ success: false, message: '标签不存在' });
        }

        Tag.bindProductsToTag(tagId, product_ids, req.shopId);
        res.json({ success: true, data: { tagId, count: product_ids.length } });
    }
};

module.exports = tagController;