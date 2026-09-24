// 导入 multer：Express 专用的文件上传中间件
const multer = require('multer');
// 导入 path：处理文件路径的核心模块
const path = require('path');
// 导入 uuid：生成唯一随机字符串，用于给上传文件重命名（避免重名覆盖）
const { v4: uuidv4 } = require('uuid');
// 导入 fs：Node.js 文件系统模块，用于操作文件夹/文件
const fs = require('fs');

// 定义上传文件的存储目录
const productUploadDir = path.join(__dirname, '..', '..', 'public', 'image', 'upload');
const bodyUploadDir = path.join(__dirname, '..', '..', 'public', 'image', 'body');

// 检查文件夹是否存在，如果不存在则自动创建
[productUploadDir, bodyUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 只放行的图片/视频后缀（白名单）。注意不含 .svg —— svg 可内嵌 <script>，
// 上传后经 /image 静态目录直接打开会执行脚本，等同存储型 XSS
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.mp4', '.webm', '.mov', '.avi']);

// 文件类型白名单：拒绝白名单之外的后缀（含 .html/.svg/.js/.php 等）
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    const err = new Error('不支持的文件类型：' + ext);
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

// 配置 multer 的文件存储策略（保存到本地磁盘）
const storage = multer.diskStorage({
  // 指定文件上传的目标文件夹：body 类型存 body 目录，其他存 upload 目录
  destination: (req, file, cb) => {
    const isBody = req.query && req.query.type === 'body';
    const dir = isBody ? bodyUploadDir : productUploadDir;
    cb(null, dir);
  },

  // 自定义上传文件的文件名（核心：防止重名覆盖）
  filename: (req, file, cb) => {
    // 后缀统一转小写并只取白名单内的（fileFilter 已拦截白名单外的），
    // 不直接信任 file.originalname 的 ext，避免 .JPG 大小写 / 双后缀绕过
    const ext = path.extname(file.originalname).toLowerCase();
    // 生成新文件名：唯一UUID + 安全后缀
    cb(null, uuidv4() + ext);
  }
});

// 创建 multer 实例，传入存储配置 + 文件类型白名单过滤
const upload = multer({ storage: storage, fileFilter: fileFilter });

// 导出上传中间件，供 uploadRoutes.js 路由文件使用
module.exports = upload;
