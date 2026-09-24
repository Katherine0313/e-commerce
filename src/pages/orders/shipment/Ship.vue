<template>
  <a-form style="margin:20px 0 10px;" layout="inline">
    <a-form-item>
      <a-input-search style=" width:400px;"
                      enter-button="搜索"
                      placeholder="商品名称/订单编号/收货人姓名/手机号"
                      v-model:value="searchKeyWord"
                      @search="onOrderSearch"
                      allow-clear
      >
      </a-input-search>
    </a-form-item>
    <a-form-item label="订单确认时间" style="font-size:16px;margin:0 40px;">
      <a-range-picker v-model:value="dateRange" :show-time="{ format: 'HH:mm' }" style="padding:5px;"
                      class="range-center" @change="onDateRangeChange"
                      :placeholder="['开始日期','结束日期']" />
    </a-form-item>
    <a-form-item>
      <a-button style="font-size:15px; height:32px; width:100px;"
                @click="reloadOrders">刷新
      </a-button>
    </a-form-item>
  </a-form>
  <a-tabs v-model:activeKey="activeKey" size="large">
    <a-tab-pane key="pending_ship" tab="待发货">
      <PendingShipTable :list="pendingShipList" :order-status="order_status"
                        @view="handleDetailOrdersOpen" @refresh="loadOrders" />
    </a-tab-pane>
    <a-tab-pane key="shipped" tab="已发货">
      <ShippedTable :list="shippedList" :order-status="order_status"
                    @view="handleDetailOrdersOpen" @refresh="loadOrders" />
    </a-tab-pane>
    <a-tab-pane key="finished" tab="已完成">
      <FinishedTable :list="finishedList" :order-status="order_status"
                     @view="handleDetailOrdersOpen" @refresh="loadOrders" />
    </a-tab-pane>
  </a-tabs>
  <DetailOrders ref="detailOrdersRef" />
</template>
<script setup>
import {computed, onMounted, onActivated, ref} from 'vue';
import PendingShipTable from "@/pages/orders/shipment/PendingShipTable.vue";
import ShippedTable from "@/pages/orders/shipment/ShippedTable.vue";
import FinishedTable from "@/pages/orders/shipment/FinishedTable.vue";
import DetailOrders from "@/pages/orders/DetailOrders.vue";
import {getAllOrders, getOrderStatus} from '@/api/orders.js';

const activeKey = ref('pending_ship');
const orderList = ref([])
const order_status = ref()

// 查看订单详情弹窗
const detailOrdersRef = ref(null)
const handleDetailOrdersOpen = (id) => {
  detailOrdersRef.value.detailOrdersVisibleOpen(id)
}

const loadOrders = (params = {}) => {
  getAllOrders(params)
      .then(res => {
        orderList.value = res.data?.data ?? []
      })
      .catch(err => {
        console.log(err);
      })
}
const loadStatus = () => {
  getOrderStatus()
      .then(res => {
        order_status.value = res.data?.data ?? {map: {}, color: {}}
      })
      .catch(err => {
        console.log(err);
      })
}
onMounted(() => {
  loadStatus()
})
onActivated(() => {
  loadOrders()
})

// 过滤
const pendingShipList = computed(() =>
    (orderList.value || []).filter(item => item.order_status === 'pending_ship')
)
const shippedList = computed(() =>
    (orderList.value || []).filter(item => item.order_status === 'shipped')
)
const finishedList = computed(() =>
    (orderList.value || []).filter(item => item.order_status === 'finished')
)
// ======================== 搜索订单 ========================
const searchKeyWord = ref('')
const onOrderSearch = (value) => {
  loadOrders({search: value || ''})
}
// 刷新
const reloadOrders = () => {
  loadOrders()
  searchKeyWord.value = ''
  dateRange.value = []
}
// ======================== 日期筛选 ========================
const dateRange = ref([])
const onDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    loadOrders({
      date_field: 'confirm_at',
      start_date: dates[0].format('YYYY-MM-DD HH:mm'),
      end_date: dates[1].format('YYYY-MM-DD HH:mm'),
    })
    console.log('change触发:', dates)
  } else {
    loadOrders() // 清空日期时重新加载全部
  }
}
</script>

<style scoped>
:deep(.ant-input-search-button) {
  width: 100px;
}

.range-center :deep(.ant-picker-input > input) {
  text-align: center;
}

:deep(.ant-picker-panel-container) {
  font-size: 12px;
}
</style>
