<template>
  <div class="auth-shell">
    <!-- 背景装饰层：光斑 + 网格 + 噪点，全部纯 CSS，无外部图片依赖 -->
    <div class="aurora aurora-1"></div>
    <div class="aurora aurora-2"></div>
    <div class="aurora aurora-3"></div>
    <div class="grain"></div>

    <main class="stage">
      <!-- 页面只保留系统名称，不再堆营销文案 -->
      <div class="hero">
        <div class="hero-mark">
          <img :src="avatar" alt="杰米多多" />
        </div>
        <h1>杰米多多电商后台管理系统</h1>
      </div>

      <section class="panel">
        <!-- 登录方式切换：滑块位移代替 antd Tabs，保持整体视觉统一 -->
        <div class="mode-switch" role="tablist" aria-label="登录方式">
          <span class="switch-thumb" :class="{ right: mode === 'phone' }"></span>
          <button
              type="button"
              role="tab"
              :aria-selected="mode === 'account'"
              :class="{ active: mode === 'account' }"
              @click="switchMode('account')"
          >
            账号密码
          </button>
          <button
              type="button"
              role="tab"
              :aria-selected="mode === 'phone'"
              :class="{ active: mode === 'phone' }"
              @click="switchMode('phone')"
          >
            手机号登录
          </button>
        </div>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <transition name="swap" mode="out-in">
            <!-- 账号密码登录 -->
            <div v-if="mode === 'account'" key="account" class="field-group">
              <div class="field">
                <label for="login-username">账号</label>
                <a-input
                    id="login-username"
                    v-model:value="accountForm.username"
                    autocomplete="username"
                    placeholder="用户名 / 邮箱"
                >
                  <template #prefix>
                    <UserOutlined class="field-icon" />
                  </template>
                </a-input>
              </div>
              <div class="field">
                <label for="login-password">密码</label>
                <a-input-password
                    id="login-password"
                    v-model:value="accountForm.password"
                    autocomplete="current-password"
                    placeholder="请输入密码"
                >
                  <template #prefix>
                    <LockOutlined class="field-icon" />
                  </template>
                </a-input-password>
              </div>
              <!-- 账号密码登录：演示环境直接可用 -->
              <button class="submit-btn" type="submit" :disabled="loading">
                <span v-if="loading" class="spinner"></span>
                {{ loading ? '登录中…' : '登 录' }}
              </button>
            </div>

            <!-- 手机号验证码登录 -->
            <div v-else key="phone" class="field-group">
              <div class="field">
                <label for="login-phone">手机号</label>
                <a-input
                    id="login-phone"
                    v-model:value="phoneForm.phone"
                    autocomplete="tel"
                    inputmode="numeric"
                    :maxlength="11"
                    placeholder="请输入绑定的手机号"
                >
                  <template #prefix>
                    <MobileOutlined class="field-icon" />
                    <span class="dial-code">+86</span>
                  </template>
                </a-input>
              </div>
              <div class="field">
                <label for="login-code">验证码</label>
                <div class="code-row">
                  <a-input
                      id="login-code"
                      v-model:value="phoneForm.code"
                      autocomplete="one-time-code"
                      inputmode="numeric"
                      :maxlength="6"
                      placeholder="6 位验证码"
                  >
                    <template #prefix>
                      <SafetyCertificateOutlined class="field-icon" />
                    </template>
                  </a-input>
                  <button
                      class="code-btn"
                      type="button"
                      :disabled="countdown > 0 || sending"
                      @click="handleSendCode"
                  >
                    {{ codeButtonText }}
                  </button>
                </div>
              </div>
              <!-- 手机号 + 验证码登录：演示环境直接可用 -->
              <button class="submit-btn" type="submit" :disabled="phoneLoading">
                <span v-if="phoneLoading" class="spinner"></span>
                {{ phoneLoading ? '登录中…' : '登 录' }}
              </button>
            </div>
          </transition>
        </form>
      </section>
    </main>

    <footer class="page-foot">
      © {{ year }} 杰米多多 · 登录即代表同意用户条款、数据使用协议与 Cookie 使用协议
    </footer>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue';
