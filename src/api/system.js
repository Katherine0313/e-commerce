import axios from './request.js'

// ==================== 系统管理：管理员账号 ====================

export function getAdminUsers(params) {
  return axios.get('/api/admin/system/users', { params })
}

export function getAdminUser(id) {
  return axios.get(`/api/admin/system/users/${id}`)
}

export function addAdminUser(data) {
  return axios.post('/api/admin/system/users', data)
}

export function updateAdminUser(id, data) {
  return axios.put(`/api/admin/system/users/${id}`, data)
}

export function resetAdminPassword(id, password) {
  return axios.post(`/api/admin/system/users/${id}/reset-password`, { password })
}

// ==================== 系统管理：角色 ====================

export function getRoles() {
  return axios.get('/api/admin/system/roles')
}

export function getRole(id) {
  return axios.get(`/api/admin/system/roles/${id}`)
}

export function addRole(data) {
  return axios.post('/api/admin/system/roles', data)
}

export function updateRole(id, data) {
  return axios.put(`/api/admin/system/roles/${id}`, data)
}

export function deleteRole(id) {
  return axios.delete(`/api/admin/system/roles/${id}`)
}

export function assignRoleMenus(id, menuIds) {
  return axios.put(`/api/admin/system/roles/${id}/menus`, { menuIds })
}

// ==================== 系统管理：菜单树 ====================

// 角色分配用：仅启用菜单 + 按钮
export function getMenuTree() {
  return axios.get('/api/admin/system/menus/tree')
}

// ==================== 系统管理：菜单管理 ====================

// 管理页用：包含停用/隐藏/按钮
export function getMenuManageTree() {
  return axios.get('/api/admin/system/menus/manage-tree')
}

export function addMenu(data) {
  return axios.post('/api/admin/system/menus', data)
}

export function updateMenu(id, data) {
  return axios.put(`/api/admin/system/menus/${id}`, data)
}

export function deleteMenu(id) {
  return axios.delete(`/api/admin/system/menus/${id}`)
}
