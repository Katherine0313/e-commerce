import axios from './request.js'

// ==================== 商品 ====================

// 获取商品列表
export function getGoodsList(params) {
  return axios.get('/api/products', { params })
}

// 添加商品
export function addGoods(data) {
  return axios.post('/api/products', data)
}

// 删除商品
export function deleteGoods(id) {
  return axios.delete(`/api/products/${id}`)
}

// 编辑商品
export function updateGoods(id, data) {
  return axios.put(`/api/products/${id}`, data)
}

// 获取商品品牌列表
export function getBrandList() {
  return axios.get('/api/products/brands')
}

// 获取单个商品详情
export function getGoodsDetail(id) {
  return axios.get(`/api/products/${id}`)
}

// 工作台聚合统计：{ totalProducts, totalStock, totalValue, products }（需登录）
export function getDashboard() {
  return axios.get('/api/products/dashboard')
}

// ==================== 分类 ====================

// 获取商品分类树
export function getCategoryTree() {
  return axios.get('/api/categories')
}

// 更新商品分类
export function updateCategoryTree(id, data) {
  return axios.put(`/api/categories/${id}`, data)
}

// 新增商品分类
export function addCategory(data) {
  return axios.post('/api/categories', data)
}

// 移动商品分类
export function moveCategory(id, direction) {
  return axios.post(`/api/categories/${id}/move`, { direction })
}

// 获取商品扁平分类
export function getCategoryFlat() {
  return axios.get('/api/categories/flat')
}

// 删除商品分类
export function deleteCategory(id) {
  return axios.delete(`/api/categories/${id}`)
}
