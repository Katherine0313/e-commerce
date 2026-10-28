// 浏览器访客标识：仅用于 /api/shops/sandbox 在 24h 内复用同一家体验店。
// 与登录 token 完全独立：退出登录、401、店铺过期都只清 'token'，不会动这个 key。

const STORAGE_KEY = 'sandbox_visitor_key'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// localStorage 不可用时的兜底：同一页面内保持稳定
let memoryKey = null

function createUuid() {
  const c = globalThis.crypto

  // 安全上下文（https / localhost）优先用原生方法
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID().toLowerCase()
    } catch (e) {
      // 非安全上下文等，继续走 getRandomValues
    }
  }

  // http 局域网 IP 等非安全上下文：getRandomValues 仍可用
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'))
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join('')
    ].join('-')
  }

  // 极老浏览器兜底：格式仍是 UUID v4，只用于演示身份，不要求密码学强度
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** 读取/生成访客标识；localStorage 不可用时退化为当前页面内存 */
export function getSandboxVisitorKey() {
  if (memoryKey) return memoryKey

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && UUID_RE.test(saved)) {
      memoryKey = saved.toLowerCase()
      return memoryKey
    }
    memoryKey = createUuid()
    localStorage.setItem(STORAGE_KEY, memoryKey)
    return memoryKey
  } catch (e) {
    // 隐私模式/禁用存储：同一页面内仍保持稳定，刷新后会重新开一家
    memoryKey = createUuid()
    return memoryKey
  }
}
