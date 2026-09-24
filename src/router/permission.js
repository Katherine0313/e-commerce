// ==================== 导入路由实例 ====================
// 必须导入 同目录下routes.js 导出的同一个 router 实例
// 否则 beforeEach 守卫无法生效（守卫必须注册在使用的实例上）
import router from "./index.js"
import { getToken } from '@/utils/token'

/**
 * 路由全局守卫(beforeEach:在每次路由跳转之前执行)
 * 作用：实现登录权限控制，防止未登录用户访问需要权限的页面
 */
router.beforeEach((to, from, next) => {
    // 从 localStorage 读取 token
    // token是用户登录成功后的身份凭证
    const token = getToken()
    // 1. 如果用户已经登录(有token)，并且访问的是登录页
    // 强制跳转到工作台页，不让已登录的用户重复登录
    if(to.name === 'Login' && token){
        next('/workplace')
    }
    // 2.如果页面需要登录权限(meta.isLogin = true),但是用户没有token
    // 拦截跳转，强制回到登录页
    else if(to.meta.isLogin && !token){
        next('/front/login')
    }
    // 3.其他所有正常情况
    // 不需要登录的页面 / 已登录且访问有权限的页面 → 直接放行
    else {
        next()
    }
})
