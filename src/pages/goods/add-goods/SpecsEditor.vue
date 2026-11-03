<template>
  <div class="specs-editor">
    <div class="specs-toolbar">
      <span class="specs-title">规格参数</span>
      <a-button size="small" type="dashed" @click="addRow" :disabled="specsForm.length >= MAX_ITEMS">
        <PlusOutlined />添加参数
      </a-button>
    </div>
    <div class="specs-tip">规格参数会展示在商品详情页（如「屏幕尺寸 / 6.1英寸」），最多 {{ MAX_ITEMS }} 项</div>
    <div class="specs-row" v-for="(row, index) in specsForm" :key="index">
      <a-input v-model:value="row.name" placeholder="参数名，如 屏幕尺寸" :maxlength="32" />
      <a-input v-model:value="row.value" placeholder="参数值，如 6.1英寸" :maxlength="128" />
      <a-button type="text" danger @click="removeRow(index)">
        <DeleteOutlined />
      </a-button>
    </div>
    <div class="specs-empty" v-if="!specsForm.length">暂无规格参数，点「添加参数」录入</div>
  </div>
</template>
<script setup>
import {ref} from 'vue'
import {message} from 'ant-design-vue'
import {DeleteOutlined, PlusOutlined} from '@ant-design/icons-vue'

// 规格参数项上限，与后端 ProductSpecsCodec 的 MAX_ITEMS 一致
const MAX_ITEMS = 30
// 参数名 / 参数值长度上限，同样对齐后端
const MAX_NAME_LENGTH = 32
const MAX_VALUE_LENGTH = 128

// 规格参数数组：[{name: '屏幕尺寸', value: '6.1英寸'}]
const specsForm = ref([])

// 新增一行空参数
const addRow = () => {
  if (specsForm.value.length >= MAX_ITEMS) {
    message.warning(`规格参数最多 ${MAX_ITEMS} 项`)
    return
  }
  specsForm.value.push({name: '', value: ''})
}

// 删除指定行
const removeRow = (index) => {
  specsForm.value.splice(index, 1)
}

// 校验：参数名不能为空（后端也会拦，这里先提示更友好）；返回 true 表示通过
const validate = () => {
  const bad = specsForm.value.find(item => !item.name || !item.name.trim())
  if (bad) {
    message.error('规格参数名不能为空')
    return false
  }
  return true
}

// 回填已有商品的规格参数（编辑弹窗用）
const setSpecs = (list) => {
  specsForm.value = (list || []).map(item => ({
    name: item.name ?? '',
    value: item.value ?? '',
  }))
}

// 清空（提交成功 / 取消时由父组件调用）
const resetForm = () => {
  specsForm.value = []
}

// 把表单暴露出去，给父组件引用
defineExpose({specsForm, validate, setSpecs, resetForm})
</script>
<style scoped>
.specs-editor {
  width: 100%;
}

.specs-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.specs-title {
  font-weight: 500;
}

.specs-tip {
  color: #999;
  font-size: 12px;
  margin-bottom: 8px;
}

.specs-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.specs-row :deep(.ant-input) {
  flex: 1;
}

.specs-empty {
  color: #bbb;
  font-size: 12px;
  padding: 6px 0;
}
</style>
