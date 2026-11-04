<template>
  <div>
    <!-- 工具栏：名称 / 状态筛选 + 新建 -->
    <div class="head">
      <a-form layout="inline">
        <a-form-item>
          <a-input v-model:value="query.keyword" placeholder="请输入券名称" allow-clear @pressEnter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="query.status" style="width: 140px" placeholder="券状态" allow-clear
                    :options="statusOptions" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />
            搜索
          </a-button>
        </a-form-item>
      </a-form>
      <a-button v-permission="'business:coupon:add'" type="primary" @click="openCreate">新建优惠券</a-button>
    </div>

    <a-table :dataSource="list" :columns="columns" :pagination="pagination" row-key="id"
             @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'value'">
          <span>{{ couponValue(record) }}</span>
        </template>
        <template v-else-if="column.key === 'threshold'">
          {{ record.thresholdAmount > 0 ? '满 ¥' + money(record.thresholdAmount) : '无门槛' }}
        </template>
        <template v-else-if="column.key === 'memberLevel'">
          {{ memberLevelText(record.minMemberLevel) }}
        </template>
        <template v-else-if="column.key === 'receiveTime'">
          {{ record.receiveStart }} ~ {{ record.receiveEnd }}
        </template>
        <template v-else-if="column.key === 'quantity'">
          {{ record.issuedCount || 0 }} / {{ record.totalQuantity }}
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ record.statusDesc }}</a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button size="small" @click="openDetail(record)" style="margin-right: 6px">详情</a-button>
          <a-button v-if="record.status === 'PENDING'" v-permission="'business:coupon:edit'"
                    size="small" type="primary" style="margin-right: 6px" @click="openEdit(record)">编辑</a-button>
          <a-button v-if="canGrant(record)" v-permission="'business:coupon:grant'"
                    size="small" type="primary" style="margin-right: 6px" @click="openGrant(record)">发券</a-button>
          <a-popconfirm v-if="record.status === 'PENDING' || record.status === 'ACTIVE'"
                        title="确定停止发放该券？" @confirm="handleStop(record)">
            <a-button v-permission="'business:coupon:edit'" size="small" danger
                      style="margin-right: 6px">停止</a-button>
          </a-popconfirm>
          <a-popconfirm v-if="record.status === 'PENDING'" title="确定删除该券？" @confirm="handleDelete(record)">
            <a-button v-permission="'business:coupon:remove'" size="small" danger>删除</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <!-- 新建 / 编辑 -->
    <a-modal v-model:visible="formVisible" :title="editingId ? '编辑优惠券' : '新建优惠券'" :width="820"
             :confirm-loading="saving" @ok="handleSubmit">
      <a-form :model="form" :label-col="{ span: 4 }">
        <a-form-item label="券名称" required>
          <a-input v-model:value="form.name" :maxlength="60" placeholder="如「新人立减 10 元」" />
        </a-form-item>
        <a-form-item label="券类型" required>
          <a-radio-group v-model:value="form.type">
            <a-radio value="FIXED">满减券</a-radio>
            <a-radio value="DISCOUNT">折扣券</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="form.type === 'FIXED'" label="满减金额" required>
          <a-input-number v-model:value="form.faceValue" :min="0.01" :precision="2" style="width: 160px" />
          <span class="unit">元</span>
        </a-form-item>
        <template v-else>
          <a-form-item label="折扣率" required>
            <a-input-number v-model:value="form.discountRate" :min="0.01" :max="0.99" :step="0.05"
                            :precision="2" style="width: 160px" />
            <span class="unit">（0.85 = 85 折）</span>
          </a-form-item>
          <a-form-item label="最高优惠">
            <a-input-number v-model:value="form.maxDiscount" :min="0.01" :precision="2" style="width: 160px" />
            <span class="unit">元，留空不封顶</span>
          </a-form-item>
        </template>
        <a-form-item label="使用门槛">
          <a-input-number v-model:value="form.thresholdAmount" :min="0" :precision="2" style="width: 160px" />
          <span class="unit">元，0 = 无门槛</span>
        </a-form-item>
        <a-form-item label="适用商品" required>
          <a-radio-group v-model:value="form.scopeType">
            <a-radio value="ALL">全场</a-radio>
            <a-radio value="CATEGORY">指定分类</a-radio>
            <a-radio value="PRODUCT">指定商品</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="form.scopeType === 'CATEGORY'" label="选择分类" required>
          <a-select v-model:value="form.categoryIds" mode="multiple" show-search option-filter-prop="label"
                    :options="categoryOptions" placeholder="请选择分类" style="width: 100%" :max-tag-count="8" />
        </a-form-item>
        <a-form-item v-if="form.scopeType === 'PRODUCT'" label="选择商品" required>
          <a-select v-model:value="form.productIds" mode="multiple" show-search option-filter-prop="label"
                    :options="productOptions" placeholder="搜索并选择商品" style="width: 100%" :max-tag-count="8" />
        </a-form-item>
        <a-form-item label="目标人群">
          <a-select v-model:value="form.targetGroup" style="width: 220px" :options="targetOptions" />
        </a-form-item>
        <a-form-item label="会员门槛">
          <a-select v-model:value="form.minMemberLevel" style="width: 220px"
                    :options="memberLevelOptions" />
          <span class="unit">达到该等级才可领取/使用</span>
        </a-form-item>
        <a-form-item label="发行总量" required>
          <a-input-number v-model:value="form.totalQuantity" :min="1" :precision="0" style="width: 160px" />
          <span class="unit">张（每人限领 1 张）</span>
        </a-form-item>
        <a-form-item label="领取时间" required>
          <a-range-picker v-model:value="form.receiveRange" show-time style="width: 100%"
                          value-format="YYYY-MM-DD HH:mm:ss" />
        </a-form-item>
        <a-form-item label="有效期" required>
          <a-radio-group v-model:value="form.validType">
            <a-radio value="FIXED">固定时段</a-radio>
            <a-radio value="RECEIVE_DAYS">领取后 N 天</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="form.validType === 'FIXED'" label="有效时段" required>
          <a-range-picker v-model:value="form.validRange" show-time style="width: 100%"
                          value-format="YYYY-MM-DD HH:mm:ss" />
        </a-form-item>
        <a-form-item v-else label="有效天数" required>
          <a-input-number v-model:value="form.validDays" :min="1" :max="365" :precision="0" style="width: 160px" />
          <span class="unit">天</span>
        </a-form-item>
        <a-form-item label="使用说明">
          <a-textarea v-model:value="form.description" :maxlength="200" :rows="2"
                      placeholder="如「限本店商品使用，不与其他券叠加」" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 发券 -->
    <a-modal v-model:visible="grantVisible" title="发放优惠券" :width="560" :confirm-loading="granting"
             @ok="handleGrant">
      <a-form :label-col="{ span: 5 }">
        <a-form-item label="券名称">{{ grantTarget?.name }}</a-form-item>
        <a-form-item label="发放对象">
          <a-radio-group v-model:value="grantForm.allUsers">
            <a-radio :value="false">指定用户</a-radio>
            <a-radio :value="true">全部用户</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="!grantForm.allUsers" label="用户 ID">
          <a-textarea v-model:value="grantForm.userIds" :rows="4"
                      placeholder="多个用户 ID 用逗号、空格或换行分隔" />
        </a-form-item>
        <a-form-item label="剩余库存">{{ grantTarget?.remainQuantity || 0 }} 张</a-form-item>
      </a-form>
    </a-modal>

    <!-- 详情 / 记录 -->
    <a-modal v-model:visible="detailVisible" title="优惠券详情" :width="820" :footer="null">
      <template v-if="detail">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="券名称">{{ detail.name }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColor(detail.status)">{{ detail.statusDesc }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="类型">{{ detail.typeDesc }}：{{ couponValue(detail) }}</a-descriptions-item>
          <a-descriptions-item label="适用范围">{{ detail.scopeTypeDesc }} · {{ detail.targetGroupDesc }}</a-descriptions-item>
          <a-descriptions-item label="领取时间" :span="2">{{ detail.receiveStart }} ~ {{ detail.receiveEnd }}</a-descriptions-item>
          <a-descriptions-item label="有效期" :span="2">{{ validityText(detail) }}</a-descriptions-item>
          <a-descriptions-item label="发行 / 剩余">{{ detail.totalQuantity }} / {{ detail.remainQuantity }}</a-descriptions-item>
          <a-descriptions-item label="领取 / 使用">{{ detail.issuedCount || 0 }} / {{ detail.usedCount || 0 }}</a-descriptions-item>
          <a-descriptions-item label="累计优惠">¥{{ money(detail.usedDiscount) }}</a-descriptions-item>
          <a-descriptions-item label="使用说明">{{ detail.description || '—' }}</a-descriptions-item>
        </a-descriptions>

        <div class="detail-block">
          <div class="detail-title">领取 / 使用记录</div>
          <a-table :dataSource="records" :columns="recordColumns" size="small" row-key="id"
                   :pagination="recordPagination" @change="handleRecordPageChange" />
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
  addCoupon,
  deleteCoupon,
  getCouponDetail,
  getCouponList,
  getCouponRecords,
  grantCoupon,
  stopCoupon,
  updateCoupon,
} from '@/api/coupon.js'
import { getCategoryTree, getGoodsList } from '@/api/products.js'
import { getMemberLevels } from '@/api/member.js'
import { maskPhone } from '@/utils/mask.js'

