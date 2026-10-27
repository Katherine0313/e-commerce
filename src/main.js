import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
// 导入路由权限守卫（登录/权限控制）
import './router/permission'
import stepin from 'stepin/es';
// 导入Pinia实例（已在 store/pinia.js 中注册持久化插件）
import pinia from '@/store/pinia';
// import '@/mock';
// 生产打包时可去除 ant-design-vue/dist/antd.variable.less 的引用。
// 开发引入此包是为了加载优化，防止首次打开页面过慢
import 'ant-design-vue/dist/antd.variable.less';
import 'stepin/es/style';
// import 'default-passive-events';
import '@/theme/index.less';
import { AuthPlugin, IconfontPlugin } from '@/plugins';
import lazy from '@/directives/lazy';
const app = createApp(App);
// 注册图片懒加载指令 v-lazy（用于列表缩略图，避免全量请求）
app.directive('lazy', lazy);

// 注册Pinia到Vue应用
app.use(pinia)
// 注册路由到Vue应用
app.use(router);
app.use(stepin, { router });
app.use(AuthPlugin, { action: 'disable' });
// iconfont 插件。url为你的 iconfont 图标资源地址（你的iconfont 仓库可获取此地址）
app.use(IconfontPlugin, {
  url: '//at.alicdn.com/t/c/font_3805284_ulvha6ct7d.js',
});
app.config.errorHandler = function (err) {
  console.error('未捕获的异常，', err);
};
app.mount('#stepin-app');

// 首屏加载层：等首条路由解析完成（页面真正可渲染）后再淡出，避免白屏闪烁
const bootLoader = document.getElementById('boot-loader');
let bootHidden = false;
function hideBootLoader() {
  if (bootHidden || !bootLoader) return;
  bootHidden = true;
  bootLoader.classList.add('is-done');
  setTimeout(() => bootLoader.remove(), 260);
}
router
    .isReady()
    .then(() => {
      // 等两帧，确保首屏内容已经绘制到屏幕上
      requestAnimationFrame(() => requestAnimationFrame(hideBootLoader));
    })
    .catch(hideBootLoader);
// 兜底：极端情况下也不让加载层一直挡着（正常 1 秒内就会淡出）
setTimeout(hideBootLoader, 15000);