import {message} from 'ant-design-vue';
import {
  LockOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  UserOutlined
} from '@ant-design/icons-vue';
import {login, loginByPhone, sendSmsCode} from '@/api/auth.js';
import {setToken} from '@/utils/token';
import {connectOrderNotify} from '@/utils/orderNotify';
import router from '@/router';
import avatar from '@/assets/avatar/zongjie.webp';

const year = new Date().getFullYear();

const mode = ref('account');
const loading = ref(false);
const phoneLoading = ref(false);
const sending = ref(false);
const countdown = ref(0);
let countdownTimer = null;
let prefetchTimer = null;

// 固定预填演示账号（开发和生产都回填）
const accountForm = reactive({
  username: 'admin',
  password: 'admin123',
});
const phoneForm = reactive({phone: '13800138000', code: ''});

const codeButtonText = computed(() => {
  if (sending.value) return '发送中…';
  if (countdown.value > 0) return `${countdown.value}s 后重发`;
  return '获取验证码';
});

const switchMode = (target) => {
  if (mode.value !== target) mode.value = target;
};

const startCountdown = (seconds) => {
  countdown.value = seconds;
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) clearInterval(countdownTimer);
  }, 1000);
};

onMounted(() => {
  // 401 拦截器跳回本页时留下的原因（例如「登录已过期，请重新登录」）
  const tip = sessionStorage.getItem('loginMessage');
  if (tip) {
    message.warning(tip);
    sessionStorage.removeItem('loginMessage');
  }
  // 空闲时预取工作台代码块：登录后 router.push 直接命中缓存，不再等下载
  prefetchTimer = setTimeout(() => {
    import('@/pages/workplace/Workplace.vue').catch(() => {});
  }, 1200);
});

onBeforeUnmount(() => {
  clearInterval(countdownTimer);
  clearTimeout(prefetchTimer);
});

// 登录成功后的公共处理：账号密码登录与手机号登录共用
const finishLogin = (res) => {
  if (res.data.success) {
    setToken(res.data.data.token);
    connectOrderNotify();
    message.success('登录成功');
    router.push('/workplace');
  }
};

const submitAccount = () => {
  if (!accountForm.username.trim()) {
    message.warning('请输入账号');
    return;
  }
  if (!accountForm.password) {
    message.warning('请输入密码');
    return;
  }
  loading.value = true;
  login({username: accountForm.username.trim(), password: accountForm.password})
      .then(finishLogin)
      .catch(() => {
        // 密码错误等由 axios 拦截器统一提示，这里只需要结束 loading
      })
      .finally(() => {
        loading.value = false;
      });
};

// 发送验证码：开发环境或演示手机号后端会回传 devCode，自动填入方便登录
const handleSendCode = () => {
  const phone = phoneForm.phone.trim();
  if (countdown.value > 0 || sending.value) return;
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    message.warning('请输入正确的手机号');
    return;
  }
  sending.value = true;
  sendSmsCode({phone})
      .then(res => {
        if (res.data.success) {
          const devCode = res.data.data && res.data.data.devCode;
          if (devCode) {
            phoneForm.code = devCode;
            message.info(`验证码：${devCode}`, 6);
          }
          startCountdown(60);
        }
      })
      .catch(() => {
        // 未绑定账号 / 发送过于频繁等由 axios 拦截器提示
      })
      .finally(() => {
        sending.value = false;
      });
};

const submitPhone = () => {
  const phone = phoneForm.phone.trim();
  const code = phoneForm.code.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    message.warning('请输入正确的手机号');
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    message.warning('请输入 6 位验证码');
    return;
  }
  phoneLoading.value = true;
  loginByPhone({phone, code})
      .then(finishLogin)
      .catch(() => {
        // 验证码错误等由 axios 拦截器统一提示
      })
      .finally(() => {
        phoneLoading.value = false;
      });
};

const handleSubmit = () => {
  if (mode.value === 'account') {
    submitAccount();
  } else {
    submitPhone();
  }
};
</script>

