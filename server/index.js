// 0. 加载根目录 .env 文件中的环境变量（开发环境）
//    路径基于 __dirname 而不是 cwd：原来写的 '../.env' 是相对启动目录解析的，
//    从项目根目录执行 node server/index.js 时会指向项目外、静默加载失败，
//    于是 JWT_SECRET 落到兜底值 —— 同一个服务换个启动方式密钥就变了
const path = require('path');                // 处理文件路径
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 1. 导入需要的工具
const express = require('express'); // 后端核心框架（写接口、起服务全靠它）
const cors = require('cors');       // 解决跨域问题（让前端能访问后端）

// 2. 导入数据库模块
const { startup: openDB } = require('./sqlite');
const { ShopDB } = require('./sqlite/shopDB');                  // 店铺：沙箱回收
const { acquireSingleInstance } = require('./util/singleInstance'); // 单实例闸门：拒绝第二个进程
const accessLog = require('./middleware/accessLog');            // 全局：记录每个请求的方法/路径/状态码/耗时/shopId/IP
const resolveShop = require('./middleware/shop');               // 全局：解析当前请求属于哪个店铺
const templateGuard = require('./middleware/templateGuard');    // 全局：禁止写模板店（演示数据源）
const authRoutes = require('./routes/authRoutes');               // 登录/注册接口
const productRoutes = require('./routes/productRoutes');        // 商品增删改查接口
const uploadRoutes = require('./routes/uploadRoutes');          // 图片上传接口
const tagRoutes = require('./routes/tagRoutes');                // 标签接口
const categoryRoutes = require('./routes/categoryRoutes');     // 分类接口
const addressRoutes = require('./routes/addressRoutes');        // 收货地址接口
const orderRoutes = require('./routes/orderRoutes');           // 订单接口
const { sweepExpiredPendingPayOrders } = require('./controllers/orderController'); // 待付款超时自动关闭
const cartRoutes = require('./routes/cartRoutes');            // 购物车接口
const afterSalesRoutes = require('./routes/afterSalesRoutes'); // 售后接口
const stockRoutes = require('./routes/stockRoutes');           // 库存预警接口
const businessOnsaleRoutes = require('./routes/businessOnsaleRoutes'); // 促销活动接口
const shopRoutes = require('./routes/shopRoutes');             // 店铺（体验沙箱）接口

// 3. 创建后端应用实例
const app = express();
const PORT = process.env.PORT || 3000; // 后端运行在 3000 端口（可通过环境变量覆盖）

// 4. 配置跨域（允许前端访问后端）
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// 让 req.ip 读 X-Forwarded-For，取到 Nginx/CDN 后面的真实客户端 IP（访问日志要记这个）。
// ⚠️ 前提是服务本身不直接暴露公网；若哪天去掉反代直连，要撤掉这行
app.set('trust proxy', true);

// 5. 通用配置
app.use(express.json()); // 解析前端传过来的 JSON 数据
app.use(express.urlencoded({ extended: true })); // 解析表单数据

// 把 body-parser 抛出的 SyntaxError（空 body / 非法 JSON）转成 400，
// 避免被全局兜底吞掉、统一返回 500
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: '请求体不是合法的 JSON' });
  }
  next(err);
});
// 让上传的图片可以通过 /image/upload/ 和 /image/body/ 路径访问
app.use('/image/upload', express.static(path.join(__dirname, '..', 'public', 'image', 'upload')));
app.use('/image/body', express.static(path.join(__dirname, '..', 'public', 'image', 'body')));

// 规范化 URL：把 //api/foo 这种多斜杠的请求折叠成 /api/foo
// 客户端（Apifox、Postman、拼接 baseURL+path 时）经常因多余斜杠产生 404，这里兜底
app.use((req, res, next) => {
  // 保留协议头（http://）的开头双斜杠，只折叠 path 部分
  const collapsed = req.url.replace(/([^:\/])\/+/g, '$1/').replace(/^\/+/, '/');
  if (collapsed !== req.url) {
    req.url = collapsed;
  }
  next();
});

