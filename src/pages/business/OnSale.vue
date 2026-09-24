<template>
  <a-space style="margin:20px 0">
    <a-button type="primary" style="margin-right: 50px">新建活动</a-button>
    <a-input-search enter-button="搜索" placeholder="请输入活动名称"></a-input-search>
  </a-space>
  <a-table class="title">
    <a-table-column title="活动名称"></a-table-column>
    <a-table-column title="活动时间"></a-table-column>
    <a-table-column title="应收金额"></a-table-column>
    <a-table-column title="支付单数"></a-table-column>
    <a-table-column title="活动状态"></a-table-column>
    <a-table-column title="操作">
      <template #default="{record}">
        <a-button type="primary">编辑</a-button>
      </template>
    </a-table-column>
  </a-table>
</template>
<script setup>

</script>

<style scoped>
/*表头*/
/*行元素*/
.title :deep(.ant-table-tbody >tr > td){
  font-size: 14px;
  text-align:center;
}
</style>