<style scoped lang="less">
.auth-shell {
  --ink: #eef4ff;
  /* 卡片已改为浅色玻璃，这里用深灰蓝保证浅底上的可读性 */
  --muted: #5f7799;
  --gold: #ffca29;
  --line: rgba(16, 52, 100, 0.14);

  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 96px 24px 88px;
  overflow: hidden;
  isolation: isolate;
  color: var(--ink);
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
  background:
      radial-gradient(120% 90% at 8% 0%, #5aa2f0 0%, transparent 60%),
      radial-gradient(100% 80% at 95% 6%, #3d8be4 0%, transparent 62%),
      linear-gradient(160deg, #2a78cc 0%, #3284dd 46%, #1a5aa8 100%);

  /* ============ 背景光斑 ============ */
  .aurora {
    position: absolute;
    z-index: -3;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
  }

  .aurora-1 {
    width: 620px;
    height: 620px;
    top: -220px;
    left: -160px;
    background: radial-gradient(circle at 40% 40%, rgba(255, 202, 41, 0.28), rgba(255, 202, 41, 0) 65%);
  }

  .aurora-2 {
    width: 760px;
    height: 760px;
    right: -260px;
    bottom: -320px;
    background: radial-gradient(circle at 50% 50%, rgba(24, 150, 255, 0.5), rgba(24, 150, 255, 0) 66%);
  }

  .aurora-3 {
    width: 460px;
    height: 460px;
    left: 52%;
    top: 58%;
    background: radial-gradient(circle, rgba(0, 214, 255, 0.16), rgba(0, 214, 255, 0) 70%);
  }

  /* 噪点：抵消大面积渐变的塑料感 */
  .grain {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  }

  /* ============ 系统名称 ============ */
  .hero {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;

    .hero-mark {
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      overflow: hidden;
      border: 2px solid rgba(255, 210, 80, 0.95);
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 8px 20px -8px rgba(255, 202, 41, 0.8);

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 40%;
      }
    }

    h1 {
      margin: 0;
      color: #f7faff;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-shadow: 0 4px 24px rgba(0, 24, 60, 0.28);
      white-space: nowrap;
    }
  }

  /* ============ 主区域 ============ */
  .stage {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
    width: 100%;
    max-width: 460px;
  }

  /* ============ 毛玻璃登录卡片 ============ */
  .panel {
    position: relative;
    width: 100%;
    max-width: 424px;
    padding: 30px 34px 26px;
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 26px;
    background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(236, 246, 255, 0.88));
    box-shadow:
        0 40px 90px -32px rgba(2, 20, 50, 0.55),
        0 1px 0 rgba(255, 255, 255, 0.9) inset;
    color: #10243f;

    /* 顶部金色高光细线 */
    &::before {
      content: '';
      position: absolute;
      inset: -1px 24% auto;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 202, 41, 0.9), transparent);
    }
  }

  /* 登录方式切换 */
  .mode-switch {
    position: relative;
    display: flex;
    padding: 4px;
    border: 1px solid rgba(16, 52, 100, 0.08);
    border-radius: 12px;
    background: rgba(16, 52, 100, 0.06);

    button {
      position: relative;
      z-index: 1;
      flex: 1;
      height: 36px;
      border: none;
      background: transparent;
      color: #6a80a0;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 500;
      letter-spacing: 0.04em;
      cursor: pointer;
      transition: color 0.25s ease;

      &.active {
        color: #12213f;
        font-weight: 600;
      }
    }
  }

  .switch-thumb {
    position: absolute;
    top: 4px;
    left: 4px;
    width: calc(50% - 4px);
    height: calc(100% - 8px);
    border-radius: 9px;
    background: linear-gradient(135deg, #ffe08a, #ffca29);
    box-shadow: 0 6px 18px -6px rgba(255, 202, 41, 0.65);
    transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);

    &.right {
      transform: translateX(100%);
    }
  }

  /* ============ 表单 ============ */
  .auth-form {
    margin-top: 22px;
  }

  .field {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 12.5px;
      letter-spacing: 0.08em;
    }
  }

  /* 覆盖 antd 默认输入框，换成浅色玻璃质感 */
  .field :deep(.ant-input-affix-wrapper),
  .field :deep(.ant-input) {
    height: 48px;
    padding: 0 14px;
    border: 1px solid var(--line) !important;
    border-radius: 12px !important;
    background: rgba(255, 255, 255, 0.72) !important;
    color: #10243f !important;
    box-shadow: none !important;
    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  }

  .field :deep(.ant-input-affix-wrapper:hover),
  .field :deep(.ant-input:hover) {
    border-color: rgba(255, 202, 41, 0.7) !important;
    background: rgba(255, 255, 255, 0.9) !important;
  }

  .field :deep(.ant-input-affix-wrapper-focused),
  .field :deep(.ant-input:focus) {
    border-color: rgba(240, 180, 10, 0.85) !important;
    background: #ffffff !important;
    box-shadow: 0 0 0 3px rgba(255, 202, 41, 0.2) !important;
  }

  .field :deep(.ant-input-affix-wrapper > input.ant-input) {
    height: 100%;
    padding: 0;
    border: none !important;
    background: transparent !important;
    color: #10243f !important;
    box-shadow: none !important;
  }

  .field :deep(.ant-input::placeholder) {
    color: rgba(48, 72, 110, 0.45);
  }

  .field :deep(.ant-input-affix-wrapper .anticon) {
    color: #7a90b2;
  }

  .field :deep(.ant-input-password-icon) {
    color: #7a90b2 !important;
  }

  /* Chrome 自动填充时保留浅色背景 */
  .field :deep(input:-webkit-autofill) {
    -webkit-text-fill-color: #10243f !important;
    -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
    caret-color: #10243f;
    border-radius: 12px;
  }

  .field-icon {
    margin-right: 8px;
    font-size: 15px;
  }

  .dial-code {
    margin-right: 8px;
    padding-right: 10px;
    border-right: 1px solid var(--line);
    color: #607a9e;
    font-size: 13px;
    line-height: 1;
  }

  .code-row {
    display: flex;
    gap: 10px;

    :deep(.ant-input-affix-wrapper) {
      flex: 1;
      min-width: 0;
    }
  }

  .code-btn {
    flex: 0 0 116px;
    height: 48px;
    border: 1px solid rgba(219, 164, 0, 0.55);
    border-radius: 12px;
    background: rgba(255, 202, 41, 0.26);
    color: #7c5300;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;

    &:hover:not(:disabled) {
      border-color: rgba(219, 164, 0, 0.8);
      background: rgba(255, 202, 41, 0.28);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    height: 48px;
    margin-top: 6px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #ffe38f 0%, #ffca29 52%, #f2b407 100%);
    box-shadow: 0 14px 30px -12px rgba(255, 202, 41, 0.7);
    color: #13223f;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.14em;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 18px 36px -12px rgba(255, 202, 41, 0.8);
      filter: brightness(1.03);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.8;
      cursor: wait;
    }
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(19, 34, 63, 0.25);
    border-top-color: #13223f;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .page-foot {
    position: absolute;
    right: 0;
    bottom: 22px;
    left: 0;
    color: rgba(224, 235, 255, 0.58);
    font-size: 11.5px;
    letter-spacing: 0.03em;
    text-align: center;
  }

  /* ============ 动效 ============ */
  .swap-enter-active,
  .swap-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
  }

  .swap-enter-from {
    opacity: 0;
    transform: translateY(6px);
  }

  .swap-leave-to {
    opacity: 0;
    transform: translateY(-6px);
  }

  /* 小屏：隐藏品牌介绍，卡片居中 */
  @media (max-width: 767px) {
    padding: 56px 16px 70px;

    .stage {
      gap: 22px;
    }

    .hero {
      gap: 10px;

      .hero-mark {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
      }

      h1 {
        font-size: 19px;
        letter-spacing: 0.04em;
      }
    }

    .panel {
      padding: 24px 20px 20px;
      border-radius: 22px;
    }

    .page-foot {
      bottom: 14px;
      padding: 0 16px;
      font-size: 11px;
      line-height: 1.6;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-shell {
    .switch-thumb,
    .submit-btn,
    .swap-enter-active,
    .swap-leave-active {
      transition: none !important;
    }
  }
}
</style>
