<template>
  <div>
    <!-- 4 张统计卡 -->
    <a-row :gutter="16">
      <a-col :xs="24" :sm="12" :md="6" v-for="(card, idx) in statCards" :key="idx">
        <MiniStatisticCard :title="card.title" :value="card.value" :change="card.change">
          <template #icon>
            <component :is="card.iconComponent" style="font-size: 48px; opacity: 0.2" />
          </template>
        </MiniStatisticCard>
      </a-col>
    </a-row>

    <!-- 30 天出入库趋势 -->
    <a-card title="30 天出入库趋势" :bordered="false" style="margin-top: 16px">
      <div ref="trendRef" style="width: 100%; height: 320px"></div>
      <a-empty v-if="!trendData.length" description="暂无库存流水数据" />
    </a-card>

    <!-- 低库存 TOP -->
    <a-card title="低库存 SKU TOP 20" :bordered="false" style="margin-top: 16px">
      <a-table
          :dataSource="lowStockList"
          :loading="lowLoading"
          :pagination="false"
          :rowKey="(r) => r.skuId"
          size="middle"
          bordered
      >
        <a-table-column title="商品名" dataIndex="productName" :ellipsis="true" />
        <a-table-column title="SKU 规格" width="200">
          <template #default="{ record }">{{ formatSpec(record.specJson) }}</template>
        </a-table-column>
        <a-table-column title="当前库存" dataIndex="stock" width="100" align="right" />
        <a-table-column title="安全下限" dataIndex="minStock" width="100" align="right" />
        <a-table-column title="操作" width="120">
          <template #default="{ record }">
            <a-button type="link" size="small" @click="openAlertModal(record)">设阈值</a-button>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <!-- 设阈值弹窗 -->
    <a-modal
        v-model:visible="alertVisible"
        title="设置库存安全阈值"
        :confirm-loading="alertSubmitting"
        @ok="submitAlert"
    >
      <div style="margin-bottom: 12px; color: #595959">
        当前 SKU：<b>{{ alertRecord?.productName }}</b>
      </div>
      <div style="margin-bottom: 12px; color: #595959">
        规格：<b>{{ formatSpec(alertRecord?.specJson) }}</b>
      </div>
      <div style="margin-bottom: 16px; color: #595959">
        当前库存：<b>{{ alertRecord?.stock ?? 0 }}</b>
      </div>
      <a-form layout="inline">
        <a-form-item label="下限">
          <a-input-number v-model:value="alertForm.minStock" :min="0" placeholder="未设置" />
        </a-form-item>
        <a-form-item label="上限">
          <a-input-number v-model:value="alertForm.maxStock" :min="0" placeholder="未设置" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { InboxOutlined, DownloadOutlined, UploadOutlined, WarningOutlined } from '@ant-design/icons-vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getDashboard, getTrend, getLowStockSku, setSkuAlert } from '@/api/stock.js'
import { formatSpec } from '@/utils/stock.js'
import MiniStatisticCard from '@/components/statistic/MiniStatisticCard.vue'
import { message } from 'ant-design-vue'

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// ============ 看板 ============
const dashboard = ref({})
const statCards = computed(() => [
  {
    title: 'SKU 总数',
    value: dashboard.value.skuTotal ?? 0,
    iconComponent: InboxOutlined,
  },
  {
    title: '今日入库',
    value: dashboard.value.todayIn ?? 0,
    change: '+今日',
    iconComponent: DownloadOutlined,
  },
  {
    title: '今日出库',
    value: dashboard.value.todayOut ?? 0,
    change: '+今日',
    iconComponent: UploadOutlined,
  },
  {
    title: '低库存预警',
    value: dashboard.value.lowStockSku ?? 0,
    iconComponent: WarningOutlined,
  },
])

// ============ 趋势图 ============
const trendRef = ref(null)
let trendChart = null
const trendData = ref([])

const initTrendChart = () => {
  if (!trendRef.value) return
  trendChart = echarts.init(trendRef.value)
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['入库', '出库'] },
    grid: { top: 40, left: 50, right: 20, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: trendData.value.map(d => d.date) },
    yAxis: { type: 'value' },
    series: [
      {
        name: '入库',
        type: 'bar',
        barWidth: 14,
        itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        data: trendData.value.map(d => d.in),
      },
      {
        name: '出库',
        type: 'bar',
        barWidth: 14,
        itemStyle: { color: '#fa8c16', borderRadius: [4, 4, 0, 0] },
        data: trendData.value.map(d => d.out),
      },
    ],
  }
  trendChart.setOption(option)
}

const refreshTrendChart = () => {
  if (trendChart) {
    trendChart.setOption({
      xAxis: { data: trendData.value.map(d => d.date) },
      series: [
        { data: trendData.value.map(d => d.in) },
        { data: trendData.value.map(d => d.out) },
      ],
    })
  }
}

const handleResize = () => trendChart?.resize()
window.addEventListener('resize', handleResize)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  trendChart = null
})

// ============ 低库存列表 ============
const lowStockList = ref([])
const lowLoading = ref(false)

// ============ 设阈值弹窗（简单版） ============
const alertVisible = ref(false)
const alertSubmitting = ref(false)
const alertRecord = ref(null)
const alertForm = reactive({ minStock: null, maxStock: null })

const openAlertModal = (record) => {
  alertRecord.value = record
  alertForm.minStock = record.minStock ?? null
  alertForm.maxStock = record.maxStock ?? null
  alertVisible.value = true
}

const submitAlert = () => {
  alertSubmitting.value = true
  setSkuAlert(alertRecord.value.skuId, {
    minStock: alertForm.minStock,
    maxStock: alertForm.maxStock,
  })
      .then(() => {
        message.success('阈值保存成功')
        alertVisible.value = false
        loadLowStock()
      })
      .catch(() => {})
      .finally(() => { alertSubmitting.value = false })
}

// ============ 初始化 ============
const loadAll = () => {
  getDashboard().then(res => { dashboard.value = res.data?.data || {} }).catch(() => {})
  getTrend(30).then(res => {
    trendData.value = res.data?.data || []
    nextTick(() => {
      if (!trendChart) initTrendChart()
      else refreshTrendChart()
    })
  }).catch(() => {})
  loadLowStock()
}

const loadLowStock = () => {
  lowLoading.value = true
  getLowStockSku(20)
      .then(res => { lowStockList.value = res.data?.data || [] })
      .catch(() => { lowStockList.value = [] })
      .finally(() => { lowLoading.value = false })
}

onMounted(loadAll)
</script>
