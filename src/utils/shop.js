// ==================== 当前店铺（沙箱）信息 ====================
// 顶栏、商品预览/购物车/结算里的店铺卡片都要显示店名，用模块级 ref 共享，
// 避免同一个页面里重复请求。
// 注意：点「一键体验」会换到新店铺，所以换完 token 要调 loadShop(true) 强制重拉
import {ref} from 'vue'
import {getCurrentShop} from '@/api/shop.js'
import {getToken} from '@/utils/token'

/** 当前店铺：{ id, name, isTemplate, createdAt, expiresAt }，拉不到时为 null */
export const shop = ref(null)

// 进行中的请求，防止多个组件同时挂载时重复发请求
let pending = null

/** 拉取当前店铺信息写入 shop；force 为 true 时忽略缓存（换店铺后必须强制重拉） */
export function loadShop(force) {
  if (!getToken()) {
    shop.value = null
    return Promise.resolve(null)
  }
  if (!force && (shop.value || pending)) {
    return pending || Promise.resolve(shop.value)
  }
  pending = getCurrentShop()
      .then(res => {
        shop.value = res.data.success ? res.data.data : null
        return shop.value
      })
      .catch(() => {
        // 拉不到（未登录/已过期）就不显示店铺信息，不影响页面其余部分
        shop.value = null
        return null
      })
      .finally(() => {
        pending = null
      })
  return pending
}

/** 剩余有效期文案（模板店永不过期，返回空串）；expiresAt 是 'yyyy-MM-dd HH:mm:ss' 字符串 */
export function expireText() {
  if (!shop.value || !shop.value.expiresAt) return ''
  const left = new Date(shop.value.expiresAt.replace(' ', 'T')).getTime() - Date.now()
  if (left <= 0) return '已过期'
  const hours = Math.floor(left / 3600000)
  const minutes = Math.floor((left % 3600000) / 60000)
  return hours > 0 ? `剩余 ${hours} 小时 ${minutes} 分` : `剩余 ${minutes} 分钟`
}
