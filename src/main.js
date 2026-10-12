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
