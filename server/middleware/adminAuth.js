// 管理员权限验证中间件
// 依赖：必须先经过 authMiddleware，req.user 已被注入
const adminAuthMiddleware = (req, res, next) => {
  // 校验：登录用户不是管理员，拒绝访问
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限操作，仅管理员可执行' });
  }
  // 校验通过，放行请求
  next();
};

// 导出中间件，供路由使用
module.exports = adminAuthMiddleware;