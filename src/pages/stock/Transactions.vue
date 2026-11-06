<template>
  <div>
    <!-- 过滤区 -->
    <a-card :bordered="false" class="filter-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="6">
          <a-input-search
              placeholder="SKU 名称 / 编码"
              v-model:value="filters.search"
              @search="onSearch"
              allow-clear
          />
        </a-col>
        <a-col :xs="24" :sm="12" :md="4">
          <a-select placeholder="类型" v-model:value="filters.type" allow-clear style="width: 100%">
            <a-select-option value="IN">入库</a-select-option>
            <a-select-option value="OUT">出库</a-select-option>
            <a-select-option value="ADJUST">调整</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="4">
          <a-select placeholder="原因" v-model:value="filters.reason" allow-clear style="width: 100%">
            <a-select-option value="PURCHASE">采购入库</a-select-option>
            <a-select-option value="RETURN">退货归还</a-select-option>
            <a-select-option value="MANUAL_IN">手工补录</a-select-option>
            <a-select-option value="ORDER_SHIP">订单发货</a-select-option>
            <a-select-option value="LOSS">盘亏</a-select-option>
            <a-select-option value="MANUAL_OUT">手工出库</a-select-option>
            <a-select-option value="ADJUST">调整</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-range-picker v-model:value="filters.range" style="width: 100%" show-time format="YYYY-MM-DD HH:mm" />
        </a-col>
        <a-col :xs="24" :sm="12" :md="4">
          <a-button type="primary" @click="onSearch">查询</a-button>
          <a-button style="margin-left: 8px" @click="onReset">重置</a-button>
        </a-col>
      </a-row>
    </a-card>

    <!-- 表格 -->
    <a-table
        :dataSource="list"
        :loading="loading"
        :pagination="pagination"
        :rowKey="(r) => r.id"
        @change="onTableChange"
        bordered
        style="margin-top: 16px"
    >
      <a-table-column title="SKU编码" dataIndex="skuCode" width="140" />
      <a-table-column title="商品名" dataIndex="productName" :ellipsis="true" />
      <a-table-column title="规格" width="200">
        <template #default="{ record }">{{ formatSpec(record.specJson) }}</template>
      </a-table-column>
      <a-table-column title="类型" width="90" align="center">
        <template #default="{ record }">
          <a-tag :color="typeColor(record.type)">{{ typeText(record.type) }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="数量" width="100" align="right">
        <template #default="{ record }">
          <span :style="{ color: record.type === 'IN' ? '#3f8600' : '#cf1322' }">
            {{ record.type === 'IN' ? '+' : '-' }}{{ record.qty }}
          </span>
        </template>
      </a-table-column>
      <a-table-column title="结存快照" dataIndex="stockSnapshot" width="100" align="right" />
      <a-table-column title="原因" width="120">
        <template #default="{ record }">{{ reasonText(record.reason) }}</template>
      </a-table-column>
      <a-table-column title="关联单号" width="160">
        <template #default="{ record }">
          <a-link v-if="record.orderNo" @click="goOrder(record.orderItemId, record.orderNo)">{{ record.orderNo }}</a-link>
          <span v-else>—</span>
        </template>
      </a-table-column>
      <a-table-column title="操作人" dataIndex="operatorName" width="110" />
      <a-table-column title="时间" dataIndex="createTime" width="170" />
    </a-table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTransactions } from '@/api/stock.js'
import { formatSpec } from '@/utils/stock.js'

const router = useRouter()
const loading = ref(false)
const list = ref([])

const filters = reactive({
  search: '',
  type: undefined,
  reason: undefined,
  range: null,
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (t) => `共 ${t} 条`,
})

const typeText = (t) => ({ IN: '入库', OUT: '出库', ADJUST: '调整' }[t] || t)
const typeColor = (t) => ({ IN: 'green', OUT: 'orange', ADJUST: 'blue' }[t] || 'default')
const reasonText = (r) => ({
  PURCHASE: '采购入库', RETURN: '退货归还', MANUAL_IN: '手工补录',
  ORDER_SHIP: '订单发货', LOSS: '盘亏', MANUAL_OUT: '手工出库', ADJUST: '调整',
}[r] || r || '—')

const loadList = () => {
  loading.value = true
  const params = {
    skuId: filters.search || undefined,
    type: filters.type,
    reason: filters.reason,
    startTime: filters.range?.[0]?.format?.('YYYY-MM-DD HH:mm:ss'),
    endTime: filters.range?.[1]?.format?.('YYYY-MM-DD HH:mm:ss'),
    page: pagination.current,
    size: pagination.pageSize,
  }
  getTransactions(params)
      .then(res => {
        const data = res.data?.data || {}
        list.value = data.records || data.list || []
        pagination.total = data.total || 0
      })
      .catch(() => { list.value = []; pagination.total = 0 })
      .finally(() => { loading.value = false })
}

const onSearch = () => { pagination.current = 1; loadList() }
const onReset = () => {
  filters.search = ''
  filters.type = undefined
  filters.reason = undefined
  filters.range = null
  pagination.current = 1
  loadList()
}
const onTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadList()
}
const goOrder = (_orderItemId, orderNo) => {
  router.push({ path: '/orders/order-list', query: { orderNo } })
}

onMounted(loadList)
</script>

<style scoped>
.filter-card { margin-bottom: 0; }
</style>
