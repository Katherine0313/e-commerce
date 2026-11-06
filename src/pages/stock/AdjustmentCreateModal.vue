<template>
  <a-modal
      :visible="visible"
      title="新建调整单"
      :width="800"
      :confirm-loading="submitting"
      @ok="submit"
      @cancel="close"
      @update:visible="v => emit('update:visible', v)"
  >
    <a-form layout="vertical">
      <a-form-item label="备注（选填）">
        <a-textarea v-model:value="remark" :rows="2" show-count maxLength="200" />
      </a-form-item>
    </a-form>

    <div class="section-title">
      调整明细
      <span style="color: #8c8c8c; font-weight: 400; font-size: 12px; margin-left: 8px">
        填写调整后库存数量，差异为 0 的行将被忽略
      </span>
      <a-button type="link" style="padding-left: 8px" @click="addRow">+ 添加行</a-button>
    </div>
    <a-table :dataSource="rows" :pagination="false" size="small" row-key="rowKey" bordered>
      <a-table-column title="SKU 搜索" width="260">
        <template #default="{ record }">
          <a-select
              v-model:value="record.skuId"
              show-search
              :filter-option="false"
              :remote="true"
              :loading="searchLoading"
              placeholder="输入关键字搜索"
              style="width: 100%"
              @search="onSkuSearch"
              @change="(v) => onSkuSelect(v, record)"
              allow-clear
          >
            <a-select-option
                v-for="opt in skuOptions"
                :key="opt.skuId"
                :value="opt.skuId"
            >
              {{ opt.productName }} - {{ opt.skuCode }} - {{ opt.specText }}
            </a-select-option>
          </a-select>
        </template>
      </a-table-column>
      <a-table-column title="SKU编码" width="120">
        <template #default="{ record }">{{ record.skuCode || '—' }}</template>
      </a-table-column>
      <a-table-column title="规格" width="160">
        <template #default="{ record }">{{ record.specText || '—' }}</template>
      </a-table-column>
      <a-table-column title="当前库存" width="100" align="right">
        <template #default="{ record }">{{ record.currentStock ?? '—' }}</template>
      </a-table-column>
      <a-table-column title="调整后数量" width="130" align="center">
        <template #default="{ record }">
          <a-input-number
              v-model:value="record.afterQty"
              :min="0" :precision="0"
              :disabled="record.currentStock == null"
              style="width: 100px"
          />
        </template>
      </a-table-column>
      <a-table-column title="差异" width="100" align="center">
        <template #default="{ record }">
          <span v-if="diffOf(record) !== 0" :style="{ color: diffColor(diffOf(record)), fontWeight: 600 }">
            {{ diffText(diffOf(record)) }}
          </span>
          <span v-else style="color: #bfbfbf">0</span>
        </template>
      </a-table-column>
      <a-table-column title="操作" width="70" align="center">
        <template #default="{ $index }">
          <a-button type="link" danger size="small" @click="removeRow($index)">删除</a-button>
        </template>
      </a-table-column>
    </a-table>
    <a-empty v-if="rows.length === 0" description="请至少添加一行调整明细" />
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import axios from '@/api/request.js'
import { createStockOrder } from '@/api/stock.js'
import { formatSpec } from '@/utils/stock.js'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['update:visible', 'created'])

const close = () => emit('update:visible', false)

const remark = ref('')
const rows = ref([])
let rowSeq = 0

const addRow = () => {
  rows.value.push({
    rowKey: ++rowSeq,
    skuId: undefined,
    skuCode: '',
    skuName: '',
    specText: '',
    currentStock: null,
    afterQty: null,
  })
}

const removeRow = (idx) => { rows.value.splice(idx, 1) }

// 差异计算（+N 绿色 / -N 红色）
const diffOf = (r) => {
  if (r.currentStock == null || r.afterQty == null) return 0
  return Number(r.afterQty) - Number(r.currentStock)
}
const diffColor = (d) => d > 0 ? '#3f8600' : d < 0 ? '#cf1322' : '#8c8c8c'
const diffText = (d) => d > 0 ? `+${d}` : `${d}`

// ====== SKU 搜索（和 ReceiptCreateModal 同款）======
const searchLoading = ref(false)
const skuOptions = ref([])

const onSkuSearch = (keyword) => {
  if (!keyword) { skuOptions.value = []; return }
  searchLoading.value = true
  axios.get('/api/admin/products', { params: { search: keyword, page: 1, size: 10 } })
      .then(res => {
        const products = res.data?.data?.records || res.data?.data?.list || []
        const opts = []
        products.forEach(p => {
          ;(p.skus || []).forEach(sku => {
            opts.push({
              skuId: sku.id ?? sku.skuId,
              skuCode: sku.skuCode || '',
              productName: p.name,
              specJson: sku.specJson || sku.spec_json,
              specText: formatSpec(sku.specJson || sku.spec_json),
              currentStock: sku.stock,
            })
          })
        })
        skuOptions.value = opts
      })
      .catch(() => { skuOptions.value = [] })
      .finally(() => { searchLoading.value = false })
}

const onSkuSelect = (skuId, record) => {
  const opt = skuOptions.value.find(o => o.skuId === skuId)
  if (!opt) return
  record.skuCode = opt.skuCode
  record.skuName = opt.productName
  record.specText = opt.specText
  record.currentStock = opt.currentStock
  record.afterQty = opt.currentStock
}

// ====== 提交 ======
const submitting = ref(false)

const submit = () => {
  if (rows.value.length === 0) { message.warning('请至少添加一行明细'); return }
  const items = []
  for (const r of rows.value) {
    if (!r.skuId) { message.warning('有行未选择 SKU'); return }
    if (r.afterQty == null) { message.warning('有行未填写调整后数量'); return }
    const diff = diffOf(r)
    if (diff === 0) continue // 差异为 0 的跳过
    items.push({
      skuId: r.skuId,
      skuCode: r.skuCode,
      skuName: r.skuName,
      specText: r.specText,
      qty: diff,
      afterQty: r.afterQty,
    })
  }
  if (items.length === 0) { message.warning('所有行差异均为 0，不生成调整单'); return }

  submitting.value = true
  createStockOrder({
    type: 'ADJUST',
    remark: remark.value || undefined,
    items,
  })
      .then(() => {
        message.success('调整单创建成功')
        emit('created')
        close()
      })
      .catch(() => {})
      .finally(() => { submitting.value = false })
}

watch(() => props.visible, (v) => {
  if (v) {
    remark.value = ''
    rows.value = []
    skuOptions.value = []
  }
})

// 占位避免 unused 报错
void computed
</script>

<style scoped>
.section-title {
  font-weight: 600;
  color: #262626;
  margin-bottom: 8px;
}
</style>
