<template>
  <div>
    <!-- 生成条件区 -->
    <a-card title="商品文案助手" :bordered="false">
      <a-form layout="inline">
        <a-form-item label="商品 ID">
          <a-input-number
              v-model:value="productId"
              :min="1"
              placeholder="输入商品 ID"
              style="width: 160px"
          />
        </a-form-item>
        <a-form-item>
          <a-button :loading="productLoading" @click="loadProduct">查询商品</a-button>
        </a-form-item>
        <a-form-item v-if="product" label="当前商品">
          <a-tag color="blue">{{ product.name }}</a-tag>
        </a-form-item>
      </a-form>
      <a-form layout="inline" style="margin-top: 16px">
        <a-form-item label="生成场景">
          <a-select v-model:value="scene" style="width: 140px">
            <a-select-option value="all">全部</a-select-option>
            <a-select-option value="title">名称</a-select-option>
            <a-select-option value="subtitle">副标题</a-select-option>
            <a-select-option value="description">详情</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="额外要求" style="flex: 1">
          <a-input
              v-model:value="requirement"
              placeholder="选填，如：突出性价比、语气活泼"
              allow-clear
              style="width: 320px"
          />
        </a-form-item>
        <a-form-item>
          <a-button
              type="primary"
              v-permission="'ai:copy:generate'"
              :loading="generating"
              @click="generate"
          >
            生成文案
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 生成结果 -->
    <a-card v-if="result" :bordered="false" style="margin-top: 16px">
      <template #title>
        生成结果<span v-if="result.productName" style="margin-left: 8px; color: #8c8c8c; font-weight: normal">
          {{ result.productName }}
        </span>
      </template>
      <template #extra>
        <a-button
            type="primary"
            v-permission="'ai:copy:generate'"
            @click="goEditProduct"
        >
          回填到商品
        </a-button>
      </template>
      <div class="result-list">
        <a-card v-for="f in resultFields" :key="f.key" class="result-card">
          <template #title>{{ f.label }}</template>
          <template #extra>
            <a-button size="small" @click="copyField(f)">复制</a-button>
          </template>
          <div class="field-compare">
            <div class="field-block">
              <div class="field-label">当前值</div>
              <div class="field-value">{{ currentValue(f.key) || '（空）' }}</div>
            </div>
            <div class="field-block">
              <div class="field-label">生成值</div>
              <div class="field-value generated">{{ f.value }}</div>
            </div>
          </div>
        </a-card>
      </div>
      <div class="result-tip">
        点击「回填到商品」将跳转到商品列表并打开该商品的编辑弹窗，由你在编辑页确认后保存。
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { generateCopy } from '@/api/ai.js'
import { getGoodsDetail } from '@/api/products.js'

const router = useRouter()

const productId = ref(null)
const product = ref(null)
const productLoading = ref(false)
const scene = ref('all')
const requirement = ref('')
const generating = ref(false)
const result = ref(null)

// 后端 fields 的 key → 展示名 + 商品当前值字段（详情文案存在商品的 body 字段）
const FIELD_DEFS = [
  { key: 'name', label: '名称', productField: 'name' },
  { key: 'subTitle', label: '副标题', productField: 'subTitle' },
  { key: 'description', label: '详情', productField: 'body' },
]

const resultFields = computed(() => {
  if (!result.value?.fields) return []
  return FIELD_DEFS
      .filter(f => result.value.fields[f.key] != null && result.value.fields[f.key] !== '')
      .map(f => ({ ...f, value: result.value.fields[f.key] }))
})

const currentValue = (fieldKey) => {
  const def = FIELD_DEFS.find(f => f.key === fieldKey)
  if (!def || !product.value) return ''
  return product.value[def.productField] || ''
}

// 查询商品回显名称（同时拿当前值用于对比）
const loadProduct = () => {
  if (!productId.value) {
    message.warning('请先输入商品 ID')
    return
  }
  productLoading.value = true
  product.value = null
  getGoodsDetail(productId.value)
      .then(res => {
        const data = res.data?.data
        if (!data) {
          message.warning('未找到该商品')
          return
        }
        product.value = data
      })
      .catch(() => {})
      .finally(() => { productLoading.value = false })
}

const generate = () => {
  if (!productId.value) {
    message.warning('请先输入商品 ID')
    return
  }
  generating.value = true
  generateCopy({
    productId: productId.value,
    scene: scene.value,
    requirement: requirement.value || undefined,
  })
      .then(res => {
        const data = res.data?.data
        if (!data) {
          message.warning('生成结果为空')
          return
        }
        result.value = data
        // 生成接口返回了商品名，即使没点「查询商品」也能回显
        if (!product.value && data.productName) {
          product.value = { id: data.productId, name: data.productName }
        }
      })
      .catch(() => {})
      .finally(() => { generating.value = false })
}

const copyField = (f) => {
  navigator.clipboard.writeText(f.value)
      .then(() => message.success(`${f.label}已复制`))
      .catch(() => message.warning('复制失败，请手动复制'))
}

// 回填：不在本页直接调更新接口，跳商品列表页打开编辑弹窗，由编辑页完成保存
const goEditProduct = () => {
  router.push({ path: '/goods/list', query: { editId: result.value?.productId || productId.value } })
}
</script>

<style scoped>
.result-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field-compare {
  display: flex;
  gap: 16px;
}
.field-block {
  flex: 1;
  min-width: 0;
}
.field-label {
  color: #8c8c8c;
  font-size: 12px;
  margin-bottom: 4px;
}
.field-value {
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  /* 纯文本 + 换行，不渲染 Markdown */
  white-space: pre-wrap;
  word-break: break-word;
}
.field-value.generated {
  background: #f6ffed;
}
.result-tip {
  margin-top: 16px;
  color: #8c8c8c;
  font-size: 12px;
}
</style>
