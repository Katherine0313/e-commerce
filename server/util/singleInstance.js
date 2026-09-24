// ==================== 单实例闸门 ====================
// 本项目的数据库是 sql.js：整库读进内存，每次写入都把全库导出再覆盖写回文件。
// 两个进程同时跑 = 两份内存副本互相覆盖写，库必坏，而且是静默坏（不报错、只丢数据）。
//
// pm2 里配 fork / instances: 1 是配置层的约定，这里再加一道代码层的闸门：
// 用 PID 锁文件互斥，发现已经有一个活着的实例就直接拒绝启动。
//
// 为什么不能只靠「端口被占用」兜底：index.js 里 openDB() 之后、listen() 之前
// 要先跑两个定时任务的首轮（超时关单、回收过期沙箱），那两个都是写库操作 ——
// 第二个实例会在「端口冲突报错退出」之前就已经写过盘了。
const fs = require('fs');
const path = require('path');

// 锁文件放在数据库旁边：锁的就是这个库
const LOCK_PATH = path.join(__dirname, '..', 'sqlite', 'database.lock');

/** 进程是否还活着。EPERM 表示进程存在但没权限给它发信号，同样算活着 */
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

/** 释放锁。只删自己那一把，避免误删别人的 */
function release() {
  try {
    if (Number(fs.readFileSync(LOCK_PATH, 'utf8').trim()) === process.pid) {
      fs.unlinkSync(LOCK_PATH);
    }
  } catch (err) {
    // 文件已经不在了就算了
  }
}

function acquireSingleInstance() {
  if (fs.existsSync(LOCK_PATH)) {
    const pid = Number(fs.readFileSync(LOCK_PATH, 'utf8').trim());
    if (Number.isSafeInteger(pid) && pid !== process.pid && isAlive(pid)) {
      throw new Error(
        `检测到另一个服务实例正在运行（PID ${pid}），拒绝启动。\n` +
        `本项目的库是「整库在内存 + 整文件覆盖回写」，两个实例同时跑会互相覆盖写、把库写坏。\n` +
        `先停掉旧实例（pm2 restart 或 kill ${pid}）；确认它真的不在了，删掉锁文件 ${LOCK_PATH} 再启动`
      );
    }
    // 锁里的 PID 已经死了（上次被强杀、断电留下的僵尸锁），直接接管
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));

  // 正常退出、pm2 停止/重启、Ctrl+C 都会经过这里把锁带走；
  // SIGKILL 不走，靠下次启动那句「PID 已死则接管」兜底
  process.on('exit', release);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      release();
      process.exit(0);
    });
  }
}

module.exports = { acquireSingleInstance };
