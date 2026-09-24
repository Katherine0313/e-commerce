// ==================== 模板店写保护 ====================
// 模板店（shop_id = 1）是所有体验沙箱的数据来源：它被改脏，之后开出来的每一个沙箱都是脏的。
// 而模板店的管理员密码是公开的演示凭据（admin / admin123，写在文档和启动日志里），
// 任何人登录后都能改它 —— 所以这里把「写模板店」这件事整体关掉，只留读。
//
// 本地需要维护演示素材时：在根目录 .env 里加 ALLOW_TEMPLATE_WRITE=1，改完记得去掉。
//
// 依赖：必须挂在 resolveShop 之后（req.shopId 由它注入），且在业务路由之前
const { TEMPLATE_SHOP_ID } = require('../sqlite/shopTables');

// 只有这几个方法是写操作，GET/HEAD 一律放行（浏览商品不需要登录，也不改数据）
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// 这几个接口虽然用 POST，但写的是「账号/会话/开新店」，不是模板店的业务数据，放行：
// 登录、注册、登出都不带 token（或不需要店铺数据），开沙箱写的是新店铺
const EXEMPT_PATHS = ['/api/login', '/api/register', '/api/logout', '/api/shops/sandbox'];

const templateGuard = (req, res, next) => {
  if (process.env.ALLOW_TEMPLATE_WRITE === '1') return next();
  if (!WRITE_METHODS.includes(req.method)) return next();
  if (EXEMPT_PATHS.includes(req.path)) return next();
  if (req.shopId !== TEMPLATE_SHOP_ID) return next();

  return res.status(403).json({
    success: false,
    message: '模板店是演示数据源，已禁止写入；本地维护素材请设置 ALLOW_TEMPLATE_WRITE=1 后重启服务'
  });
};

module.exports = templateGuard;
