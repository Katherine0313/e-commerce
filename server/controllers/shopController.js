// ==================== 店铺（体验沙箱）控制器 ====================
const { ShopDB } = require('../sqlite/shopDB');
const { signToken } = require('../util/jwt');
const { SANDBOX_PER_IP_LIMIT } = require('../sqlite/shopTables');

// 同 IP 开通沙箱的频次限制：内存计数即可。
// 重启服务会让计数清零，但重启本身就是一道闸门（何况还有 SANDBOX_ACTIVE_LIMIT 总量兜底），
// 为这点小事建表不划算
const WINDOW_MS = 60 * 60 * 1000; // 1 小时
const ipHits = new Map();

/** 超过阈值就返回 true（并把计数继续往上加，防止绕开窗口边界） */
function isRateLimited(ip) {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || now - rec.start >= WINDOW_MS) {
    // 顺手清理过期的记录，避免这个 Map 无限增长
    if (ipHits.size > 500) {
      for (const [k, v] of ipHits) {
        if (now - v.start >= WINDOW_MS) ipHits.delete(k);
      }
    }
    ipHits.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count++;
  return rec.count > SANDBOX_PER_IP_LIMIT;
}

const shopController = {
  // 一键体验：开一个只属于本次访客的沙箱店铺，并直接签发管理员 token
  // 公开接口，不需要登录。每次都开全新的店铺（不复用旧沙箱）
  createSandbox: (req, res) => {
    try {
      const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
      if (isRateLimited(ip)) {
        return res.status(429).json({ success: false, message: '体验店铺开得太频繁了，请稍后再试' });
      }

      const { shop, userId, username } = ShopDB.createSandbox();

      // 沙箱管理员：克隆出来的那个模板 admin，权限与原 admin 完全一致，
      // 但 id 和 shopId 都是本店号段内的，天然只能操作本店数据
      const token = signToken({ id: userId, username, role: 'admin', shopId: shop.id });

      res.json({
        success: true,
        data: {
          token,
          user: { id: userId, username, name: '管理员', role: 'admin' },
          shop: { id: shop.id, name: shop.name, expires_at: shop.expires_at }
        },
        message: '体验店铺已开通'
      });
    } catch (error) {
      console.error('[Shop] 开通体验店铺失败:', error);
      // 自己主动抛的错（名额满 429、号段异常）带 status，可以原样告诉前端；
      // 其它异常一律给通用文案，不把内部细节抛给调用方
      const status = error.status || 500;
      res.status(status).json({
        success: false,
        message: status === 500 ? '体验店铺开通失败，请稍后再试' : error.message
      });
    }
  },

  // 当前店铺信息：供前端顶栏/店铺卡片展示沙箱店名和剩余有效期
  getCurrentShop: (req, res) => {
    const shop = req.shop;
    res.json({
      success: true,
      data: {
        id: shop.id,
        name: shop.name,
        is_template: !!shop.is_template,
        created_at: shop.created_at,
        expires_at: shop.expires_at
      }
    });
  }
};

module.exports = shopController;