const list = ref([])
const saving = ref(false)
const formVisible = ref(false)
const editingId = ref(null)
const query = ref({ keyword: '', status: undefined })
const products = ref([])
const categories = ref([])
const memberLevels = ref([])

const grantVisible = ref(false)
const granting = ref(false)
const grantTarget = ref(null)
const grantForm = ref({ allUsers: false, userIds: '' })

const detailVisible = ref(false)
const detail = ref(null)
const records = ref([])
const recordPagination = ref({ current: 1, pageSize: 10, total: 0, showSizeChanger: false })

const statusOptions = [
  { value: 'PENDING', label: '未开始' },
  { value: 'ACTIVE', label: '发放中' },
  { value: 'ENDED', label: '已结束' },
  { value: 'STOPPED', label: '已停止' },
]
const targetOptions = [
  { value: 'ALL', label: '全部用户' },
  { value: 'NEW_USER', label: '未下单新用户' },
]

const productOptions = computed(() =>
  products.value.map((p) => ({ value: p.id, label: `${p.name}（¥${p.salesPrice ?? '-'}）` }))
)
const memberLevelOptions = computed(() => [
  { value: 0, label: '不限等级' },
  ...memberLevels.value.map((level) => ({ value: level.id, label: level.name })),
])
const categoryOptions = computed(() => {
  const options = []
  const walk = (nodes, prefix) => {
    nodes.forEach((c) => {
      options.push({ value: c.id, label: prefix + c.name })
      if (c.children?.length) walk(c.children, prefix + '　')
    })
  }
  walk(categories.value, '')
  return options
})

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
})

