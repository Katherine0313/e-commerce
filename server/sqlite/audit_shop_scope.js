// ==================== 店铺隔离审计：找出所有「碰了业务表却没带 shop_id」的 SQL ====================
// 执行方式：在 server 目录下执行 node sqlite/audit_shop_scope.js
//          （在项目根目录则执行 node server/sqlite/audit_shop_scope.js）
//
// 为什么需要它：给十几张表全量补 shop_id 谓词，最大的风险不是写错，而是**漏写**。
// 漏写不会报错，只会让别的沙箱的数据静默出现在你的列表里，靠人工抽查几乎不可能发现。
// 所以这里把所有 SQL 字符串抠出来逐条机械核对：只要 FROM/UPDATE/INSERT/DELETE/JOIN
// 碰到了 SHOP_TABLES 里的表，就必须在同一段 SQL 里出现 shop_id。
//
// 用法：改完 DB 层跑一遍，输出为空（或只剩白名单）才算过关
const fs = require('fs');
const path = require('path');
const { SHOP_TABLES } = require('./shopTables');

const SERVER_DIR = path.join(__dirname, '..');

// 整个文件都不参与审计的：
//   shopDB.js       —— 克隆/回收引擎，本来就是跨店铺操作（它按 shop_id 显式筛选，但不是每句都带）
//   shopTables.js   —— 只有常量，没有 SQL
//   audit_shop_scope.js —— 本文件
//   migrations/     —— 历史迁移，一次性脚本，不参与运行时查询
const SKIP_FILES = new Set(['shopDB.js', 'shopTables.js', 'audit_shop_scope.js']);
const SKIP_DIRS = new Set(['node_modules', 'migrations', '.git']);

// 按设计就该全局查（无法也不该带 shop_id）的 SQL 片段，归一化后逐条匹配
//   users 的登录/注册查询：登录时必须先按用户名把人找出来，才知道他属于哪个店铺 ——
//   这是「先有用户后有店铺」的固有顺序，不是漏加谓词
const WHITELIST = [
  { re: /^SELECT \* FROM users WHERE username = \?$/i, why: '登录按用户名查人（此时还不知道 shopId）' },
  { re: /^SELECT \* FROM users WHERE username = \? AND password = \?$/i, why: '登录校验账号密码（同上）' },
];

const TABLES = SHOP_TABLES.map(t => t.table);

/**
 * 抠出 JS 源码里的所有字符串字面量（'…' "…" `…`），带起始行号
 * 用 + 拼接的相邻字面量会合并成一条（项目里 SQL 常写成 'a' + 'b' + 'c' 的多行拼接，
 * 不合并的话片段会被当成独立语句，产生大量假阳性）
 */
function extractLiterals(code) {
  const out = [];
  let i = 0;
  let line = 1;
  /** 从索引 pos 起跳过空白与注释，返回新索引（同时推进行号，用闭包外的 line 不方便，这里返回行增量） */
  const skipGap = (pos) => {
    while (pos < code.length) {
      if (code[pos] === '\n') { line++; pos++; continue; }
      if (/\s/.test(code[pos])) { pos++; continue; }
      if (code[pos] === '/' && code[pos + 1] === '/') {
        while (pos < code.length && code[pos] !== '\n') pos++;
        continue;
      }
      if (code[pos] === '/' && code[pos + 1] === '*') {
        pos += 2;
        while (pos < code.length && !(code[pos] === '*' && code[pos + 1] === '/')) {
          if (code[pos] === '\n') line++;
          pos++;
        }
        pos += 2;
        continue;
      }
      break;
    }
    return pos;
  };

  while (i < code.length) {
    const ch = code[i];
    if (ch === '\n') { line++; i++; continue; }
    if (ch === '/' && (code[i + 1] === '/' || code[i + 1] === '*')) {
      i = skipGap(i);
      continue;
    }
    if (ch !== "'" && ch !== '"' && ch !== '`') { i++; continue; }

    const startLine = line;
    let buf = '';
    let isTemplate = false;
    let pos = i;
    // 反复读取「字面量 + 空白 + 加号 + 空白 + 字面量」直到不再相接
    for (;;) {
      const quote = code[pos];
      if (quote === '`') isTemplate = true;
      let j = pos + 1;
      while (j < code.length) {
        if (code[j] === '\\') { buf += code[j] + (code[j + 1] || ''); j += 2; continue; }
        if (code[j] === quote) break;
        if (code[j] === '\n') line++;
        buf += code[j];
        j++;
      }
      let next = skipGap(j + 1);
      if (code[next] !== '+') { i = j + 1; break; }
      next = skipGap(next + 1);
      if (next >= code.length || (code[next] !== "'" && code[next] !== '"' && code[next] !== '`')) {
        i = j + 1;
        break;
      }
      pos = next;
    }
    out.push({ line: startLine, text: buf, template: isTemplate });
  }
  return out;
}

/** 递归收集待审文件（排除 node_modules / migrations 等） */
function collectFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      collectFiles(path.join(dir, e.name), acc);
    } else if (e.name.endsWith('.js') && !SKIP_FILES.has(e.name)) {
      acc.push(path.join(dir, e.name));
    }
  }
  return acc;
}

const files = collectFiles(SERVER_DIR);
const findings = [];
let scanned = 0;
let flagged = 0;

for (const file of files) {
  const rel = path.relative(SERVER_DIR, file).replace(/\\/g, '/');
  const code = fs.readFileSync(file, 'utf8');
  for (const lit of extractLiterals(code)) {
    const sql = lit.text;
    // 只审看起来是 SQL 的字面量
    if (!/\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(sql)) continue;

    // 这段 SQL 碰到了哪些业务表
    const touched = [];
    for (const t of TABLES) {
      // 匹配 FROM/JOIN/UPDATE/INTO/DELETE FROM 后面紧跟的表名，避免命中普通词
      const re = new RegExp(`\\b(?:FROM|JOIN|UPDATE|INTO)\\s+${t}\\b`, 'i');
      if (re.test(sql)) touched.push(t);
    }
    if (!touched.length) continue;
    scanned++;

    // 只有一个表名做占位符、真实表名是变量拼进去的（nextIdInShop）无法静态判断，跳过
    if (/\$\{/.test(sql) && touched.length === 1 && /\$\{\s*\w*\s*\}/.test(sql)) continue;

    // 带 shop_id 谓词的直接放过
    if (/shop_id/i.test(sql)) continue;

    const norm = sql.replace(/\s+/g, ' ').trim();
    const wl = WHITELIST.find(w => w.re.test(norm));
    if (wl) { continue; }

    flagged++;
    findings.push({ file: rel, line: lit.line, tables: touched, sql: norm });
  }
}

console.log(`[审计] 扫描 ${files.length} 个文件，含业务表引用的 SQL 片段 ${scanned} 段`);
if (!findings.length) {
  console.log('[审计] ✓ 未发现「碰了业务表却没带 shop_id 谓词」的 SQL');
  process.exit(0);
}

console.log(`[审计] ✗ 发现 ${flagged} 段 SQL 引用了业务表但没有任何 shop_id 谓词：\n`);
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  [${f.tables.join(', ')}]`);
  console.log(`    ${f.sql.length > 220 ? f.sql.slice(0, 220) + ' …' : f.sql}\n`);
}
console.log('说明：白名单在 audit_shop_scope.js 的 WHITELIST 里（目前只有「登录按用户名查 users」这一种）；');
console.log('      如果某条确实应当全局查，请连同理由加进白名单，不要直接忽略。');
process.exit(1);
