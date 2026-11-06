<template>
  <div class="sku-editor">
    <a-form-item label="规格类型">
      <a-radio-group v-model:value="skuType" @change="handleTypeChange">
        <a-radio :value="0">单规格</a-radio>
        <a-radio :value="1">多规格</a-radio>
      </a-radio-group>
      <span class="hint">多规格时售价/库存只在下方表格里填写，商品级价格由系统按最低 SKU 汇总。</span>
    </a-form-item>

    <template v-if="skuType === 1">
      <div v-for="(dim, index) in dimensions" :key="dim.key" class="dim-block">
        <div class="dim-head">
          <span class="dim-label">规格{{ index + 1 }}</span>
          <a-select
              v-model:value="dim.groupId"
              :options="groupSelectOptions"
              placeholder="选择规格名"
              style="width:200px"
              @change="(val) => onDimGroupChange(dim, val)"
          />
          <a-button
              danger type="text" size="small"
              :disabled="dimensions.value.length <= 1"
              @click="removeDim(index)"
          >移除</a-button>
        </div>

        <div v-if="dim.groupId" class="dim-values">
          <a-checkbox-group v-model:value="dim.values" @change="rebuildRows">
            <a-checkbox
                v-for="v in getGroupValues(dim.groupId)"
                :key="v.id"
                :value="v.value"
            >{{ v.value }}</a-checkbox>
          </a-checkbox-group>
          <a-tag v-if="!getGroupValues(dim.groupId).length" color="warning">
            规格库中暂无候选值，请先到「规格库」添加
          </a-tag>
        </div>
        <div v-else class="dim-tip">请先选择规格名，候选值将自动展示出来</div>
      </div>

      <a-button
          type="dashed"
          :disabled="dimensions.value.length >= 3"
          @click="addDim"
      >
        + 添加规格（最多 3 个）
      </a-button>

      <div v-if="rows.length" class="sku-table-wrap">
        <div class="batch-bar">
          <span class="batch-title">批量填充</span>
          <a-input-number v-model:value="batch.price" addon-before="￥" :min="0" :precision="2" placeholder="售价" />
          <a-input-number v-model:value="batch.marketPrice" addon-before="￥" :min="0" :precision="2" placeholder="市场价" />
          <a-input-number v-model:value="batch.costPrice" addon-before="￥" :min="0" :precision="2" placeholder="成本价" />
          <a-input-number v-model:value="batch.stock" :min="0" :precision="0" placeholder="库存" />
          <a-button @click="applyBatch">应用到全部</a-button>
        </div>
        <a-table :data-source="rows" :pagination="false" row-key="key" size="small" :scroll="{ x: 980 }">
          <a-table-column title="规格组合" key="combo" width="180">
            <template #default="{ record }">{{ comboText(record) }}</template>
          </a-table-column>
          <a-table-column title="售价" width="160">
            <template #default="{ record }">
              <a-input-number v-model:value="record.price" addon-before="￥" :min="0" :precision="2" style="width:130px" />
            </template>
          </a-table-column>
          <a-table-column title="市场价" width="160">
            <template #default="{ record }">
              <a-input-number v-model:value="record.marketPrice" addon-before="￥" :min="0" :precision="2" style="width:130px" />
            </template>
          </a-table-column>
          <a-table-column title="成本价" width="160">
            <template #default="{ record }">
              <a-input-number v-model:value="record.costPrice" addon-before="￥" :min="0" :precision="2" style="width:130px" />
            </template>
          </a-table-column>
          <a-table-column title="库存" width="140">
            <template #default="{ record }">
              <a-input-number v-model:value="record.stock" :min="0" :precision="0" style="width:110px" />
            </template>
          </a-table-column>
          <a-table-column title="商家编码" width="160">
            <template #default="{ record }">
              <a-input v-model:value="record.skuCode" placeholder="选填" />
            </template>
          </a-table-column>
          <a-table-column title="状态" width="80">
            <template #default="{ record }">
              <a-tag :color="record.status === 1 ? 'green' : 'default'">
                {{ record.status === 1 ? '启用' : '停用' }}
              </a-tag>
            </template>
          </a-table-column>
        </a-table>
      </div>
      <a-empty v-else description="勾选规格值后自动生成 SKU 表格" />
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getSpecLibrary } from '@/api/specs.js'

// 0 单规格 / 1 多规格
const skuType = ref(0)
// 规格维度：{ key, groupId, name, values: [] }
const dimensions = ref([])
// SKU 行：{ key, id, specJson, price, marketPrice, costPrice, stock, skuCode, status }
const rows = ref([])
// 规格库（按需加载：等用户选了商品分类才拉，避免把所有不相关的规格名都展示出来）
const specGroups = ref([])
// 当前已拉取过的分类 id（null = 全量），用于避免重复请求
let lastLoadedCategoryId = '__unloaded__'
const batch = ref({ price: null, marketPrice: null, costPrice: null, stock: null })
let dimSeq = 0
// 编辑回显时按规格组合缓存已有 SKU，重建表格时按 key 匹配
let pendingSkus = new Map()

