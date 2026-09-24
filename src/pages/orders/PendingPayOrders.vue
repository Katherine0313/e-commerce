<template>
  <div class="order-container">
    <a-table class="title" :data-source="list" :pagination="{pageSize:13}"
             :row-selection="{selectedRowKeys,onChange:onOrderSelectChange}" row-key="id">
      <a-table-column title="编号" dataIndex="id"></a-table-column>
      <a-table-column title="订单编号" dataIndex="order_no"></a-table-column>
      <a-table-column title="提交时间" dataIndex="created_at"></a-table-column>
      <a-table-column title="倒计时">
        <template #default="{record}">
          <span :class="{ 'countdown-timeout': remainingSeconds(record.created_at) <= 0 }">
            {{ formatCountdown(record.created_at) }}
          </span>
        </template>
      </a-table-column>
      <a-table-column title="用户账号" dataIndex="user_id"></a-table-column>
      <a-table-column title="订单总金额" dataIndex="pay_amount"></a-table-column>
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

    <!--收银台支付弹窗（复用商品结算的收银台）-->
    <Paid ref="paidRef" @paid="emit('refresh')" />
  </div>
</template>
<script setup>
import {ref, computed, watch} from 'vue'
import Paid from '@/pages/goods/list/Paid.vue'
import {useCountdown} from '@/composables/useCountdown.js'

const props = defineProps({
  list: {type: Array, default: () => []},
  orderStatus: {type: Object, default: () => ({ map: {}, color: {} })},
})

const emit = defineEmits(['view', 'delete', 'batchDelete', 'refresh'])

// 倒计时显示逻辑，在composables/useCountdown.js（每秒刷新、剩余秒数、文案格式化）
const {remainingSeconds, formatCountdown} = useCountdown()

// 任一订单超时 → 通知父组件刷新（后端定时任务会关闭订单并释放库存）
const hasTimedOut = computed(() => props.list.some(r => remainingSeconds(r.created_at) <= 0))
let timeoutRefreshed = false
watch(hasTimedOut, (val) => {
  if (val && !timeoutRefreshed) {
    timeoutRefreshed = true
    emit('refresh')
  }
})
// 列表刷新后重置标记，便于下一轮超时再次触发
watch(() => props.list, () => {
  timeoutRefreshed = false
})

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

/* 倒计时超时：红色加粗 */
.countdown-timeout {
  color: #f5222d;
  font-weight: 600;
}


.order-container {
  position: relative;
}

.bat-delete-btn {
  position: absolute;
  bottom: 15px;
}
</style>