const columns = [
  { title: '券名称', dataIndex: 'name', key: 'name' },
  { title: '优惠', key: 'value', width: 160 },
  { title: '门槛', key: 'threshold', width: 110 },
  { title: '范围', dataIndex: 'scopeTypeDesc', key: 'scopeTypeDesc', width: 110 },
  { title: '会员门槛', key: 'memberLevel', width: 110 },
  { title: '领取时间', key: 'receiveTime', width: 330 },
  { title: '领取 / 发行', key: 'quantity', width: 110 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 300 },
]
const recordColumns = [
  { title: '券码', dataIndex: 'code', key: 'code', width: 190 },
  { title: '用户', dataIndex: 'userName', key: 'userName' },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130, customRender: ({ text }) => maskPhone(text) },
  { title: '状态', dataIndex: 'statusDesc', key: 'statusDesc', width: 90 },
  { title: '领取时间', dataIndex: 'receiveTime', key: 'receiveTime', width: 170 },
  { title: '使用时间', dataIndex: 'usedTime', key: 'usedTime', width: 170 },
]

const form = ref(emptyForm())

function emptyForm() {
  return {
    name: '',
    type: 'FIXED',
    faceValue: null,
    discountRate: null,
    maxDiscount: null,
    thresholdAmount: 0,
    scopeType: 'ALL',
    categoryIds: [],
    productIds: [],
    targetGroup: 'ALL',
    minMemberLevel: 0,
    totalQuantity: 100,
    receiveRange: [],
    validType: 'FIXED',
    validRange: [],
    validDays: 30,
    description: '',
  }
}

