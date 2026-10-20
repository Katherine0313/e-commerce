<template>
  <div class="login flex items-center justify-center">
    <a-form
        :model="form"
        :wrapperCol="{ span: 24 }"
        class="login-form w-[400px] p-lg xl:w-[440px] xl:p-xl"
    >
      <div class="third-platform">
        <div class="third-title">第三方登录：</div>
        <div class="third-list">
          <WechatOutlined class="icon wechat" />
          <TwitterOutlined class="icon twitter" />
          <QqOutlined class="icon qq" />
        </div>
      </div>
      <a-divider>Or</a-divider>
      <a-form-item :required="true" name="username">
        <a-input
            v-model:value="form.username"
            autocomplete="new-username"
            placeholder="请输入用户名或邮箱: admin"
            class="login-input"
        />
      </a-form-item>
      <a-form-item :required="true" name="password">
        <a-input
            v-model:value="form.password"
            autocomplete="new-password"
            class="login-input"
            type="password"
        />
      </a-form-item>
      <!-- 「登录」按钮是本机开发用的入口（登录模板店维护演示素材），
           用 v-if="isDev" 只在开发环境显示，打包上线后自动隐藏，只留「一键体验」。
           注意：藏按钮只是藏入口，POST /api/login 接口还在，知道 admin123 的人直接打接口仍能登进模板店（只读） -->
      <a-button
          v-if="isDev"
          htmlType="submit"
          class="login-button bg-primary-600"
          type="primary"
          :loading="loading"
          @click="submitLogin"
          style="margin-right:20px;"
      >
        登录
      </a-button>
      <a-button
          class="login-button"
          type="primary"
          :loading="sandboxLoading"
          @click="startSandbox"
      >
        一键体验（免注册）
      </a-button>
      <a-divider></a-divider>
      <div class="terms">
        登录即代表您同意我们的
        <span class="font-bold">用户条款 </span>、<span class="font-bold">
          数据使用协议 </span
      >、以及 <span class="font-bold">Cookie使用协议</span>。
      </div>
    </a-form>
  </div>
</template>
<script setup>
// import {useRouter} from 'vue-router';
// const router = useRouter();
import {reactive, ref, onMounted} from 'vue';
import {message} from 'ant-design-vue';
import useThemeStore from 'stepin/es/theme-editor/store';
import {login} from '@/api/auth.js'
import {createSandbox} from '@/api/shop.js'
import {setToken} from '@/utils/token'
import {connectOrderNotify} from '@/utils/orderNotify'
import {loadShop} from '@/utils/shop'
import router from '@/router'
// const {setBgSeriesColors} = useThemeStore();
// onMounted(() => {
//   // setBgSeriesColors({'bg-base': '#fff'}, true, '.login-box');
// });
const loading = ref(false);
const sandboxLoading = ref(false);
// import.meta.env 不能在模板表达式里直接用（模板编译器按非 module 解析），先在 script 里取成变量
const isDev = import.meta.env.DEV
const form = reactive({
  username: 'admin',
  password: 'admin123',
});
onMounted(() => {
  // 401 拦截器跳回本页时留下的原因（例如「体验店铺已过期，请重新体验」）
  const tip = sessionStorage.getItem('loginMessage')
  if (tip) {
    message.warning(tip)
    sessionStorage.removeItem('loginMessage')
  }
});
const submitLogin = () => {
  loading.value = true
  login(form)
      .then(res => {
        if(res.data.success){
          // 存储token
          const token = res.data.data.token
          console.log(res.data)
          // 存储token（写入 localStorage）
          setToken(token)
          connectOrderNotify()
          // 登录进去的可能是模板店或沙箱店，强制重拉店铺信息给顶栏用
          loadShop(true)
          message.success('登录成功')
          router.push('/workplace')
        }
      })
      .catch(() => {
        // 密码错误等由 axios 拦截器统一提示，这里只需要结束 loading
      })
      .finally(() => {
        loading.value = false
      })
}
// 一键体验：后端开一个只属于本次访客的沙箱店铺，并直接签发该店铺的管理员 token
const startSandbox = () => {
  sandboxLoading.value = true
  createSandbox()
      .then(res => {
        if(res.data.success){
          setToken(res.data.data.token)
          connectOrderNotify()
          // 换到新店铺了，强制重拉店铺信息（顶栏/店铺卡片要显示新的沙箱店名）
          loadShop(true)
          message.success('体验店铺已开通：' + res.data.data.shop.name)
          router.push('/workplace')
        }
      })
      .catch(() => {
        message.error('体验店铺开通失败，请稍后再试')
      })
      .finally(() => {
        sandboxLoading.value = false
      })
}
</script>
<style scoped lang="less">
.login {
  min-height: max(100vh, 720px);
  margin-top: -78px;

  .login-form {
  @apply h-fit border-border rounded-sm text-text bg-container;

    .third-platform {
      .third-title {
      @apply text-left mb-md;
        font-size: 16px;
      }

      .third-list {
      @apply flex;

        .icon {
        @apply text-gray-400 flex-1 hover:text-primary-500 cursor-pointer;
          font-size: 28px;

          &.wechat {
          @apply hover:text-green-600;
          }

          &.twitter {
          @apply hover:text-blue-400;
          }

          &.qq {
          @apply hover:text-red-600;
          }
        }
      }
    }

    .login-input,
    .login-button {
    @apply ~ "h-[40px]" rounded mt-sm w-full;
    }

    .sandbox-tip {
      margin-top: 8px;
      text-align: center;
      font-size: 12px;
      color: #999;
    }

    .terms {
    }
  }
}
</style>