// 供 a-select 用：只列启用的规格名，且已被其它维度选中的不再列出
const groupSelectOptions = computed(() => {
  const usedIds = new Set(dimensions.value.map(d => d.groupId).filter(Boolean))
  return specGroups.value
      .filter(g => g.status === 1 && !usedIds.has(g.id))
      .map(g => ({ value: g.id, label: g.name }))
})

const emit = defineEmits(['change'])

// 拉规格库：未选分类时传 null 会拉全量（用于编辑回显场景兜底）；选了分类就只拉该分类 + 全局通用的
const loadLibrary = (categoryId) => {
  // categoryId 相同就不重复拉（切换分类时才会重新请求）
  const key = categoryId ?? null
  if (lastLoadedCategoryId === key) return Promise.resolve()
  lastLoadedCategoryId = key
  return getSpecLibrary(categoryId)
      .then(res => {
        const data = res.data?.data
        if (Array.isArray(data)) specGroups.value = data
      })
      .catch(() => {
        specGroups.value = []
      })
}

const getGroupValues = (groupId) => {
  const g = specGroups.value.find(g => g.id === groupId)
  return g?.values || []
}

const addDim = () => {
  if (dimensions.value.length >= 3) return
  dimensions.value.push({ key: ++dimSeq, groupId: null, name: '', values: [] })
}

const removeDim = (index) => {
  dimensions.value.splice(index, 1)
  rebuildRows()
}

// 选中规格名：把 dim.groupId / dim.name 同步，values 清空（旧值来自上个 group）
const onDimGroupChange = (dim, groupId) => {
  if (groupId == null) {
    dim.groupId = null
    dim.name = ''
    dim.values = []
  } else {
    const g = specGroups.value.find(g => g.id === groupId)
    dim.groupId = groupId
    dim.name = g?.name || ''
    // 如果编辑回显里该维度有预选值，保留；否则从空开始
    // 这里不清空 dim.values，由 a-checkbox-group 自己按 v-model 维护
  }
  rebuildRows()
}

const activeDimensions = () =>
    dimensions.value.filter(d => d.groupId != null && d.name && (d.values || []).length)

const buildKey = (parts) => parts.map(p => `${p.name}:${p.value}`).join('|')

const rebuildRows = () => {
  const dims = activeDimensions()
  if (!dims.length) {
    rows.value = []
    return
  }
  let combos = [[]]
  for (const dim of dims) {
    combos = combos.flatMap(combo =>
        dim.values.map(value => [...combo, { name: dim.name.trim(), value }]))
  }
  const oldByKey = new Map(rows.value.map(row => [row.key, row]))
  rows.value = combos.map(parts => {
    const key = buildKey(parts)
    const prev = oldByKey.get(key)
    if (prev) return { ...prev, specJson: Object.fromEntries(parts.map(p => [p.name, p.value])) }
    const cached = pendingSkus.get(key)
    return {
      key,
      id: cached?.id ?? null,
      specJson: Object.fromEntries(parts.map(p => [p.name, p.value])),
      price: cached?.price ?? null,
      marketPrice: cached?.marketPrice ?? null,
      costPrice: cached?.costPrice ?? null,
      stock: cached?.stock ?? 0,
      skuCode: cached?.skuCode ?? '',
      status: cached?.status ?? 1,
    }
  })
}

const handleTypeChange = () => {
  if (skuType.value === 1 && !dimensions.value.length) {
    addDim()
  }
  rebuildRows()
  emit('change', skuType.value)
}

const comboText = (row) => Object.values(row.specJson || {}).join(' / ')

const applyBatch = () => {
  const b = batch.value
  if (b.price == null && b.marketPrice == null && b.costPrice == null && b.stock == null) {
    message.warning('请先填写至少一个基准值')
    return
  }
  rows.value.forEach(row => {
    if (b.price != null) row.price = b.price
    if (b.marketPrice != null) row.marketPrice = b.marketPrice
    if (b.costPrice != null) row.costPrice = b.costPrice
    if (b.stock != null) row.stock = b.stock
  })
}

// 校验：多规格必须选全、价格库存合法
const validate = () => {
  if (skuType.value === 0) return true
  const dims = activeDimensions()
  if (!dims.length) {
    message.warning('多规格商品至少需要 1 个规格维度并勾选候选值')
    return false
  }
  if (dimensions.value.length > 3) {
    message.warning('规格维度最多 3 个')
    return false
  }
  const names = new Set()
  for (const dim of dims) {
    if (names.has(dim.name)) {
      message.warning(`规格名重复：${dim.name}`)
      return false
    }
    names.add(dim.name)
    if (!dim.values || !dim.values.length) {
      message.warning(`规格【${dim.name}】尚未勾选任何值`)
      return false
    }
  }
  const expected = dims.reduce((acc, dim) => acc * dim.values.length, 1)
  if (rows.value.length !== expected) {
    message.warning('SKU 表格尚未生成完整，请检查规格值')
    return false
  }
  for (const row of rows.value) {
    if (row.price == null || row.price <= 0) {
      message.warning(`请为「${comboText(row)}」填写大于 0 的售价`)
      return false
    }
    if (row.stock == null || row.stock < 0) {
      message.warning(`请为「${comboText(row)}」填写不小于 0 的库存`)
      return false
    }
  }
  return true
}

