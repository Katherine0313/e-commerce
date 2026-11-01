<template>
  <stepin-view
      :class="{ 'is-mobile': isMobile, 'mobile-drawer-open': drawerOpen }"
      system-name="杰米多多"
      logo-src="@/assets/vite.svg"
      :user="user"
      :menuList="menuList"
      :nav-mode="navMode"
      :collapsed="effectiveCollapsed"
      :themeList="themeList"
      v-model:show-setting="showSetting"
      @themeSelect="configTheme"
      @update:collapsed="onCollapsedChange"
  >
    <template #headerActions>
      <HeaderActions @showSetting="showSetting = true" />
    </template>
    <template #footer>
      <PageFooter />
    </template>
    <template #themeEditorTab>
      <a-tab-pane tab="其它" key="other">
        <Setting />
      </a-tab-pane>
    </template>
  </stepin-view>
  <!-- 手机抽屉遮罩：放在 stepin-view 外，避免被布局的 overflow 裁掉 -->
  <div
    v-if="isMobile && drawerOpen"
    class="mobile-drawer-mask"
    @click="closeDrawer"
  ></div>
  <login-modal :unless="['/login']" />
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import avatar from '@/assets/avatar/zongjie.webp';
import {HeaderActions, PageFooter} from '@/components/layout';
import Setting from './components/setting';
import {LoginModal} from '@/pages/login';
import {configTheme, themeList} from '@/theme';
import {getToken, removeToken} from '@/utils/token';
import {logout} from '@/api/auth.js';
import {getCurrentUser} from '@/utils/auth';
import {connectOrderNotify, disconnectOrderNotify} from '@/utils/orderNotify';
import {shop} from '@/utils/shop';
import {useIsMobile} from '@/composables/useMediaQuery';
import {StepinView} from "stepin";

const navMode = ref('side');
// const useTabs = ref(false);
const showSetting = ref(false);
const router = useRouter();
const route = useRoute();
// 手机断点（≤767px）
const isMobile = useIsMobile();
// 桌面侧栏折叠状态；stepin 只有 64px 图标态，没有隐藏态
const collapsed = ref(false);
// 手机抽屉状态：与 collapsed 分开管理，抽屉里要显示完整菜单
const drawerOpen = ref(false);
const effectiveCollapsed = computed(() =>
    isMobile.value ? false : collapsed.value
);

// 顶栏 trigger 点击：手机开关抽屉，桌面走原有折叠
const onCollapsedChange = (val) => {
  if (isMobile.value) {
    drawerOpen.value = !drawerOpen.value;
    return;
  }
  collapsed.value = val;
};
const closeDrawer = () => {
  drawerOpen.value = false;
};

// 路由切换、放大回桌面时自动收起抽屉
watch(() => route.fullPath, closeDrawer);
watch(isMobile, (mobile) => {
  if (!mobile) closeDrawer();
});

// ESC 关闭抽屉
const onKeydown = (e) => {
  if (e.key === 'Escape') closeDrawer();
};
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

// 已登录（刷新页面）则自动建连来单提醒
onMounted(() => {
  if (getToken()) {
    connectOrderNotify()
  }
});

// 账号文案（单店模式，没有店铺有效期）
const accountTitle = () => getCurrentUser()?.username || '未登录';

// 当前登录信息（token 存在 sessionStorage，路由切换后重新解析，驱动菜单刷新）
const currentUser = ref(getCurrentUser());
watch(() => route.fullPath, () => {
  currentUser.value = getCurrentUser();
}, { immediate: true });

// 菜单过滤：按 meta.permission 和 renderMenu 生成 stepin 需要的菜单树
function canUse(user, permission) {
  if (!permission) return true;
  // 历史 token 可能缺少 permissions 字段，兜底成空数组避免报错
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.includes('*:*:*') || permissions.includes(permission);
}

function joinPath(base, path) {
  if (!path) return base || '/';
  if (path.startsWith('/')) return path;
  return (base.endsWith('/') ? base : base + '/') + path;
}

function buildMenu(routes, basePath, user) {
  const list = [];
  (routes || []).forEach((item) => {
    if (item.meta?.renderMenu === false) return;
    const fullPath = joinPath(basePath, item.path);
    const children = buildMenu(item.children, fullPath, user);
    const allowed = canUse(user, item.meta?.permission);
    // 有子路由但全部被过滤掉时，父目录也不再显示
    if (item.children?.length && !children.length) return;
    // 页面本身没权限则整项隐藏
    if (!allowed) return;
    list.push({
      path: fullPath,
      title: item.meta?.title || item.name || fullPath,
      key: fullPath,
      meta: {
        icon: item.meta?.icon,
        badge: item.meta?.badge,
        target: item.meta?.target,
        href: item.meta?.href,
        view: item.meta?.view,
      },
      children,
    });
  });
  return list;
}

const menuList = computed(() => buildMenu(router.options.routes, '', currentUser.value));

// 顶栏显示店铺名
const user = computed(() => ({
  name: shop.value?.name || accountTitle(),
  avatar: avatar,
  menuList: [
    {
      title: accountTitle(),
      key: 'account',
      icon: 'UserOutlined',
      onClick: () => {},
    },
    {type: 'divider'},
    {
      title: '个人中心',
      key: 'personal',
      icon: 'UserOutlined',
      onClick: () => router.push('/profile'),
    },
    {
      title: '设置',
      key: 'setting',
      icon: 'SettingOutlined',
      onClick: () => (showSetting.value = true),
    },
    {type: 'divider'},
    {
      title: '退出登录',
      key: 'logout',
      icon: 'LogoutOutlined',
      onClick: () => {
        logout()
            .catch(() => {
            })
            .finally(() => {
              removeToken()
              disconnectOrderNotify()
              router.push('/front/login')
            })
      },
    },
  ],
}));
</script>

<style lang="less">
.stepin-view {
  ::-webkit-scrollbar {
    width: 4px;
    border-radius: 4px;
    background-color: theme('colors.primary.500');
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: theme('colors.primary.400');

    &:hover {
      background-color: theme('colors.primary.500');
    }
  }

  ::-webkit-scrollbar-track {
    box-shadow: inset 0 0 1px rgba(0, 0, 0, 0);
    border-radius: 4px;
    background: theme('backgroundColor.layout');
  }
}

html {
  height: 100vh;
  overflow-y: hidden;
}

body {
  margin: 0;
  height: 100vh;
  overflow-y: hidden;
}

.stepin-img-checkbox {
@apply transition-transform;

  &:hover {
  @apply scale-105 ~ "-translate-y-[2px]";
  }

  img {
  @apply shadow-low rounded-md transition-transform;
  }
}
</style>
