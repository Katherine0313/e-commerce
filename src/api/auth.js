import axios from './request.js'

// 登录
export function login(data) {
  return axios.post('/api/login', data)
}

// 退出登录
export function logout() {
  return axios.post('/api/logout')
}

// 发送手机登录验证码（开发环境后端会回传 devCode，方便本机联调）
export function sendSmsCode(data) {
  return axios.post('/api/auth/sms-code', data)
}

// 手机号 + 验证码登录
export function loginByPhone(data) {
  return axios.post('/api/auth/phone-login', data)
}
