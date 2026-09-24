<template>
  <div class="order-container">
    <a-table class="title" :data-source="list" :pagination="{pageSize:13}"
             :row-selection="{selectedRowKeys,onChange:onOrderSelectChange}" row-key="id">
      <a-table-column title="编号" dataIndex="id"></a-table-column>
      <a-table-column title="订单编号" dataIndex="order_no"></a-table-column>
      <a-table-column title="提交时间" dataIndex="created_at"></a-table-column>
      <a-table-column title="用户账号" dataIndex="user_id"></a-table-column>
      <a-table-column title="订单总金额" dataIndex="pay_amount"></a-table-column>
      <a-table-column title="支付方式" dataIndex="pay_type"></a-table-column>
      <a-table-column title="订单状态" dataIndex="order_status">
        <template #default="{record}">
          <a-tag :color="orderStatus.color[record.order_status] || 'default'">
            {{ orderStatus.map[record.order_status] || record.order_status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="操作">
        <template #default="{record}">
          <a-button type="primary" style="margin-right:10px;"
                    @click="$emit('view',record.id)">查看订单
          </a-button>
          <a-button type="link" @click="$emit('delete',record.id)">删除</a-button>
        </template>
      </a-table-column>
    </a-table>
    <a-button class="bat-delete-btn" @click="batchDelete">批量删除</a-button>
  </div>
</template>
<script setup>
import {ref} from 'vue'

defineProps({
  list: {type: Array, default: () => []},
  orderStatus: {type: Object, default: () => ({ map: {}, color: {} })},
})

const emit = defineEmits(['view', 'delete', 'batchDelete'])

//====================== 复选框 ====================
const selectedRowKeys = ref([])
const onOrderSelectChange = (key) => {
  selectedRowKeys.value = key
}
const batchDelete = () => {
  emit('batchDelete', selectedRowKeys.value)
}
</script>


<style scoped>

.title {
  margin-top: 20px;
}

/*表头*/

/*行元素*/
.title :deep(.ant-table-tbody >tr > td) {
  font-size: 14px;
  text-align: center;

}

/* 操作列 - 防止按钮换行叠加 */
.title :deep(.ant-table-tbody >tr >td:last-child) {
  white-space: nowrap;
}


.order-container {
  position: relative;
}

.bat-delete-btn {
  position: absolute;
  bottom: 15px;
}
</style>
