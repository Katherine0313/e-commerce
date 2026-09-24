// ==================== 依赖导入 ====================
const { UserDB: User } = require('../sqlite/userDB');     // 用户模型（SQLite版）：登录验证、注册用
const { ShopDB } = require('../sqlite/shopDB');           // 店铺：签发前确认账号所属店铺还在
const { signToken } = require('../util/jwt');             // JWT 签发（密钥统一在 util/jwt 管理）
const { getNow } = require('../sqlite/utils');
const { TEMPLATE_SHOP_ID } = require('../sqlite/shopTables');

// ==================== 认证控制器 ====================
const authController = {
  // 用户登录
  login: (req, res) => {
    try {
      const { username, password } = req.body;
      // 验证账号密码
      const user = User.validateCredentials(username, password);
      if (user) {
        // 账号所属店铺必须还在且未过期：沙箱被回收后，旧账号不能继续登录
        const shop = ShopDB.findById(user.shop_id);
        if (!shop) {
          return res.status(401).json({ success: false, message: '账号所属店铺不存在' });
        }
        if (shop.expires_at && shop.expires_at <= getNow()) {
          return res.status(401).json({ success: false, message: '体验店铺已过期，请重新体验' });
        }
        // 验证成功，生成 JWT token（shopId 是数据隔离键的唯一来源，必须签进去）
        const token = signToken({
          id: user.id,
          username: user.username,
          role: user.role,
          shopId: shop.id
        });
        res.json({
          success: true,
          data: {
            token,
            user: { id: user.id, username: user.username, name: user.name, role: user.role },
            shop: { id: shop.id, name: shop.name, expires_at: shop.expires_at }
          }
        });
      } else {
        res.status(401).json({ success: false, message: '用户名或密码错误' });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  },

  // 用户注册
  register: (req, res) => {
    try {
      const { username, password, phone } = req.body;
      console.log(`[Auth] 尝试注册: ${username}`);

      // 参数校验
      if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
      }
      if (!phone) {
        return res.status(400).json({ success: false, message: '手机号不能为空' });
      }

      // 检查用户名是否已存在
      const existingUser = User.findByUsername(username);
      if (existingUser) {
        console.log(`[Auth] 注册失败: 用户名已存在 (${username})`);
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }

      // 创建用户（保存到 SQLite 数据库）
      const newUser = User.create({ username, password, phone });
      console.log(`[Auth] 注册成功: ${username}`);

      // 注册用户没有自己的沙箱，落进模板店（保持注册接口原有行为，不在本次范围内改造）
      const token = signToken({
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        shopId: TEMPLATE_SHOP_ID
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: newUser.id,
            username: newUser.username,
            phone: newUser.phone,
            role: newUser.role
          }
        },
        message: '注册成功'
      });
    } catch (error) {
      console.error('[Auth] 注册接口错误:', error);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  },

  // 获取当前用户信息（需登录）
  getUserInfo: (req, res) => {
    // req.user 由 authMiddleware 中间件注入
    res.json({ success: true, data: req.user });
  },

  // 用户登出（前端删除 token 即可，后端无需处理）
  logout: (req, res) => {
    res.json({ success: true, message: '登出成功' });
  }
};

// 导出给 authRoutes.js 引入并注册路由
module.exports = authController;