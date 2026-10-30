import axios from './request.js'

// ==================== 优惠券（后台管理，/api/admin/coupons） ====================

// 券列表（分页 + 名称/状态筛选）
export function getCouponList(params) {
  return axios.get('/api/admin/coupons', { params })
}

// 券详情（含适用范围、领取/使用统计）
export function getCouponDetail(id) {
  return axios.get(`/api/admin/coupons/${id}`)
}

// 新建优惠券
export function addCoupon(data) {
  return axios.post('/api/admin/coupons', data)
}

// 编辑优惠券（仅未开始发放）
export function updateCoupon(id, data) {
  return axios.put(`/api/admin/coupons/${id}`, data)
}

// 停止发放
export function stopCoupon(id) {
  return axios.post(`/api/admin/coupons/${id}/stop`)
}

// 删除（仅未开始且无人领取）
export function deleteCoupon(id) {
  return axios.delete(`/api/admin/coupons/${id}`)
}

// 定向 / 全量发券
export function grantCoupon(id, data) {
  return axios.post(`/api/admin/coupons/${id}/grant`, data)
}

// 领取/使用记录
export function getCouponRecords(id, params) {
  return axios.get(`/api/admin/coupons/${id}/records`, { params })
}
