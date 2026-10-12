import { getBase64 } from './file.js'

// 前端图片压缩：上传前把大图压到合理尺寸，避免列表/详情页直接加载原图卡顿
const MAX_EDGE = 1200 // 最长边上限（像素）
const QUALITY = 0.8   // 输出质量（jpeg）

/**
 * 压缩图片，返回 Promise<File>：
 * - 原图边长 <= MAX_EDGE、非图片、gif 动图 → 原样返回
 * - 压缩失败 → 兜底返回原图，保证上传不被中断
 */
export function compressImage(file) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return Promise.resolve(file)
  }
  return getBase64(file)
    .then(dataUrl => new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const { width, height } = img
        // 原图边长不超过限制，无需压缩
        if (Math.max(width, height) <= MAX_EDGE) {
          resolve(file)
          return
        }
        const scale = MAX_EDGE / Math.max(width, height)
        const w = Math.round(width * scale)
        const h = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          // 统一转 jpeg（商品图/详情图均为照片，jpeg 压缩率最佳）
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', QUALITY)
      }
      img.onerror = () => resolve(file)
      img.src = dataUrl
    }))
    .catch(() => file)
}
