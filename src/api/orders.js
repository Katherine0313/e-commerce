import axios from './request.js'

// 创建订单
export function addOrder(data) {
  return axios.post('/api/orders', data)
}

// 获取订单详情
export function getPendingOrderList(id) {
  return axios.get(`/api/orders/${id}`)
}

// 支付订单
export function addPaidOrder(id, data) {
  return axios.put(`/api/orders/${id}/pay`, data)
}

// 取消订单
export function cancelOrder(id) {
  return axios.put(`/api/orders/${id}/cancel`)
}

// 更新订单信息
export function updateOrder(id, data) {
  return axios.put(`/api/orders/${id}`, data)
}

// 获取全部订单
export function getAllOrders(params = {}) {
  return axios.get('/api/orders', { params })
}

// 获取订单状态常量
export function getOrderStatus() {
  return axios.get('/api/orders/status-constants')
}

// 获取订单详情（含明细）
export function getDetailOrders(id) {
  return axios.get(`/api/orders/${id}`)
}

// 获取快递公司列表
export function getCouriers() {
  return axios.get('/api/orders/couriers')
}

// 删除订单
export function deleteOrder(id) {
  return axios.delete(`/api/orders/${id}`)
}
// 批量删除订单
export function deleteOrders(ids){
  return axios.delete('/api/orders/batch-delete',{data:{ids}})
}
// 发货
export function shipOrder(id, data) {
  return axios.put(`/api/orders/${id}/ship`, data)
}
// 获取快递公司列表
export function getCourierList(){
  return axios.get('/api/orders/couriers')
}
// 获取物流轨迹
export function getLogistics(id) {
  return axios.get(`/api/orders/${id}/logistics`)
}
// 确认收款（pending_confirm → pending_ship）
export function confirmOrder(id) {
  return axios.put(`/api/orders/${id}/confirm`)
}
// 确认收货（shipped → finished）
export function finishOrder(id) {
  return axios.put(`/api/orders/${id}/finish`)
}