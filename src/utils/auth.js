// ==================== 登录态 / 用户角色工具 ====================
// token 由后端 JWT 生成，payload 内含 { id, username, role }
// 前端只存了 token，没有单独存 role，这里直接从 token 里解析出来

import { getToken } from '@/utils/token';

/** 从 JWT token 中解析出当前登录用户信息 */
export function getCurrentUser() {
  try {
    const token = getToken()
    if (!token) return null
    const payload = token.split('.')[1]
    // base64url → base64（JWT 用 -_ 代替 +/）
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // 正确处理含中文的 payload（避免 atob 直接转成乱码）
    const json = decodeURIComponent(
      atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
    )
    return JSON.parse(json)
  } catch (e) {
    return null
  }
}

/** 当前登录用户是否为管理员（商家） */
export function isAdmin() {
  return getCurrentUser()?.role === 'admin'
}
