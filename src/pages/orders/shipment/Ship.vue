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
    <a-form-item style="font-size:16px;margin:0 40px;">
      <DateRangeSelect ref="dateRangeRef" @change="onDateFilterChange" />
    </a-form-item>
    <a-form-item>
      <a-button style="font-size:15px; height:32px; width:100px;"
                @click="reloadOrders">刷新
      </a-button>
    </a-form-item>
  </a-form>
  <a-tabs v-model:activeKey="activeKey" size="large" @change="onTabChange">
    <a-tab-pane key="pending_ship" tab="待发货">
      <PendingShipTable :list="tabs.pendingShip.list" :order-status="orderStatus"
                        @view="handleDetailOrdersOpen" @refresh="reloadCurrent" />
    </a-tab-pane>
    <a-tab-pane key="shipped" tab="已发货">
      <ShippedTable :list="tabs.shipped.list" :order-status="orderStatus"
                    @view="handleDetailOrdersOpen" @refresh="reloadCurrent" />
    </a-tab-pane>
    <a-tab-pane key="finished" tab="已完成">
      <FinishedTable :list="tabs.finished.list" :order-status="orderStatus"
                     @view="handleDetailOrdersOpen" @refresh="reloadCurrent" />
    </a-tab-pane>
  </a-tabs>
  <DetailOrders ref="detailOrdersRef" />
</template>
<script setup>
import {onMounted, onActivated, ref, reactive} from 'vue';
import PendingShipTable from "@/pages/orders/shipment/PendingShipTable.vue";
import ShippedTable from "@/pages/orders/shipment/ShippedTable.vue";
import FinishedTable from "@/pages/orders/shipment/FinishedTable.vue";
import DetailOrders from "@/pages/orders/DetailOrders.vue";
import {getAllOrders, getOrderStatus} from '@/api/orders.js';
import DateRangeSelect from '@/components/date-range-select.vue'

const activeKey = ref('pending_ship');

// 3 个 tab 的数据：status（后端筛选）+ list（该状态全量，发货页订单量少不分页）
const tabs = reactive({
  pendingShip: { status: 3, list: [] },
  shipped: { status: 4, list: [] },
  finished: { status: 5, list: [] },
})
const keyMap = { 'pending_ship': 'pendingShip', 'shipped': 'shipped', 'finished': 'finished' }

const loadTab = (tabName) => {
  const tab = tabs[tabName]
  // pageSize 给足量，拿该状态的完整列表（发货页订单量少，不做分页）
  getAllOrders({
    status: tab.status,
    page: 1,
    pageSize: 1000,
    keyword: searchKeyWord.value || '',
    dateField: dateFilter.value.dateField,
    startDate: dateFilter.value.startDate || undefined,
    endDate: dateFilter.value.endDate || undefined,
  })
      .then(res => {
        tab.list = res.data.data.list
      })
      .catch(err => {
        console.log(err);
      })
}
const reloadCurrent = () => loadTab(keyMap[activeKey.value])
const onTabChange = (key) => loadTab(keyMap[key])

const orderStatus = ref()
const loadStatus = () => {
  getOrderStatus()
      .then(res => {
        orderStatus.value = res.data?.data ?? {map: {}, color: {}}
      })
      .catch(err => {
        console.log(err);
      })
}

const detailOrdersRef = ref(null)
const handleDetailOrdersOpen = (id) => {
  detailOrdersRef.value.detailOrdersVisibleOpen(id)
}

onMounted(() => {
  loadStatus()
})
onActivated(() => {
  reloadCurrent()
})

// ======================== 搜索订单 ========================
const searchKeyWord = ref('')
const onOrderSearch = (value) => {
  searchKeyWord.value = value || ''
  reloadCurrent()
}
// 刷新
const reloadOrders = () => {
  searchKeyWord.value = ''
  dateRangeRef.value?.reset()
  reloadCurrent()
}
// ======================== 日期筛选 ========================
const dateRangeRef = ref(null)
const dateFilter = ref({ dateField: 'created_at', startDate: '', endDate: '' })
const onDateFilterChange = (filter) => {
  dateFilter.value = filter
  reloadCurrent()
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
