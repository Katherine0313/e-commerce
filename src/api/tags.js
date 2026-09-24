import axios from './request.js'

// 获取标签列表
export function getTagList() {
  return axios.get('/api/tags')
}

// 获取商品关联的标签
export function getProductTags(productId) {
  return axios.get(`/api/tags/products/${productId}/tags`)
}

// 更新标签
export function updateTag(id, data) {
  return axios.put(`/api/tags/${id}`, data)
}

// 给一个标签批量绑定商品
export function bindTag(tagId, product_ids) {
  return axios.post(`/api/tags/${tagId}/products`, { product_ids })
}

// 新增标签
export function addTag(data) {
  return axios.post('/api/tags', data)
}

// 获取标签关联的商品
export function getTagGoods(tagId) {
  return axios.get(`/api/tags/${tagId}/products`)
}

// 解绑单个商品标签
export function unbindTagGood(product_id, tagId) {
  return axios.delete(`/api/tags/products/${product_id}/tags/${tagId}`)
}

// 批量解绑标签下的商品
export function unbindTagGoods(tagId, product_ids) {
  return axios.delete(`/api/tags/${tagId}/products`, { data: { product_ids } })
}

// 删除标签
export function deleteTag(id) {
  return axios.delete(`/api/tags/${id}`)
}
