import axios from './request.js'
import {getSandboxVisitorKey} from '@/utils/sandboxVisitor'

const SANDBOX_VISITOR_HEADER = 'X-Sandbox-Visitor-Key'

// 开通/恢复体验沙箱店铺（公开接口，不需要登录）
// 带上浏览器持久化的访客标识：后端 24h 内命中未过期沙箱时复用，否则新建
export function createSandbox() {
  return axios.post('/api/shops/sandbox', null, {
    headers: {[SANDBOX_VISITOR_HEADER]: getSandboxVisitorKey()}
  })
}

// 获取当前店铺信息（后台管理端，admin 令牌）
export function getCurrentShop() {
  return axios.get('/api/admin/shops/current')
}
