import axios from './request.js'

// ==================== 系统监控 ====================

export function getServerOverview() {
  return axios.get('/api/admin/monitor/server')
}

export function getOnlineUsers(params) {
  return axios.get('/api/admin/monitor/online', { params })
}

export function forceLogout(adminId) {
  return axios.delete(`/api/admin/monitor/online/${adminId}`)
}

export function getCacheOverview() {
  return axios.get('/api/admin/monitor/cache/overview')
}

export function getCacheKeys(params) {
  return axios.get('/api/admin/monitor/cache/keys', { params })
}

// 列表只返回脱敏 key，完整值按 token 单独获取（需 monitor:cache:key:view）
export function revealCacheKey(token) {
  return axios.get('/api/admin/monitor/cache/key', { params: { token } })
}

export function deleteCacheKey(token) {
  return axios.delete('/api/admin/monitor/cache/key', { params: { token } })
}

// ==================== 定时任务 ====================

export function getMonitorTasks(params) {
  return axios.get('/api/admin/monitor/tasks', { params })
}

export function createMonitorTask(data) {
  return axios.post('/api/admin/monitor/tasks', data)
}

export function updateMonitorTask(id, data) {
  return axios.put(`/api/admin/monitor/tasks/${id}`, data)
}

export function deleteMonitorTask(id) {
  return axios.delete(`/api/admin/monitor/tasks/${id}`)
}

export function changeMonitorTaskStatus(id, status) {
  return axios.put(`/api/admin/monitor/tasks/${id}/status`, null, { params: { status } })
}

export function getMonitorTaskLogs(id, params) {
  return axios.get(`/api/admin/monitor/tasks/${id}/logs`, { params })
}

export function runMonitorTask(name) {
  return axios.post(`/api/admin/monitor/tasks/${name}/run`)
}
