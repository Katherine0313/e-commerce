import axios from './request.js'

// 获取库存预警列表（支持 ?search= 商品名模糊搜索）
export function getStockList(params) {
  return axios.get('/api/stock',{params})
}

// 获取库存状态常量（high/normal/low 的中文与颜色），前端启动时调用一次
export function getStockStatus() {
  return axios.get('/api/stock/status-constants')
}

// 创建库存预警
export function createStock(data) {
  return axios.post('/api/stock', data)
}