const getPayload = () => {
  if (skuType.value === 0) {
    return { skuType: 0, skuSpecs: [], skus: [] }
  }
  return {
    skuType: 1,
    skuSpecs: activeDimensions().map(dim => ({
      groupId: dim.groupId ?? null,
      name: dim.name.trim(),
      values: [...dim.values],
    })),
    skus: rows.value.map(row => ({
      id: row.id ?? null,
      specJson: row.specJson,
      price: row.price,
      marketPrice: row.marketPrice,
      costPrice: row.costPrice,
      stock: row.stock ?? 0,
      skuCode: row.skuCode || null,
      status: row.status ?? 1,
    })),
  }
}

// 商品级价格/库存的聚合值，提交时兜底填到商品字段（后端会再按 SKU 重算）
const getAggregate = () => {
  if (skuType.value === 0 || !rows.value.length) {
    return null
  }
  const priced = rows.value.filter(row => row.price != null)
  const lowest = priced.length
      ? priced.reduce((min, row) => (row.price < min.price ? row : min), priced[0])
      : null
  return {
    salesPrice: lowest?.price ?? null,
    marketPrice: lowest?.marketPrice ?? lowest?.price ?? null,
    costPrice: lowest?.costPrice ?? null,
    stock: rows.value.reduce((sum, row) => sum + (row.stock ?? 0), 0),
    productCode: rows.value.find(row => row.skuCode)?.skuCode || null,
  }
}

const reset = () => {
  skuType.value = 0
  dimensions.value = []
  rows.value = []
  batch.value = { price: null, marketPrice: null, costPrice: null, stock: null }
  pendingSkus = new Map()
  emit('change', skuType.value)
}

// 编辑回显：skuType / skuSpecs / skus
const setData = (type, specs, skus) => {
  skuType.value = type === 1 ? 1 : 0
  dimensions.value = (specs || []).map(spec => {
    // 优先按 groupId 匹配；没有 groupId 则按 name 匹配
    let group = null
    if (spec.groupId != null) {
      group = specGroups.value.find(g => g.id === spec.groupId)
    }
    if (!group && spec.name) {
      group = specGroups.value.find(g => g.name === spec.name)
    }
    const groupId = group ? group.id : null
    const name = group ? group.name : (spec.name || '')
    return {
      key: ++dimSeq,
      groupId,
      name,
      // 回显的 values 是该商品实际用到的值，按现有 values 做去重
      values: Array.isArray(spec.values) ? [...new Set(spec.values)] : [],
    }
  })
  pendingSkus = new Map()
  ;(skus || []).forEach(sku => {
    const names = dimensions.value.map(dim => dim.name)
    const json = sku.specJson || {}
    const parts = names.map(name => ({ name, value: json[name] }))
    if (parts.every(p => p.value != null)) {
      pendingSkus.set(buildKey(parts), sku)
    }
  })
  rows.value = []
  rebuildRows()
  if (skuType.value === 1 && !dimensions.value.length) {
    addDim()
  }
  emit('change', skuType.value)
}

// 由 AddGoods/EditModal 在用户选了分类后调用；categoryId 为商品分类叶节点 id
const setCategory = (categoryId) => {
  // 换分类时：如果 SKU 表格里有旧维度，提示一下再清
  const changed = lastLoadedCategoryId !== '__unloaded__' && lastLoadedCategoryId !== (categoryId ?? null)
  if (changed && dimensions.value.length && skuType.value === 1) {
    message.info('规格库已随分类刷新，之前的维度可能需要重新选择')
  }
  // 重新拉规格库（带分类过滤），拉完后已选中的维度如果还在列表里会自动保留，不在的由 a-select 自己清空
  loadLibrary(categoryId)
}

defineExpose({ validate, getPayload, getAggregate, setData, reset, setCategory })
</script>

<style scoped>
.sku-editor {
  width: 100%;
}

.hint {
  margin-left: 12px;
  color: #8c8c8c;
  font-size: 12px;
}

.dim-block {
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.dim-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.dim-label {
  font-weight: 600;
  color: #595959;
  width: 70px;
}

.dim-values {
  padding-left: 82px;
  line-height: 2.2;
}

.dim-tip {
  padding-left: 82px;
  color: #8c8c8c;
  font-size: 12px;
}

.sku-table-wrap {
  margin-top: 14px;
}

.batch-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  margin-bottom: 10px;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
}

.batch-title {
  font-weight: 600;
}
</style>
