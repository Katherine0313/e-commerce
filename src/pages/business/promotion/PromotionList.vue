<template>
  <div>
    <!-- 工具栏：活动名称 / 状态筛选 + 新建 -->
    <div class="head">
      <a-form layout="inline">
        <a-form-item>
          <a-input v-model:value="query.keyword" placeholder="请输入活动名称" allow-clear @pressEnter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="query.status" style="width: 140px" placeholder="活动状态" allow-clear
                    :options="statusOptions" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />
            搜索
          </a-button>
        </a-form-item>
      </a-form>
      <a-button v-permission="'business:promotion:add'" type="primary" @click="openCreate">新建活动</a-button>
    </div>

    <a-table :dataSource="list" :columns="columns" :pagination="pagination" row-key="id"
             @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'time'">
          {{ record.startTime }} ~ {{ record.endTime }}
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ record.statusDesc }}</a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button size="small" @click="openDetail(record)" style="margin-right: 6px">详情</a-button>
          <a-button v-if="record.status === 'PENDING'" v-permission="'business:promotion:edit'"
                    size="small" type="primary" style="margin-right: 6px" @click="openEdit(record)">编辑</a-button>
          <a-popconfirm v-if="record.status === 'ACTIVE'" title="确定提前结束该活动？"
                        @confirm="handleEnd(record)">
            <a-button v-permission="'business:promotion:end'" size="small" danger
                      style="margin-right: 6px">提前结束</a-button>
          </a-popconfirm>
          <a-popconfirm v-if="record.status === 'PENDING'" title="确定删除该活动？"
                        @confirm="handleDelete(record)">
            <a-button v-permission="'business:promotion:remove'" size="small" danger>删除</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <!-- 新建 / 编辑活动 -->
    <a-modal v-model:visible="formVisible" :title="editingId ? '编辑活动' : '新建活动'" :width="860"
             :confirm-loading="saving" @ok="handleSubmit">
      <a-form :model="form" :label-col="{ span: 4 }">
        <a-form-item label="活动名称" required>
          <a-input v-model:value="form.name" placeholder="方便运营识别的活动名称" :maxlength="60" />
        </a-form-item>
        <a-form-item label="促销类型" required>
          <a-radio-group v-model:value="form.type" @change="handleTypeChange">
            <a-radio value="DIRECT">直减（改商品价）</a-radio>
            <a-radio value="FULL_REDUCE">满减（改商品小计）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="玩法" required>
          <a-select v-model:value="form.ruleType" :options="ruleTypeOptions" style="width: 220px"
                    @change="handleRuleTypeChange" />
        </a-form-item>
        <a-form-item label="目标人群">
          <a-select v-model:value="form.targetGroup" style="width: 220px" :options="targetOptions"
                    :disabled="form.ruleType === 'NEW_USER'" />
        </a-form-item>
        <a-form-item v-if="form.type === 'FULL_REDUCE'" label="商品范围">
          <a-radio-group v-model:value="form.scopeType">
            <a-radio value="ALL">全场</a-radio>
            <a-radio value="PRODUCT">指定商品</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="活动时间" required>
          <a-range-picker v-model:value="form.range" show-time style="width: 100%"
                          value-format="YYYY-MM-DD HH:mm:ss" :placeholder="['开始时间', '结束时间']" />
        </a-form-item>
        <a-form-item label="促销标签">
          <a-input v-model:value="form.tagName" placeholder="C 端展示，如「限时立减」" :maxlength="20" />
        </a-form-item>

        <!-- 直减类：选商品 + 逐个设置活动价 -->
        <a-form-item v-if="needProductSelect" label="活动商品" required>
          <a-select v-model:value="form.productIds" mode="multiple" show-search option-filter-prop="label"
                    :options="productOptions" placeholder="搜索并选择商品" style="width: 100%"
                    :max-tag-count="8" />
        </a-form-item>
        <a-form-item v-if="form.type === 'DIRECT' && form.productIds.length" label="活动价">
          <div class="price-list">
            <div v-for="id in form.productIds" :key="id" class="price-row">
              <span class="product-name">{{ productMap[id]?.name || id }}</span>
              <span class="origin-price">原价 ¥{{ money(productMap[id]?.salesPrice) }}</span>
              <span>活动价</span>
              <a-input-number v-model:value="form.prices[id]" :min="0.01" :precision="2" style="width: 120px" />
            </div>
          </div>
        </a-form-item>

        <!-- 满减类：阶梯配置 -->
        <a-form-item v-if="form.type === 'FULL_REDUCE'" label="满减阶梯" required>
          <div class="rule-list">
            <div v-for="(rule, index) in form.rules" :key="index" class="rule-row">
              <span>满</span>
              <a-input-number v-model:value="rule.thresholdAmount" :min="0.01" :precision="2"
                              style="width: 120px" />
              <span>元</span>
              <template v-if="form.ruleType === 'FULL_AMOUNT_REDUCE'">
                <span>减</span>
                <a-input-number v-model:value="rule.discountAmount" :min="0.01" :precision="2"
                                style="width: 120px" />
                <span>元</span>
              </template>
              <template v-else>
                <span>打</span>
                <a-input-number v-model:value="rule.discountRate" :min="0.01" :max="0.99" :step="0.05"
                                :precision="2" style="width: 120px" />
                <span>折（0.85 = 85 折）</span>
              </template>
              <a-button type="link" danger @click="removeRule(index)">删除</a-button>
            </div>
            <a-button type="dashed" @click="addRule">添加阶梯</a-button>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 活动详情 + 效果 -->
    <a-modal v-model:visible="detailVisible" title="活动详情" :width="760" :footer="null">
      <template v-if="detail">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="活动名称">{{ detail.name }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(detail.status)">{{ detail.statusDesc }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="类型">{{ detail.typeDesc }} / {{ detail.ruleTypeDesc }}</a-descriptions-item>
          <a-descriptions-item label="人群范围">{{ detail.targetGroupDesc }} · {{ detail.scopeTypeDesc }}</a-descriptions-item>
          <a-descriptions-item label="活动时间" :span="2">{{ detail.startTime }} ~ {{ detail.endTime }}</a-descriptions-item>
          <a-descriptions-item label="使用订单数">{{ detail.stats?.orderCount ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="支付单数">{{ detail.stats?.paidOrderCount ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="累计优惠" :span="2">¥{{ money(detail.stats?.discountAmount) }}</a-descriptions-item>
        </a-descriptions>

        <div v-if="detail.items?.length" class="detail-block">
          <div class="detail-title">活动商品（{{ detail.items.length }}）</div>
          <a-table :dataSource="detail.items" :columns="itemColumns" size="small" row-key="productId"
                   :pagination="false" />
        </div>
        <div v-if="detail.rules?.length" class="detail-block">
          <div class="detail-title">满减阶梯</div>
          <a-table :dataSource="detail.rules" :columns="ruleColumns" size="small" :pagination="false" />
        </div>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import {
  addPromotion,
  deletePromotion,
  endPromotion,
  getPromotionDetail,
  getPromotionList,
  updatePromotion,
} from '@/api/promotion.js'
import { getGoodsList } from '@/api/products.js'

const list = ref([])
const saving = ref(false)
const formVisible = ref(false)
const detailVisible = ref(false)
const detail = ref(null)
const editingId = ref(null)
const query = ref({ keyword: '', status: undefined })
const products = ref([])
const productMap = computed(() => {
  const map = {}
  products.value.forEach((p) => (map[p.id] = p))
  return map
})
const productOptions = computed(() =>
  products.value.map((p) => ({ value: p.id, label: `${p.name}（¥${p.salesPrice ?? '-'}）` }))
)

const statusOptions = [
  { value: 'PENDING', label: '未开始' },
  { value: 'ACTIVE', label: '进行中' },
  { value: 'ENDED', label: '已结束' },
  { value: 'CANCELLED', label: '已失效' },
]
const targetOptions = [
  { value: 'ALL', label: '全部用户' },
  { value: 'NEW_USER', label: '未下单新用户' },
]

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
})

const columns = [
  { title: '活动名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'typeDesc', key: 'typeDesc', width: 140 },
  { title: '玩法', dataIndex: 'ruleTypeDesc', key: 'ruleTypeDesc', width: 120 },
  { title: '活动时间', key: 'time', width: 330 },
  { title: '商品数', dataIndex: 'productCount', key: 'productCount', width: 80 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 260 },
]
const itemColumns = [
  { title: '商品 ID', dataIndex: 'productId', key: 'productId', width: 100 },
  { title: '商品名称', dataIndex: 'productName', key: 'productName' },
  { title: '原价', dataIndex: 'salesPrice', key: 'salesPrice', width: 100 },
  { title: '活动价', dataIndex: 'promotionPrice', key: 'promotionPrice', width: 100 },
]
const ruleColumns = [
  { title: '满额门槛', dataIndex: 'thresholdAmount', key: 'thresholdAmount' },
  { title: '满减金额', dataIndex: 'discountAmount', key: 'discountAmount' },
  { title: '折扣率', dataIndex: 'discountRate', key: 'discountRate' },
]

const form = ref(emptyForm())

function emptyForm() {
  return {
    name: '',
    type: 'DIRECT',
    ruleType: 'DISCOUNT',
    targetGroup: 'ALL',
    scopeType: 'PRODUCT',
    tagName: '',
    range: [],
    productIds: [],
    prices: {},
    rules: [{ thresholdAmount: null, discountAmount: null, discountRate: null }],
  }
}

const ruleTypeOptions = computed(() =>
  form.value.type === 'DIRECT'
    ? [
        { value: 'DISCOUNT', label: '限时折扣' },
        { value: 'NEW_USER', label: '新用户专享' },
      ]
    : [
        { value: 'FULL_AMOUNT_REDUCE', label: '满额减' },
        { value: 'FULL_AMOUNT_DISCOUNT', label: '满额折' },
      ]
)
const needProductSelect = computed(
  () => form.value.type === 'DIRECT' || form.value.scopeType === 'PRODUCT'
)

function handleTypeChange() {
  form.value.ruleType = form.value.type === 'DIRECT' ? 'DISCOUNT' : 'FULL_AMOUNT_REDUCE'
  form.value.scopeType = form.value.type === 'DIRECT' ? 'PRODUCT' : 'ALL'
  form.value.productIds = []
  form.value.prices = {}
  form.value.rules = [{ thresholdAmount: null, discountAmount: null, discountRate: null }]
}

function handleRuleTypeChange() {
  if (form.value.ruleType === 'NEW_USER') {
    form.value.targetGroup = 'NEW_USER'
  }
}

function addRule() {
  form.value.rules.push({ thresholdAmount: null, discountAmount: null, discountRate: null })
}

function removeRule(index) {
  if (form.value.rules.length <= 1) {
    message.warning('至少保留一档阶梯')
    return
  }
  form.value.rules.splice(index, 1)
}

function loadData() {
  getPromotionList({
    page: pagination.value.current,
    pageSize: pagination.value.pageSize,
    keyword: query.value.keyword || undefined,
    status: query.value.status || undefined,
  }).then((res) => {
    list.value = res.data.data.list || []
    pagination.value.total = res.data.data.total || 0
  })
}

function loadProducts() {
  getGoodsList({ page: 1, pageSize: 500 }).then((res) => {
    products.value = res.data.data.list || []
  })
}

function handleSearch() {
  pagination.value.current = 1
  loadData()
}

function handleTableChange(pager) {
  pagination.value.current = pager.current
  pagination.value.pageSize = pager.pageSize
  loadData()
}

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  formVisible.value = true
}

function openEdit(record) {
  getPromotionDetail(record.id).then((res) => {
    const data = res.data.data
    editingId.value = data.id
    const prices = {}
    ;(data.items || []).forEach((item) => {
      if (item.promotionPrice !== null && item.promotionPrice !== undefined) {
        prices[item.productId] = Number(item.promotionPrice)
      }
    })
    form.value = {
      name: data.name,
      type: data.type,
      ruleType: data.ruleType,
      targetGroup: data.targetGroup,
      scopeType: data.scopeType,
      tagName: data.tagName || '',
      range: [data.startTime, data.endTime],
      productIds: (data.items || []).map((item) => item.productId),
      prices,
      rules: (data.rules || []).length
        ? data.rules.map((rule) => ({
            thresholdAmount: Number(rule.thresholdAmount),
            discountAmount: rule.discountAmount === null ? null : Number(rule.discountAmount),
            discountRate: rule.discountRate === null ? null : Number(rule.discountRate),
          }))
        : [{ thresholdAmount: null, discountAmount: null, discountRate: null }],
    }
    formVisible.value = true
  })
}

function openDetail(record) {
  getPromotionDetail(record.id).then((res) => {
    detail.value = res.data.data
    detailVisible.value = true
  })
}

function buildPayload() {
  const isDirect = form.value.type === 'DIRECT'
  const specialScope = isDirect || form.value.scopeType === 'PRODUCT'
  const items = specialScope
    ? form.value.productIds.map((id) => ({
        productId: id,
        promotionPrice: isDirect ? form.value.prices[id] : null,
      }))
    : []
  const rules = isDirect
    ? []
    : form.value.rules.map((rule) => ({
        thresholdAmount: rule.thresholdAmount,
        discountAmount: form.value.ruleType === 'FULL_AMOUNT_REDUCE' ? rule.discountAmount : null,
        discountRate: form.value.ruleType === 'FULL_AMOUNT_DISCOUNT' ? rule.discountRate : null,
      }))
  return {
    name: form.value.name,
    type: form.value.type,
    ruleType: form.value.ruleType,
    targetGroup: form.value.ruleType === 'NEW_USER' ? 'NEW_USER' : form.value.targetGroup,
    scopeType: isDirect ? 'PRODUCT' : form.value.scopeType,
    tagName: form.value.tagName,
    startTime: form.value.range?.[0],
    endTime: form.value.range?.[1],
    items,
    rules,
  }
}

function handleSubmit() {
  const payload = buildPayload()
  if (!payload.name) {
    message.warning('请输入活动名称')
    return
  }
  if (!payload.startTime || !payload.endTime) {
    message.warning('请选择活动时间')
    return
  }
  if (payload.type === 'DIRECT') {
    if (!payload.items.length) {
      message.warning('请选择参加活动的商品')
      return
    }
    if (payload.items.some((item) => !item.promotionPrice || item.promotionPrice <= 0)) {
      message.warning('请为每个商品填写活动价')
      return
    }
  }
  if (payload.type === 'FULL_REDUCE') {
    if (payload.scopeType === 'PRODUCT' && !payload.items.length) {
      message.warning('请选择参加活动的商品')
      return
    }
    if (payload.rules.some((rule) => !rule.thresholdAmount)) {
      message.warning('请填写完整的满减阶梯')
      return
    }
  }
  saving.value = true
  const request = editingId.value
    ? updatePromotion(editingId.value, payload)
    : addPromotion(payload)
  request
    .then(() => {
      message.success(editingId.value ? '活动已更新' : '活动已创建')
      formVisible.value = false
      loadData()
    })
    .finally(() => {
      saving.value = false
    })
}

function handleEnd(record) {
  endPromotion(record.id).then(() => {
    message.success('活动已提前结束')
    loadData()
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: '删除后不可恢复，确定要删除该活动吗？',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => deletePromotion(record.id).then(() => {
      message.success('活动已删除')
      loadData()
    }),
  })
}

function statusColor(status) {
  return { PENDING: 'blue', ACTIVE: 'green', ENDED: 'default', CANCELLED: 'red' }[status] || 'default'
}

function money(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value).toFixed(2)
}

onMounted(() => {
  loadProducts()
  loadData()
})
onActivated(() => {
  loadData()
})
</script>

<style scoped>
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin: 20px 0;
}

.price-list,
.rule-list {
  width: 100%;
}

.price-row,
.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.product-name {
  width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.origin-price {
  width: 120px;
  color: #999;
}

.detail-block {
  margin-top: 16px;
}

.detail-title {
  margin-bottom: 8px;
  font-weight: 600;
}

.title :deep(.ant-table-tbody > tr > td) {
  font-size: 14px;
  text-align: center;
}

@media (max-width: 767px) {
  .head {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
