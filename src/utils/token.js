// ==================== token 存取工具 ====================
// token 由后端 JWT 生成，前端只负责存取，不依赖 pinia
// 统一封装 localStorage，key 为 'token'

const TOKEN_KEY = 'token'

/** 读取 token（未登录时返回 null） */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/** 写入 token；传空值等价于清除 */
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/** 清除 token（登出用） */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}
