import axios from './request.js'

// 登录
export function login(data) {
  return axios.post('/api/login', data)
}

// 退出登录
export function logout() {
  return axios.post('/api/logout')
}
