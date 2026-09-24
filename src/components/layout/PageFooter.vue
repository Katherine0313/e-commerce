<script setup></script>
<template>
  <div class="page-footer">
    <div class="links">
      <a
        class="link"
        href="#"
        target="_blank"
      >
        Stepin 首页
      </a>
      <a
        class="link"
        href="#"
        target="_blank"
      >
        <GithubOutlined />
      </a>
      <a
        class="link"
        href="#"
        target="_blank"
      >
        Ant Design
      </a>
    </div>
    <div class="copyright">
      Copyright
      <CopyrightOutlined class="icon-copyright" /> 2020 ICZER 工作室出品
    </div>
  </div>
</template>

<style scoped lang="less">
  .page-footer {
    text-align: center;
    @apply text-gray-400;

    .links {
      display: flex;
      justify-content: center;

      .link {
        @apply hover:text-gray-400 pl-4 pr-4;
      }
    }

    .copyright {
      margin-top: 8px;

      .icon-copyright {
        margin: 0;
      }
    }
  }
</style>
