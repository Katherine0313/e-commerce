<template>
  <div>
    <!-- 过滤区 -->
    <a-card :bordered="false" class="filter-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="4">
          <a-select placeholder="类型" v-model:value="filters.bizType" allow-clear style="width: 100%">
            <a-select-option value="PURCHASE">采购入库</a-select-option>
            <a-select-option value="RETURN">退货归还</a-select-option>
            <a-select-option value="MANUAL">手工补录</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="4">
          <a-select placeholder="状态" v-model:value="filters.status" allow-clear style="width: 100%">
            <a-select-option value="DRAFT">草稿</a-select-option>
            <a-select-option value="CONFIRMED">已确认</a-select-option>
            <a-select-option value="CANCELLED">已取消</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="12" :md="4">
          <a-input-search placeholder="关联单号" v-model:value="filters.relatedNo" allow-clear @search="onSearch" />
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-range-picker v-model:value="filters.range" style="width: 100%" show-time format="YYYY-MM-DD HH:mm" />
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-button type="primary" @click="onSearch">查询</a-button>
          <a-button style="margin-left: 8px" @click="onReset">重置</a-button>
          <a-button type="primary" style="margin-left: 8px" @click="openCreate">+ 新建入库单</a-button>
        </a-col>
      </a-row>
    </a-card>

    <!-- 列表 -->
    <a-table
        :dataSource="list"
        :loading="loading"
        :pagination="pagination"
        :rowKey="(r) => r.id"
        @change="onTableChange"
        bordered
        style="margin-top: 16px"
    >
      <a-table-column title="单据号" dataIndex="orderNo" />
      <a-table-column title="类型" align="center">
        <template #default="{ record }">
          <a-tag color="green">{{ bizTypeText(record.bizType) }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="关联单号" dataIndex="relatedNo">
        <template #default="{ record }">{{ record.relatedNo || '—' }}</template>
      </a-table-column>
      <a-table-column title="明细行数" dataIndex="itemCount" align="right" />
      <a-table-column title="总数量" dataIndex="totalQty" align="right" />
      <a-table-column title="状态" align="center">
        <template #default="{ record }">
          <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="操作人" dataIndex="operatorName" />
      <a-table-column title="时间" dataIndex="createTime" />
      <a-table-column title="操作">
        <template #default="{ record }">
          <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
          <a-button v-if="record.status === 'CONFIRMED'" type="link" size="small" danger
                    @click="handleCancel(record)">取消</a-button>
        </template>
      </a-table-column>
    </a-table>

    <!-- 详情弹窗 -->
    <a-modal v-model:visible="detailVisible" title="入库单详情" :width="800" :footer="null">
      <a-descriptions :column="2" bordered v-if="detail">
        <a-descriptions-item label="单据号">{{ detail.orderNo }}</a-descriptions-item>
        <a-descriptions-item label="类型">{{ bizTypeText(detail.bizType) }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="statusColor(detail.status)">{{ statusText(detail.status) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="关联单号">{{ detail.relatedNo || '—' }}</a-descriptions-item>
        <a-descriptions-item label="操作人">{{ detail.operatorName }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">{{ detail.createTime }}</a-descriptions-item>
        <a-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</a-descriptions-item>
      </a-descriptions>
      <a-divider>明细</a-divider>
      <a-table :dataSource="detail?.items || []" :pagination="false" size="small" row-key="id" bordered>
        <a-table-column title="SKU编码" dataIndex="skuCode" />
        <a-table-column title="商品名" dataIndex="skuName" :ellipsis="true" />
        <a-table-column title="规格">
          <template #default="{ record }">{{ formatSpec(record.specJson) }}</template>
        </a-table-column>
        <a-table-column title="数量" dataIndex="qty" align="right" />
        <a-table-column title="成本价" align="right">
          <template #default="{ record }">{{ record.costPrice != null ? '￥' + record.costPrice : '—' }}</template>
        </a-table-column>
      </a-table>
    </a-modal>

    <!-- 新建入库单 -->
    <ReceiptCreateModal
        v-model:visible="createVisible"
        @created="loadList"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getStockOrders, getStockOrderDetail, cancelStockOrder } from '@/api/stock.js'
import { formatSpec } from '@/utils/stock.js'
import ReceiptCreateModal from './ReceiptCreateModal.vue'

const loading = ref(false)
const list = ref([])
const detail = ref(null)
const detailVisible = ref(false)
const createVisible = ref(false)

const filters = reactive({
  bizType: undefined,
  status: undefined,
  relatedNo: '',
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

const bizTypeText = (t) => ({ PURCHASE: '采购入库', RETURN: '退货归还', MANUAL: '手工补录' }[t] || t)
const statusText = (s) => ({ DRAFT: '草稿', CONFIRMED: '已确认', CANCELLED: '已取消' }[s] || s)
const statusColor = (s) => ({ DRAFT: 'default', CONFIRMED: 'green', CANCELLED: 'red' }[s] || 'default')

const loadList = () => {
  loading.value = true
  const params = {
    type: 'RECEIPT',
    bizType: filters.bizType,
    status: filters.status,
    relatedNo: filters.relatedNo || undefined,
    startTime: filters.range?.[0]?.format?.('YYYY-MM-DD HH:mm:ss'),
    endTime: filters.range?.[1]?.format?.('YYYY-MM-DD HH:mm:ss'),
    page: pagination.current,
    size: pagination.pageSize,
  }
  getStockOrders(params)
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
  filters.bizType = undefined; filters.status = undefined; filters.relatedNo = ''; filters.range = null
  pagination.current = 1
  loadList()
}
const onTableChange = (pag) => { pagination.current = pag.current; pagination.pageSize = pag.pageSize; loadList() }

const openDetail = (record) => {
  getStockOrderDetail(record.id)
      .then(res => { detail.value = res.data?.data || record; detailVisible.value = true })
      .catch(() => { detail.value = record; detailVisible.value = true })
}

const openCreate = () => { createVisible.value = true }

const handleCancel = (record) => {
  Modal.confirm({
    title: '确认取消该入库单？',
    content: `单据号 ${record.orderNo}，取消后无法恢复`,
    okType: 'danger',
    onOk() {
      return cancelStockOrder(record.id).then(() => {
        message.success('已取消')
        loadList()
      })
    },
  })
}

onMounted(loadList)
</script>

<style scoped>
.filter-card { margin-bottom: 0; }
</style>
