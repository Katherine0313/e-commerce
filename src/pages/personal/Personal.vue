<script setup>
  import { ref } from 'vue';
  import Conversation from './Conversation.vue';
  import PlatformSetting from './PlatformSetting.vue';
  import ProfileInfo from './ProfileInfo.vue';
  import Projects from './Projects.vue';
  const select = ref('overview');
</script>
<template>
  <div class="personal">
    <div class="banner w-full rounded-xl p-base items-baseline">
      <a-breadcrumb class="navi">
        <a-breadcrumb-item class="text-text-inverse">Home</a-breadcrumb-item>
        <a-breadcrumb-item>Personal</a-breadcrumb-item>
      </a-breadcrumb>
      <div class="mt-0.5 text-text-inverse text-xl font-semibold">Overview</div>
      <div
        class="profile flex items-center justify-between p-base bg-container rounded-2xl absolute -bottom-16 left-6 shadow-lg"
      >
        <div class="info flex items-center">
          <img class="w-20 rounded-lg" src="@/assets/avatar/zongjie.webp" />
          <div class="flex flex-col justify-around ml-4">
            <span class="text-title text-xl font-bold">杰米多多</span>
            <span class="text-subtext font-semibold">CEO / Co-Founder</span>
          </div>
        </div>
        <a-radio-group v-model:value="select">
          <a-radio-button value="overview">OVERVIEW</a-radio-button>
          <a-radio-button value="teams">TEAMS</a-radio-button>
          <a-radio-button value="projects">PROJECTS</a-radio-button>
        </a-radio-group>
      </div>
    </div>
    <div class="personal-cols mt-24 flex justify-evenly">
      <PlatformSetting class="flex-1" />
      <ProfileInfo class="flex-1 ml-lg" />
      <Conversation class="flex-1 ml-lg" />
    </div>
    <a-divider class="my-10" />
    <Projects class="mt-lg" />
  </div>
</template>
<style lang="less" scoped>
  .personal {
    .banner {
      height: 240px;
      background-image: url('@/assets/personal-bg.png');
      background-position: 50% 10%;
      background-size: cover;
      position: relative;

      .profile {
        width: calc(~'100% - 48px');
      }

      :deep(.navi) {
        .ant-breadcrumb-link,
        .ant-breadcrumb-separator {
          color: rgba(255, 255, 255, 0.65);
        }

        & > span:last-child .ant-breadcrumb-link {
          @apply text-text-inverse;
        }
      }
    }

    // 笔记本：三栏按可用宽度自动换行
    @media (max-width: 1200px) {
      .personal-cols {
        flex-wrap: wrap;
        gap: 16px;
      }
      .personal-cols > * {
        flex: 1 1 240px;
        min-width: 0;
        margin-left: 0 !important;
      }
    }

    // 手机：Banner 高度自适应，个人信息条改为普通文档流，三栏纵向堆叠
    @media (max-width: 767px) {
      .banner {
        height: auto;
        min-height: 140px;
        padding-bottom: 16px;
      }
      .banner .profile {
        position: static;
        width: 100%;
        margin-top: 16px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .personal-cols {
        margin-top: 16px !important;
      }
      .personal-cols > * {
        flex: 1 1 100%;
      }
    }
  }
</style>
