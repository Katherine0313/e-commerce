// 登录校验中间件
// 依赖：resolveShop（middleware/shop.js）已经验过签、回查过店铺，并注入了 req.user
// 这里只做「有没有登录」的存在性判断 —— 验签和密钥都收在 resolveShop / util/jwt 一处，
// 避免同一份密钥和同一套校验逻辑散在多个文件里各写一遍
const authMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  next();
};

module.exports = authMiddleware;
