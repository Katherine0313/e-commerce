<script setup>
  import { reactive } from 'vue';
  import face1 from '@/assets/avatar/face-1.jpg';
  import face2 from '@/assets/avatar/face-2.jpg';
  import face3 from '@/assets/avatar/face-3.jpg';
  import face4 from '@/assets/avatar/face-4.jpg';
  const chatList = reactive([
    {
      name: 'Sophie B.',
      avatar: face1,
      message: 'Hi! I need more information',
    },
    {
      name: 'Sophie B.',
      avatar: face2,
      message: 'Hi! I need more information',
    },
    {
      name: 'Sophie B.',
      avatar: face3,
      message: 'Hi! I need more information',
    },
    {
      name: 'Sophie B.',
      avatar: face4,
      message: 'Hi! I need more information',
    },
    {
      name: 'Sophie B.',
      avatar: face1,
      message: 'Hi! I need more information',
    },
  ]);
</script>
<template>
  <a-card
    title="Conversations"
    class="conversations rounded-xl shadow-lg"
    :bordered="false"
  >
    <div class="chat flex items-center" v-for="chat in chatList">
      <img class="w-12 rounded-xl" :src="chat.avatar" />
      <div class="content ml-3 flex-1">
        <div class="name">{{ chat.name }}</div>
        <div class="message text-sm text-subtext">{{ chat.message }}</div>
      </div>
      <div class="action">
        <a-button class="text-sm font-semibold" type="link">REPLY</a-button>
      </div>
    </div>
  </a-card>
</template>
<style lang="less" scoped>
  .conversations {
    .chat {
      &:not(:first-child) {
        @apply mt-6;
      }
    }
  }

  :deep(.ant-card) {
    &-head {
      @apply border-none;
    }
  }
</style>
