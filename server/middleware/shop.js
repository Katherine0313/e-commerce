// ==================== 店铺上下文解析（全局中间件，必须挂在所有路由之前） ====================
// 作用：把「这个请求属于哪个店铺」解析成 req.shopId，供 DB 层按店铺过滤。
//
// 为什么必须是全局中间件，而不是塞进 authMiddleware：
// 项目里有一批 GET 接口是完全公开的（商品列表/详情、分类、标签、库存……），
// 它们没挂 authMiddleware，但改造后同样要按 shop_id 过滤 —— 否则这些接口
// 会把所有沙箱的数据混在一起返回。所以解析必须发生在路由之前。
//
// 隔离键的唯一合法来源是 token 里的 shopId。**永远不要**从 query / body / header
// 直接读店铺参数，那等于让调用方自己声明自己是哪个店。
const { ShopDB } = require('../sqlite/shopDB');
const { verifyToken } = require('../util/jwt');
const { getNow } = require('../sqlite/utils');
const { TEMPLATE_SHOP_ID } = require('../sqlite/shopTables');

const resolveShop = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 一、没带 token：公开访问，落到模板店
  // 游客不登录也能浏览商品，行为与改造前一致（那批 GET 接口本来就是公开的）
  if (!authHeader) {
    req.user = null;
    req.shop = ShopDB.findById(TEMPLATE_SHOP_ID);
    req.shopId = TEMPLATE_SHOP_ID;
    return next();
  }

  // 二、带了 token 但格式错/验签不过：直接 401
  // 这里不放行到模板店 —— 带着坏 token 还能读到数据，会让前端分不清
  // 自己倒底是登录态还是游客态，token 过期后一直卡在页面上
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'token格式错误' });
  }
  const payload = verifyToken(authHeader.split(' ')[1]);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'token无效' });
  }
  req.user = payload;

  // 三、回查店铺：token 里带的店可能已经被定时任务回收了
  // （token 本身没有过期时间，账号有效期完全由 shops.expires_at 决定）
  const shop = ShopDB.findById(payload.shopId);
  if (!shop) {
    return res.status(401).json({ success: false, message: '登录已失效，请重新登录' });
  }
  if (shop.expires_at && shop.expires_at <= getNow()) {
    return res.status(401).json({ success: false, message: '体验店铺已过期，请重新体验' });
  }
  req.shop = shop;
  req.shopId = shop.id;
  next();
};

module.exports = resolveShop;
