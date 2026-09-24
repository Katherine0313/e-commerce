// ==================== 上传控制器 ====================
// 提供文件上传接口，返回文件访问 URL

const { UploadDB } = require('../sqlite/database');

const uploadController = {
  // 文件上传处理
  // req.file 由 multer 中间件填充（详见 middleware/upload.js）
  uploadFile: (req, res) => {
    if (req.file) {
      const isBody = req.query && req.query.type === 'body';
      const urlPrefix = isBody ? '/image/body/' : '/image/upload/';
      const url = urlPrefix + req.file.filename;
      // 记录文件归属（哪个店铺传的），沙箱过期回收时据此删磁盘文件
      UploadDB.create(req.shopId, url);
      res.json({
        success: true,
        data: {
          url,
          filename: req.file.filename
        }
      });
    } else {
      res.json({ success: false, message: '文件上传失败' });
    }
  }
};

// 导出给 uploadRoutes.js 引入并注册路由
module.exports = uploadController;
