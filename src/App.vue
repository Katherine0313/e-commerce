<template>
  <stepin-view
      system-name="杰米多多"
      logo-src="@/assets/vite.svg"
      :user="user"
      :nav-mode="navMode"
      :themeList="themeList"
      v-model:show-setting="showSetting"
      @themeSelect="configTheme"
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
  <login-modal :unless="['/login']" />
</template>

<script setup>
import {computed, onMounted, reactive, ref} from 'vue';
import {useRouter} from 'vue-router';
import avatar from '@/assets/avatar/zongjie.webp';
import {HeaderActions, PageFooter} from '@/components/layout';
import Setting from './components/setting';
import {LoginModal} from '@/pages/login';
import {configTheme, themeList} from '@/theme';
import {removeToken} from '@/utils/token';
import {logout} from '@/api/auth.js';
import {getCurrentUser} from '@/utils/auth';
import {expireText, loadShop, shop} from '@/utils/shop';
import {StepinView} from "stepin";

const navMode = ref('side');
// const useTabs = ref(false);
const showSetting = ref(false);
const router = useRouter();

// 拉当前店铺信息（沙箱店名、剩余有效期）
onMounted(() => {
  loadShop(false)
});

// 账号 + 有效期文案：模板店永不过期，就只显示账号
const accountTitle = () => {
  const username = getCurrentUser()?.username
  const left = expireText()
  return [username, left].filter(Boolean).join(' · ') || '未登录'
};

// 顶栏显示当前店铺名而不是写死的 'admin'：访客一眼能看出自己进的是独立沙箱店铺
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
              // 退出后清掉店铺信息，避免下一个登录的人看到上一个店铺的店名
              shop.value = null
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
