<template>
  <div>
    <!-- 顶部过滤区 -->
    <div class="filter-bar">
      <a-input-search
          placeholder="商品名 / SKU编码 模糊搜索"
          enter-button="搜索"
          v-model:value="search"
          @search="onSearch"
          allow-clear
          style="width: 280px"
      />
      <span class="filter-label">仅低库存</span>
      <a-switch v-model:checked="lowStockOnly" @change="onSearch" />
    </div>

    <!-- 主表格 -->
    <a-table
        :dataSource="list"
        :loading="loading"
        :pagination="pagination"
        :rowKey="(r) => r.id"
        @change="onTableChange"
        bordered
    >
      <a-table-column title="商品图">
        <template #default="{ record }">
          <img v-if="record.productImage" :src="record.productImage" width="48" height="48"
               style="object-fit: cover; border-radius: 4px" />
          <span v-else style="color: #bfbfbf">—</span>
        </template>
      </a-table-column>
      <a-table-column title="商品名" dataIndex="productName" />
      <a-table-column title="SKU编码" dataIndex="skuCode">
        <template #default="{ record }">
          <span>{{ record.skuCode || '—' }}</span>
        </template>
      </a-table-column>
      <a-table-column title="规格组合">
        <template #default="{ record }">
          <span>{{ formatSpec(record.specJson) }}</span>
        </template>
      </a-table-column>
      <a-table-column title="当前库存" dataIndex="stock"  />
      <a-table-column title="安全阈值" align="center">
        <template #default="{ record }">
          <span v-if="record.minStock != null || record.maxStock != null">
            {{ record.minStock ?? '—' }} ~ {{ record.maxStock ?? '—' }}
          </span>
          <span v-else style="color: #bfbfbf">未设置</span>
        </template>
      </a-table-column>
      <a-table-column title="库存状态" align="center">
        <template #default="{ record }">
          <a-tag :color="skuStatus(record).color">{{ skuStatus(record).text }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="操作">
        <template #default="{ record }">
          <a-button type="primary" size="small" @click="openEditModal(record)">编辑</a-button>
          <a-button type="link" size="small" @click="openAlertModal(record)">设阈值</a-button>
        </template>
      </a-table-column>
    </a-table>

    <!-- 设阈值弹窗 -->
    <a-modal
        v-model:visible="alertVisible"
        title="设置库存安全阈值"
        :confirm-loading="alertSubmitting"
        @ok="submitAlert"
    >
      <div style="margin-bottom: 12px; color: #595959">
        当前 SKU：<b>{{ alertRecord?.productName }}</b>
        <span style="margin-left: 8px; color: #8c8c8c">{{ alertRecord?.skuCode }}</span>
      </div>
      <div style="margin-bottom: 12px; color: #595959">
        规格：<b>{{ formatSpec(alertRecord?.specJson) }}</b>
      </div>
      <div style="margin-bottom: 16px; color: #595959">
        当前库存：<b>{{ alertRecord?.stock ?? 0 }}</b>
      </div>
      <a-form layout="inline">
        <a-form-item label="下限（低于此值预警）">
          <a-input-number v-model:value="alertForm.minStock" :min="0" placeholder="未设置" />
        </a-form-item>
        <a-form-item label="上限（高于此值预警）">
          <a-input-number v-model:value="alertForm.maxStock" :min="0" placeholder="未设置" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑库存弹窗：填实盘数量，后台自动生成调整单 + 流水留痕 -->
    <a-modal
        v-model:visible="editVisible"
        title="编辑库存"
        :confirm-loading="editSubmitting"
        @ok="submitEdit"
    >
      <div style="margin-bottom: 12px; color: #595959">
        当前 SKU：<b>{{ editRecord?.productName }}</b>
        <span style="margin-left: 8px; color: #8c8c8c">{{ editRecord?.skuCode }}</span>
      </div>
      <div style="margin-bottom: 12px; color: #595959">
        规格：<b>{{ formatSpec(editRecord?.specJson) }}</b>
      </div>
      <div style="margin-bottom: 16px; color: #595959">
        当前库存：<b>{{ editRecord?.stock ?? 0 }}</b>
      </div>
      <a-form layout="inline">
        <a-form-item label="实盘数量">
          <a-input-number v-model:value="editForm.newStock" :min="0" placeholder="盘点后的实际数量" />
        </a-form-item>
        <a-form-item label="原因">
          <a-select v-model:value="editForm.reason" style="width: 140px">
            <a-select-option value="盘点调整">盘点调整</a-select-option>
            <a-select-option value="破损调整">破损调整</a-select-option>
            <a-select-option value="期初录入">期初录入</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getSkuStockList, setSkuAlert, createStockOrder } from '@/api/stock.js'
import { formatSpec, skuStatus } from '@/utils/stock.js'
import { message } from 'ant-design-vue'

const loading = ref(false)
const list = ref([])
const search = ref('')
const lowStockOnly = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (t) => `共 ${t} 条`,
})

const loadList = () => {
  loading.value = true
  const params = {
    page: pagination.current,
    size: pagination.pageSize,
    search: search.value || undefined,
    lowStockOnly: lowStockOnly.value ? 1 : 0,
  }
  getSkuStockList(params)
      .then(res => {
        const data = res.data?.data || {}
        list.value = data.records || data.list || []
        pagination.total = data.total || 0
      })
      .catch(() => {
        list.value = []
        pagination.total = 0
      })
      .finally(() => {
        loading.value = false
      })
}

const onSearch = () => {
  pagination.current = 1
  loadList()
}

const onTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadList()
}

// ============== 设阈值弹窗 ==============
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
  if (alertForm.minStock != null && alertForm.maxStock != null
      && alertForm.minStock >= alertForm.maxStock) {
    message.warning('下限必须小于上限')
    return
  }
  alertSubmitting.value = true
  setSkuAlert(alertRecord.value.id, {
    minStock: alertForm.minStock,
    maxStock: alertForm.maxStock,
  })
      .then(() => {
        message.success('阈值保存成功')
        alertVisible.value = false
        loadList()
      })
      .catch(() => {})
      .finally(() => {
        alertSubmitting.value = false
      })
}

// ============== 编辑库存弹窗 ==============
const editVisible = ref(false)
const editSubmitting = ref(false)
const editRecord = ref(null)
const editForm = reactive({ newStock: null, reason: '盘点调整' })

const openEditModal = (record) => {
  editRecord.value = record
  editForm.newStock = record.stock ?? 0
  editForm.reason = '盘点调整'
  editVisible.value = true
}

const submitEdit = () => {
  if (editForm.newStock == null) { message.warning('请填写实盘数量'); return }
  const diff = editForm.newStock - (editRecord.value.stock ?? 0)
  if (diff === 0) { message.info('与当前库存一致，无需调整'); return }
  editSubmitting.value = true
  // 走调整单接口：后台自动生成 PD 单 + 库存流水，留痕可查
  createStockOrder({
    type: 'ADJUST',
    bizType: editForm.reason === '盘点调整' ? 'ADJUST' : 'MANUAL',
    remark: `列表编辑库存（${editForm.reason}）`,
    items: [{
      skuId: editRecord.value.id,
      skuCode: editRecord.value.skuCode,
      skuName: editRecord.value.productName,
      specText: formatSpec(editRecord.value.specJson),
      qty: diff,
    }],
  })
      .then(() => {
        message.success('库存已更新')
        editVisible.value = false
        loadList()
      })
      .catch(() => {})
      .finally(() => {
        editSubmitting.value = false
      })
}

onMounted(loadList)
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.filter-label {
  color: #595959;
  font-size: 14px;
}
</style>