// 暴露 OpenAPI 文档供 Apifox 导入使用（手写 swagger.yml,直接还原最稳的格式）
app.get('/swagger.yml', (req, res) => {
  res.type('text/yaml').sendFile(path.join(__dirname, 'swagger.yml'));
});

// 6. 访问日志（必须在 resolveShop 之前）
//    挂在它前面才能记到 resolveShop 提前返回的 401；内容在响应发出后由
//    res.on('finish') 打印，那时 req.shopId 也已解析好
app.use(accessLog);

// 6.1 解析当前请求属于哪个店铺（必须在所有路由之前）
//    隔离键 shopId 只从 token 里取，解析结果注入 req.shopId 供 DB 层过滤。
//    公开 GET 接口（商品列表/分类/标签/库存……）没有 token，会落到模板店，
//    所以这批接口不需要另加登录校验也能正确按店铺过滤
app.use(resolveShop);

// 6.5 禁止写模板店（必须也在所有路由之前）
//     模板店是所有沙箱的数据源，而它的管理员密码是公开的演示凭据，
//     不挡的话任何人登进去都能把演示数据改脏，污染之后开出来的每一个沙箱
app.use(templateGuard);

// 7. 注册所有接口（总调度）
app.use('/api', authRoutes);              // 登录相关接口：/api/login...
app.use('/api/shops', shopRoutes);        // 店铺（体验沙箱）接口：/api/shops/...
app.use('/api/products', productRoutes);  // 商品接口：/api/products/...
app.use('/api/upload', uploadRoutes);     // 上传接口：/api/upload...
  app.use('/api/tags', tagRoutes);         // 标签接口：/api/tags...
  app.use('/api/categories', categoryRoutes); // 分类接口：/api/categories...
  app.use('/api/address', addressRoutes);  // 收货地址接口：/api/address...
  app.use('/api/orders', orderRoutes);    // 订单接口：/api/orders...
  app.use('/api/cart', cartRoutes);      // 购物车接口：/api/cart...
  app.use('/api/after-sales', afterSalesRoutes); // 售后接口：/api/after-sales
  app.use('/api/stock', stockRoutes);           // 库存预警接口：/api/stock......
  app.use('/api/business-onsale', businessOnsaleRoutes); // 促销活动接口

// 404 处理
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

// 8. 启动服务器！
async function startServer() {
  try {
    // 必须放在最前面：拿到单实例锁之前不许碰数据库。
    // 第二个实例如果在 openDB 之后才被拦住，它的首轮定时任务已经写过盘了
    acquireSingleInstance();

    await openDB();

    // 待付款订单超时自动关闭：启动时先扫一次，之后每 30 秒扫一次（超时 30 分钟未支付即软删除并释放库存）
    sweepExpiredPendingPayOrders();
    setInterval(sweepExpiredPendingPayOrders, 30 * 1000);

    // 过期沙箱回收：把 shops 里过期的体验店铺连同它的全部业务数据、上传文件一起清掉。
    // 必须跑在服务进程内 —— saveDatabase() 是整库覆盖写，外部脚本改的文件会被
    // 运行中的服务用内存副本盖掉（migrations 里的注释已警告过这一点）
    const sweepSandboxes = () => {
      try {
        ShopDB.sweepExpired();
      } catch (err) {
        // setInterval 里抛异常会直接终止进程，这里必须兜住
        console.error('[Shop] 回收过期沙箱失败:', err);
      }
    };
    sweepSandboxes();                                  // 启动时先扫一次
    setInterval(sweepSandboxes, 60 * 60 * 1000);       // 之后每小时扫一次

    // 只监听本机回环地址：后端不直接暴露公网，统一走 nginx 反代 /api、/image。
    // 这样即使云安全组漏放 3000 端口，外部也连不上（配合 trust proxy 取真实 IP）
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`Mock API server is running on http://localhost:${PORT}`);
      // 不在这里打印账号密码：上线后启动日志可能进入日志系统/截图/CI 输出，
      // 模板店凭据属于演示数据源，不该出现在日志里
      console.log('访客入口：POST /api/shops/sandbox（一键体验，自动开通独立沙箱店铺）');
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

startServer();