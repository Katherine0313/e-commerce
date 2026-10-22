import axios from './request.js'

// ==================== 后台报表统计（admin，/api/admin/report） ====================

// 营业额卡片：period = yesterday | week | month
export function getTurnover(period) {
  return axios.get('/api/admin/report/turnover', { params: { period } })
}

// 营业额折线：period = week | month（昨日只有一天，前端不画折线）
export function getTurnoverReport(period) {
  return axios.get('/api/admin/report/turnover-report', { params: { period } })
}
