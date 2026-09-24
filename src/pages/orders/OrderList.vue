<template>
  <div class="order-container">
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
      <a-form-item label="下单时间" style="font-size:16px;margin:0 40px;">
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
      <a-tab-pane key="1" tab="全部订单">
        <AllOrders :list="orderList"
                    :order-status="order_status"
                    @view="handleDetailOrdersOpen"
                    @delete="handleDeleteOrder"
                    @batchDelete="handleBatchDeleteOrders"
        />
      </a-tab-pane>
      <a-tab-pane key="2" tab="待付款" force-render>
        <PendingPayOrders :list="pendingPayOrders"
                    :order-status="order_status"
                    @view="handleDetailOrdersOpen"
                    @delete="handleDeleteOrder"
                    @batchDelete="handleBatchDeleteOrders"
                    @refresh="loadOrders"
        />
      </a-tab-pane>
      <a-tab-pane key="3" tab="待确认">
        <PendingConfirmOrders :list="pendingConfirmOrders"
                    :order-status="order_status"
                    @view="handleDetailOrdersOpen"
                    @delete="handleDeleteOrder"
                    @batchDelete="handleBatchDeleteOrders"
                    @refresh="loadOrders"
        />
      </a-tab-pane>
      <a-tab-pane key="7" tab="已取消">
        <CancelledOrders :list="cancelledOrders"
                    :order-status="order_status"
                    @view="handleDetailOrdersOpen"
                    @delete="handleDeleteOrder"
                    @batchDelete="handleBatchDeleteOrders"
        />
      </a-tab-pane>
    </a-tabs>
    <DetailOrders ref="detailOrdersRef" />
  </div>
</template>
<script setup>
import {ref, onMounted, onActivated, computed} from 'vue';
import {getAllOrders, getOrderStatus, deleteOrder, deleteOrders} from '@/api/orders.js'
import AllOrders from './AllOrders.vue'
import PendingPayOrders from './PendingPayOrders.vue'
import PendingConfirmOrders from './PendingConfirmOrders.vue'
import CancelledOrders from './CancelledOrders.vue'
import {message, Modal} from 'ant-design-vue'
import DetailOrders from "@/pages/orders/DetailOrders.vue";

const activeKey = ref('1');

// 加载获取全部列表的方法
const loadOrders = (params = {}) => {
  getAllOrders(params)
      .then(res => {
        orderList.value = res.data.data
        console.log(res)
      })
      .catch(err => {
        console.log(err)
      })
}

// 加载标签状态的方法
const order_status = ref()
const loadOrderStatus = () => {
  getOrderStatus()
      .then(res => {
        order_status.value = res.data.data
      })
      .catch(err => {
        console.log(err)
      })
}
onMounted(() => {
  loadOrderStatus()
})
// 每次进入都执行：订单数据会变，需要刷新
onActivated(() => {
  loadOrders()
})
// 定义表格的响应式数组，用于存放表格的数据
const orderList = ref([])
// 定义子组件DetailOrders.vue的实例
const detailOrdersRef = ref(null)
// 查看订单按钮
const handleDetailOrdersOpen = (id) => {
  detailOrdersRef.value.detailOrdersVisibleOpen(id)
}


// ================ 删除订单 ===================
const handleDeleteOrder = (id) => {
  Modal.confirm({
    title: '删除订单',
    content: '请问确认删除吗？',
    onOk() {
      deleteOrder(id)
          .then(() => {
            message.success('删除成功')
            loadOrders()
          })
          .catch(err => {
            message.error('网络连接超时，请检查网络后再试')
            console.error(err)
          })
    }
  })
}
//====================== 批量删除 ==================
const handleBatchDeleteOrders = (ids) => {
  deleteOrders(ids)
      .then(() => {
        message.success('订单已删除')
        loadOrders()
      })
      .catch(err => {
        console.log(err)
        message.error('订单不存在')
      })
}
// =======================================

const pendingPayOrders = computed(() =>
    orderList.value.filter(item => item.order_status === 'pending_pay')
)
const pendingConfirmOrders = computed(() =>
    orderList.value.filter(item => item.order_status === 'pending_confirm')
)
const cancelledOrders = computed(() =>
    orderList.value.filter(item => item.order_status === 'cancel')
)
// ======================== 搜索订单 ========================
const searchKeyWord = ref('')
const onOrderSearch = (value) => {
  loadOrders({search: value || ''})
}
// ======================== 日期筛选 ========================
const dateRange = ref([])
const onDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    loadOrders({
      start_date: dates[0].format('YYYY-MM-DD HH:mm'),
      end_date: dates[1].format('YYYY-MM-DD HH:mm'),
    })
    console.log('change触发:', dates)
  } else {
    loadOrders() // 清空日期时重新加载全部
  }
}
// 刷新
const reloadOrders = () => {
  loadOrders()
  searchKeyWord.value = ''
  dateRange.value = []
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
