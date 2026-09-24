<script setup>
  import AuthorTable from './AuthorTable.vue';
  import ProjectTable from './ProjectTable.vue';
</script>
<template>
  <div class="table w-full">
    <AuthorTable />
    <ProjectTable class="mt-4" />
  </div>
</template>
<style lang="less" scoped>
  /* 表格示例页沿用 stepin 原有的透明表头设计，覆盖全局的灰底表头 */
  .table {
    :deep(.ant-table-thead > tr > th) {
      @apply border-0 bg-transparent text-subtext font-bold text-xs text-left;
      &:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan])::before {
        @apply w-0;
      }
    }
  :deep(.ant-table-tbody > tr > td) {
  @apply border-0 bg-transparent text-subtext font-bold text-xs text-left;
    &:not(:last-child):not(.ant-table-selection-column):not(.ant-table-row-expand-icon-cell):not([colspan])::before {
    @apply w-0;
    }
  }
  }
</style>
