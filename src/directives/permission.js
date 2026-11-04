import { hasPermi } from '@/utils/auth'

/**
 * 按钮级权限指令：v-permission="'order:order:ship'"
 *
 * 无权限时不再把按钮从 DOM 移除，而是保留按钮、置灰禁用并阻止点击：
 * 只读账号能看到完整界面（列宽、操作列不会缺一块），但改不了数据。
 * 真正的拦截仍由后端 @RequirePerm 完成。
 */
export default {
  mounted(el, binding) {
    applyIfNoPermission(el, binding.value)
  },
  updated(el, binding) {
    applyIfNoPermission(el, binding.value)
  },
}

function applyIfNoPermission(el, perm) {
  if (!perm || hasPermi(perm)) return
  const target = el.tagName === 'BUTTON' ? el : el.querySelector('button') || el
  if (target.disabled) return
  target.disabled = true
  target.classList.add('perm-disabled')
  target.setAttribute('title', '无权限，仅可查看')
  // 兜底：非原生 button 元素也能拦截点击
  el.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
  }, true)
}
