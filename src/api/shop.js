import axios from './request.js'

// 开通体验沙箱店铺（公开接口，不需要登录）
export function createSandbox() {
  return axios.post('/api/shops/sandbox')
}

// 获取当前店铺信息
export function getCurrentShop() {
  return axios.get('/api/shops/current')
}
