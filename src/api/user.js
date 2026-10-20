import axios from './request.js'

// 用户增长统计（后台工作台「用户增长」双折线）
export function getUserStatistics() {
  return axios.get('/api/admin/users/statistics')
}
