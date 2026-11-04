<template>
  <div class="specs-editor">
    <div class="specs-toolbar">
      <span class="specs-title">规格参数</span>
      <a-button size="small" type="dashed" @click="addRow" :disabled="specsForm.length >= MAX_ITEMS">
        <PlusOutlined />
        添加参数
      </a-button>
    </div>
    <div class="specs-tip">
      选择商品分类后自动带出该类目的规格字段（灰色参数名只填值，非必填）；也可手动添加自定义参数，最多 {{ MAX_ITEMS }} 项
    </div>
    <div class="specs-row" v-for="(row, index) in specsForm" :key="row.key">
      <a-input
          v-if="row.fixed"
          :value="row.name"
          disabled
          class="specs-name"
      />
      <a-input
          v-else
          v-model:value="row.name"
          placeholder="参数名，如 屏幕尺寸"
          :maxlength="MAX_NAME_LENGTH"
          class="specs-name"
      />
      <a-input
          v-model:value="row.value"
          :placeholder="`参数值${row.name ? '，如 ' + row.name : ''}`"
          :maxlength="MAX_VALUE_LENGTH"
      />
      <a-button type="text" danger @click="removeRow(index)">
        <DeleteOutlined />
      </a-button>
    </div>
    <div class="specs-empty" v-if="!specsForm.length">
      暂无规格参数：选择商品分类会自动带出模板，也可点「添加参数」手动录入
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'

// 与后端 ProductSpecsCodec 的上限保持一致
const MAX_ITEMS = 30
const MAX_NAME_LENGTH = 32
const MAX_VALUE_LENGTH = 128

// 行结构：{ key, name, value, fixed }；fixed 为分类模板字段，参数名只读
const specsForm = ref([])
let keySeq = 0

const makeRow = (name = '', value = '', fixed = false) => ({
  key: ++keySeq,
  name,
  value,
  fixed,
})

/**
 * 按分类模板重建规格行：
 * - 模板字段固定在前、参数名只读，已填写的值保留
 * - 模板之外的旧参数（历史数据）和用户自定义参数继续保留为可编辑行，避免丢数据
 */
const applyTemplate = (template) => {
  const names = (template || [])
      .map((name) => (name || '').trim())
      .filter(Boolean)
  const current = specsForm.value
  const rows = names.map((name) => {
    const hit = current.find((row) => row.name === name)
    return makeRow(name, hit ? hit.value : '', true)
  })
  const rest = current
      .filter((row) => !names.includes(row.name))
      .map((row) => makeRow(row.name, row.value, false))
  specsForm.value = [...rows, ...rest].slice(0, MAX_ITEMS)
}

// 编辑回填：先恢复已存参数，再按分类模板重建
const setSpecs = (list, template) => {
  specsForm.value = (list || []).map((item) => makeRow(item.name || '', item.value || '', false))
  if (template && template.length) {
    applyTemplate(template)
  }
}

const addRow = () => {
  if (specsForm.value.length >= MAX_ITEMS) {
    message.warning(`规格参数最多 ${MAX_ITEMS} 项`)
    return
  }
  specsForm.value.push(makeRow())
}

const removeRow = (index) => {
  specsForm.value.splice(index, 1)
}

// 只校验自定义参数名；模板字段非必填，值留空即忽略
const validate = () => {
  const invalid = specsForm.value.find((row) => !row.fixed && !(row.name || '').trim())
  if (invalid) {
    message.warning('自定义规格参数的参数名不能为空')
    return false
  }
  return true
}

// 提交用：丢掉空值项（模板项非必填），名称和值都 trim
const getSpecs = () => specsForm.value
    .map((row) => ({
      name: (row.name || '').trim(),
      value: (row.value || '').toString().trim(),
    }))
    .filter((item) => item.name && item.value)

const resetForm = () => {
  specsForm.value = []
}

defineExpose({ specsForm, applyTemplate, setSpecs, addRow, removeRow, validate, getSpecs, resetForm })
</script>

<style scoped>
.specs-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.specs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.specs-title {
  font-weight: 600;
}

.specs-tip {
  color: #8c8c8c;
  font-size: 12px;
}

.specs-row {
  display: grid;
  grid-template-columns: 220px 1fr 32px;
  align-items: center;
  gap: 8px;
}

.specs-empty {
  color: #bfbfbf;
  font-size: 12px;
}
</style>
