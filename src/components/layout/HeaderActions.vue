<script setup>
  import { computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { StepinHeaderAction } from 'stepin';
  import DayNightSwitch from '@/components/switch/DayNightSwitch.vue';
  import { BellOutlined } from '@ant-design/icons-vue';
  import { unreadOrderCount, clearUnreadOrders } from '@/utils/orderNotify';
  import Fullscreen from '../fullscreen/Fullscreen.vue';

  defineEmits(['showSetting']);

  const router = useRouter();
  // 顶栏铃铛未读角标：来自来单提醒 WebSocket 计数
  const unread = computed(() => unreadOrderCount.value);

  // 点击铃铛：清空未读，跳订单列表查看新订单
  const goOrders = () => {
    clearUnreadOrders();
    router.push('/orders/order-list');
  };
</script>
<template>
  <StepinHeaderAction>
    <DayNightSwitch />
  </StepinHeaderAction>
  <StepinHeaderAction>
    <a
      class="action-item"
      href="#"
      target="_blank"
    >
      <img class="gitee-logo" src="@/assets/gitee.svg" />
    </a>
  </StepinHeaderAction>
  <StepinHeaderAction>
    <div class="action-item setting" @click="$emit('showSetting')">
      <SettingOutlined />
    </div>
  </StepinHeaderAction>
  <StepinHeaderAction>
    <div class="action-item notice" @click="goOrders">
      <a-badge :count="unread" :overflow-count="99">
        <BellOutlined />
      </a-badge>
    </div>
  </StepinHeaderAction>
  <StepinHeaderAction>
    <Fullscreen
      class="-mx-xs -my-sm h-[56px] px-xs py-sm flex items-center"
      target=".stepin-layout"
    />
  </StepinHeaderAction>
</template>
<style scoped lang="less">
  .gitee-logo {
    width: 20px;
  }
  .action-item {
    font-size: 20px;
    height: 100%;
    margin: 0 -8px;
    padding: 0 4px;
    line-height: 40px;
    display: flex;
    align-items: center;

    &.setting {
      font-size: 18px;
    }

    &.notice {
      font-size: 18px;
      cursor: pointer;
    }
  }
</style>
