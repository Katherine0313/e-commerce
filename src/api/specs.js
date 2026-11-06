import axios from './request.js'

// ==================== 销售规格库（/api/admin/specs） ====================

// 规格名 + 候选值列表
export function getSpecLibrary() {
  return axios.get('/api/admin/specs')
}

// 新增规格名
export function addSpecGroup(data) {
  return axios.post('/api/admin/specs/groups', data)
}

// 修改规格名 / 启停
export function updateSpecGroup(id, data) {
  return axios.put(`/api/admin/specs/groups/${id}`, data)
}

// 删除规格名（被商品引用时后端会拦截）
export function deleteSpecGroup(id) {
  return axios.delete(`/api/admin/specs/groups/${id}`)
}

// 新增规格值
export function addSpecValue(data) {
  return axios.post('/api/admin/specs/values', data)
}

// 删除规格值
export function deleteSpecValue(id) {
  return axios.delete(`/api/admin/specs/values/${id}`)
}
