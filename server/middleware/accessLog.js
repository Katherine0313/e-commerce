// ==================== HTTP 访问日志（全局中间件，必须挂在 resolveShop 之前） ====================
// 记录：时间、方法、原始路径(含 query)、状态码、耗时、shopId、来源 IP。
// 用 res.on('finish') 在响应真正发出后再打印：此时状态码、耗时已定，
// 且 resolveShop 早已把 req.shopId 写好；resolveShop 提前 401 的请求 shopId 为空，
// 日志里显示 '-'，正好能看出是谁没带有效 token。
module.exports = function accessLog(req, res, next) {
  const start = process.hrtime.bigint(); // 高精度计时（纳秒），比 Date.now() 准
  const method = req.method;
  const url = req.originalUrl;           // 用 originalUrl：req.url 可能被前面的折叠中间件改过
  const ip = req.ip;                     // 需配合 app.set('trust proxy', true) 才是真实客户端 IP

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const shopId = req.shopId || '-';
    console.log(
      `${new Date().toISOString()} ${method} ${url} ${res.statusCode} ${ms.toFixed(1)}ms shop=${shopId} ip=${ip}`
    );
  });

  next();
};