function loadData() {
  getCouponList({
    page: pagination.value.current,
    pageSize: pagination.value.pageSize,
    keyword: query.value.keyword || undefined,
    status: query.value.status || undefined,
  }).then((res) => {
    list.value = res.data.data.list || []
    pagination.value.total = res.data.data.total || 0
  })
}

function loadOptions() {
  getGoodsList({ page: 1, pageSize: 500 }).then((res) => {
    products.value = res.data.data.list || []
  })
  getCategoryTree().then((res) => {
    categories.value = res.data.data || []
  })
  getMemberLevels().then((res) => {
    memberLevels.value = res.data.data || []
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
  getCouponDetail(record.id).then((res) => {
    const data = res.data.data
    editingId.value = data.id
    form.value = {
      name: data.name,
      type: data.type,
      faceValue: data.faceValue === null ? null : Number(data.faceValue),
      discountRate: data.discountRate === null ? null : Number(data.discountRate),
      maxDiscount: data.maxDiscount === null ? null : Number(data.maxDiscount),
      thresholdAmount: Number(data.thresholdAmount || 0),
      scopeType: data.scopeType,
      categoryIds: data.categoryIds || [],
      productIds: data.productIds || [],
      targetGroup: data.targetGroup,
      minMemberLevel: data.minMemberLevel || 0,
      totalQuantity: data.totalQuantity,
      receiveRange: [data.receiveStart, data.receiveEnd],
      validType: data.validType,
      validRange: data.validStart ? [data.validStart, data.validEnd] : [],
      validDays: data.validDays || 30,
      description: data.description || '',
    }
    formVisible.value = true
  })
}

function buildPayload() {
  return {
    name: form.value.name,
    type: form.value.type,
    faceValue: form.value.type === 'FIXED' ? form.value.faceValue : null,
    discountRate: form.value.type === 'DISCOUNT' ? form.value.discountRate : null,
    maxDiscount: form.value.type === 'DISCOUNT' ? form.value.maxDiscount : null,
    thresholdAmount: form.value.thresholdAmount || 0,
    scopeType: form.value.scopeType,
    targetGroup: form.value.targetGroup,
    minMemberLevel: form.value.minMemberLevel || 0,
    totalQuantity: form.value.totalQuantity,
    perUserLimit: 1,
    receiveStart: form.value.receiveRange?.[0],
    receiveEnd: form.value.receiveRange?.[1],
    validType: form.value.validType,
    validStart: form.value.validType === 'FIXED' ? form.value.validRange?.[0] : null,
    validEnd: form.value.validType === 'FIXED' ? form.value.validRange?.[1] : null,
    validDays: form.value.validType === 'RECEIVE_DAYS' ? form.value.validDays : null,
    description: form.value.description,
    categoryIds: form.value.scopeType === 'CATEGORY' ? form.value.categoryIds : [],
    productIds: form.value.scopeType === 'PRODUCT' ? form.value.productIds : [],
  }
}

function handleSubmit() {
  const payload = buildPayload()
  if (!payload.name) {
    message.warning('请输入券名称')
    return
  }
  if (payload.type === 'FIXED' && !payload.faceValue) {
    message.warning('请填写满减金额')
    return
  }
  if (payload.type === 'DISCOUNT' && !payload.discountRate) {
    message.warning('请填写折扣率')
    return
  }
  if (!payload.receiveStart || !payload.receiveEnd) {
    message.warning('请选择领取时间')
    return
  }
  if (payload.validType === 'FIXED' && (!payload.validStart || !payload.validEnd)) {
    message.warning('请选择有效期')
    return
  }
  if (payload.scopeType === 'CATEGORY' && !payload.categoryIds.length) {
    message.warning('请选择适用分类')
    return
  }
  if (payload.scopeType === 'PRODUCT' && !payload.productIds.length) {
    message.warning('请选择适用商品')
    return
  }
  saving.value = true
  const request = editingId.value
    ? updateCoupon(editingId.value, payload)
    : addCoupon(payload)
  request
    .then(() => {
      message.success(editingId.value ? '优惠券已更新' : '优惠券已创建')
      formVisible.value = false
      loadData()
    })
    .finally(() => {
      saving.value = false
    })
}

function openGrant(record) {
  grantTarget.value = record
  grantForm.value = { allUsers: false, userIds: '' }
  grantVisible.value = true
}

function handleGrant() {
  const userIds = grantForm.value.userIds
    .split(/[\s,，]+/)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0)
  if (!grantForm.value.allUsers && !userIds.length) {
    message.warning('请输入用户 ID')
    return
  }
  granting.value = true
  grantCoupon(grantTarget.value.id, {
    allUsers: grantForm.value.allUsers,
    userIds,
  })
    .then((res) => {
      const result = res.data.data || {}
      message.success(`发放成功 ${result.granted || 0} 张，跳过 ${result.skipped || 0} 张，剩余 ${result.remainQuantity || 0} 张`)
      grantVisible.value = false
      loadData()
    })
    .finally(() => {
      granting.value = false
    })
}

function openDetail(record) {
  getCouponDetail(record.id).then((res) => {
    detail.value = res.data.data
    recordPagination.value.current = 1
    detailVisible.value = true
    loadRecords(record.id)
  })
}

function loadRecords(templateId) {
  getCouponRecords(templateId, {
    page: recordPagination.value.current,
    pageSize: recordPagination.value.pageSize,
  }).then((res) => {
    records.value = res.data.data.list || []
    recordPagination.value.total = res.data.data.total || 0
  })
}

function handleRecordPageChange(pager) {
  recordPagination.value.current = pager.current
  loadRecords(detail.value.id)
}

function handleStop(record) {
  stopCoupon(record.id).then(() => {
    message.success('已停止发放')
    loadData()
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: '删除后不可恢复，确定要删除该优惠券吗？',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => deleteCoupon(record.id).then(() => {
      message.success('优惠券已删除')
      loadData()
    }),
  })
}

function canGrant(record) {
  // 后台发券也必须在领取时间内，未开始 / 已结束都不允许
  return record.status === 'ACTIVE'
}

function couponValue(record) {
  if (record.type === 'DISCOUNT') {
    const rate = Number(record.discountRate || 0)
    const cap = record.maxDiscount ? `，最高减 ¥${money(record.maxDiscount)}` : ''
    return `${(rate * 10).toFixed(1)} 折${cap}`
  }
  return `减 ¥${money(record.faceValue)}`
}

function validityText(record) {
  if (record.validType === 'RECEIVE_DAYS') {
    return `领取后 ${record.validDays} 天内有效`
  }
  return `${record.validStart} ~ ${record.validEnd}`
}

function statusColor(status) {
  return { PENDING: 'blue', ACTIVE: 'green', ENDED: 'default', STOPPED: 'red' }[status] || 'default'
}

function money(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value).toFixed(2)
}

function memberLevelText(levelId) {
  if (!levelId) return '不限'
  const level = memberLevels.value.find((item) => item.id === levelId)
  return level ? level.name : `等级 ${levelId}`
}

onMounted(() => {
  loadOptions()
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

.unit {
  margin-left: 8px;
  color: #999;
}

.detail-block {
  margin-top: 16px;
}

.detail-title {
  margin-bottom: 8px;
  font-weight: 600;
}

@media (max-width: 767px) {
  .head {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
