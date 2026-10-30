import { hasPermi } from '@/utils/auth'

/**
 * 按钮级权限指令：v-permission="'order:order:ship'"
 * 无权限时直接从 DOM 移除；后端仍会做最终校验。
 */
export default {
  mounted(el, binding) {
    if (binding.value && !hasPermi(binding.value)) {
      el.parentNode && el.parentNode.removeChild(el)
    }
  },
}
