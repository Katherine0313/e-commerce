<template>
  <a-modal title="新增分类" v-model:visible="open" @ok="handleCategorySubmit" wrap-class-name="drag-modal-addcat">
    <a-form :model="addCategoryForm" ref="categoryFormRef" :rules="categoryFormRules">
      <a-form-item label="分类层级">
        <a-radio-group v-model:value="addCategoryForm.group">
          <a-radio value="1">一级分类</a-radio>
          <a-radio value="2">二级分类</a-radio>
        </a-radio-group>
      </a-form-item>
      <div v-if="addCategoryForm.group === '1'">
        <a-form-item label="分类名称" name="name">
          <a-input v-model:value="addCategoryForm.name" placeholder="填写分类名称" />
        </a-form-item>
        <a-form-item label="分类显示">
          <a-switch v-model:checked="addCategoryForm.status" />
        </a-form-item>
      </div>
      <div v-if="addCategoryForm.group === '2'">
        <a-form-item label="上级分类" name="parent_id">
          <a-select v-model:value="addCategoryForm.parent_id" placeholder="请选择父级分类">
            <a-select-option
                v-for="item in parentList"
                :key="item.id"
                :value="item.id"
            >{{ item.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="分类名称" name="name">
          <a-input v-model:value="addCategoryForm.name" placeholder="填写分类名称" />
        </a-form-item>
        <a-form-item label="分类显示">
          <a-switch v-model:checked="addCategoryForm.status" />
        </a-form-item>
        <a-form-item label="热门推荐">
          <a-switch v-model:checked="addCategoryForm.recommend" />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import {ref} from "vue";
import { useDragModal } from '@/composables/useDragModal'
import {addCategory, getCategoryFlat} from '@/api/products.js'
import {message} from 'ant-design-vue'
// 定义并初始化弹窗响应式变量
const open = ref(false)
useDragModal('drag-modal-addcat')
// 定义上级分类
// 默认打开一级分类
const addCategoryForm = ref({
  group: '1',
  name: '',
  status: true,
  parent_id: undefined,
  recommend: false,
})
// 定义父级分类列表
const parentList = ref([])
// 子组件通知父组件刷新列表
const emit = defineEmits(['refresh'])
// 重置表单，避免上次填写的内容和校验提示残留
const resetCategoryForm = () => {
  addCategoryForm.value = {
    group: '1',
    name: '',
    status: true,
    parent_id: undefined,
    recommend: false,
  }
  categoryFormRef.value?.clearValidate()
}
// 父组件调用打开弹窗
const addCategoryModal = () => {
  resetCategoryForm()
  open.value = true
  // 获取扁平化数据
  getCategoryFlat()
      .then(res => {
        if (res.data.success) {
          // 过滤子级分类，留下父级分类
          parentList.value = res.data.data.filter(c => c.parent_id === null)
        }
      })
      // 要区分校验失败和请求失败
      .catch(err => {
        if (err.errorFields) {
          // 校验未通过，不用提示
        } else {
          message.error('新增分类失败')
          console.log(err)
        }
      })
}

defineExpose({
  addCategoryModal
})
//=============表单校验=================
// 定义表单实例
const categoryFormRef = ref(null)
// 定义校验规则
const categoryFormRules = {
  name: [{required: true, message: '分类名称不能为空', trigger: 'blur'}],
  parent_id: [{required: true, message: '请选择上级分类', trigger: 'blur'}],
}
// 弹窗中表单的提交
const handleCategorySubmit = () => {
  categoryFormRef.value.validate()
      .then(res => {
        const data = {
          name: addCategoryForm.value.name,
          parent_id: addCategoryForm.value.group === '1' ? null : addCategoryForm.value.parent_id,
          status: addCategoryForm.value.status ? 1 : 0,
          recommend: addCategoryForm.value.recommend ? 1 : 0
        }
        return addCategory(data)
      })
      .then(res => {
        message.success('新增分类成功')
        emit('refresh')
        open.value = false
      })
      .catch(err => {
        if (err && err.errorFields) {
          console.log('表单校验未通过', err)
        } else {
          message.error(err.response?.data?.message || '新增分类失败')
          console.log(err)
        }
      })
}

//


</script>

<style scoped lang="less">
</style>
