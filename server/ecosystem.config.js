// ==================== pm2 进程配置（腾讯云部署用） ====================
// 用法：
//   cd server
//   pm2 start ecosystem.config.js
//   pm2 save                       # 保存进程列表
//   pm2 startup                    # 生成开机自启脚本，按提示复制它打印的那行命令执行
//   pm2 logs stepin-api            # 看日志
//   pm2 restart stepin-api         # 重启（改了后端代码或 .env 之后）
//
// ⚠️ exec_mode 必须是 fork、instances 必须是 1 —— 绝不能改成 cluster 或多实例。
//    本项目的库是 sql.js「整库读进内存 + 整文件覆盖回写」，两个进程会互相覆盖写、
//    把库写坏（静默坏，不报错）。配置万一被改错，启动时还有 util/singleInstance
//    的 PID 锁兜底，第二个进程会直接拒绝启动
//
// ⚠️ 进程必须常驻：过期沙箱回收（每小时）、待付款订单超时关单（每 30 秒）
//    都跑在这个进程里，进程停了这些定时任务就停了 —— 过期沙箱会一直堆着占磁盘。
//    autorestart 就是为这个开的，别关
//
// 启动前确认 server 同级的 .env 已就位：至少要有 JWT_SECRET（缺了会拒绝启动），
// 且不要带 ALLOW_TEMPLATE_WRITE（带上就等于把模板店的写保护关了）
module.exports = {
  apps: [
    {
      name: 'stepin-api',
      script: 'index.js',
      cwd: __dirname,
      exec_mode: 'fork',        // 必须 fork，不能用 cluster
      instances: 1,             // 必须 1，多实例会写坏库
      autorestart: true,        // 崩了自动拉起，保证定时回收任务不断
      max_memory_restart: '1G', // 整库在内存 + 导出时翻倍，超过 1G 说明沙箱积太多了
      watch: false,             // 别开：热重载会瞬间起第二个进程
      merge_logs: true,
      time: true,               // 日志带时间戳，方便对着 401/429 排查
    },
  ],
};
