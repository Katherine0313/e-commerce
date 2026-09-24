// ==================== JWT 密钥与签发 ====================
// 密钥优先从环境变量 JWT_SECRET 读取；读不到时落到下方兜底值，保证新设备
// 拉完代码、还没建 .env 也能直接启动（本地开发/演示的便利性优先）。
// ⚠️ 兜底值写死在代码里、随仓库分发，等于公开密钥 —— 生产部署务必显式配置
//    JWT_SECRET（.env），沙箱隔离的安全性建立在「token 是服务端签的、密钥不可猜」上，
//    用兜底值上线等于没有隔离。
const jwt = require('jsonwebtoken');

// 开发兜底密钥：只为让新设备免配置启动，不要用于生产环境
const FALLBACK_SECRET = 'stepin-template-dev-only-secret-8f2b6c1e9d4a7f3b';

const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_SECRET;

/**
 * 签发 token
 * 有效期 7 天：到期后前端收到 401 会退回登录页重新登录/重新体验。
 * 沙箱本身仍由 shops.expires_at（24 小时）决定生命周期，token 过期是额外兜底
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/** 校验 token，失败返回 null（不抛异常，由调用方统一转成 401） */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = { JWT_SECRET, signToken, verifyToken };
