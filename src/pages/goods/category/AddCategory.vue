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
        <a-form-item label="分类图片">
          <div class="category-image-upload">
            <a-upload
                :action="uploadAction"
                :headers="uploadHeaders"
                :before-upload="compressImage"
                :show-upload-list="false"
                accept="image/*"
                @change="imageUpload"
            >
              <img v-if="addCategoryForm.image" :src="imagePreviewUrl"
                   class="category-image-preview" alt="分类图片"/>
              <a-button v-else>
                <UploadOutlined/>
                点击上传
              </a-button>
            </a-upload>
            <a v-if="addCategoryForm.image" @click="addCategoryForm.image = ''">移除</a>
          </div>
        </a-form-item>

      </div>
      <div v-if="addCategoryForm.group === '2'">
        <a-form-item label="上级分类" name="parentId">
          <a-select v-model:value="addCategoryForm.parentId" placeholder="请选择父级分类">
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
import {computed, ref} from "vue";
import { useDragModal } from '@/composables/useDragModal'
import {addCategory, getCategoryFlat} from '@/api/products.js'
import {message} from 'ant-design-vue'
import {UploadOutlined} from '@ant-design/icons-vue'
import {getToken} from '@/utils/token'
import {compressImage} from '@/utils/compressImage'
// 定义并初始化弹窗响应式变量
const open = ref(false)
useDragModal('drag-modal-addcat')
// 定义上级分类
// 默认打开一级分类
const addCategoryForm = ref({
  group: '1',
  name: '',
  status: true,
  parentId: undefined,
  recommend: false,
  image: '',
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
    parentId: undefined,
    recommend: false,
    image: '',
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
          parentList.value = res.data.data.filter(c => c.parentId === null)
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
// =============图片上传=================
// 分类图上传地址：type=category 让后端落到 upload/image/category/
const uploadAction = import.meta.env.VITE_API_BASE_URL + '/api/admin/upload?type=category'
const uploadHeaders = {
  Authorization: 'Bearer ' + getToken()
}
// 预览地址：开发环境后端与前端不同源，补上接口域名；生产环境为空，走同源相对路径
const imagePreviewUrl = computed(() => {
  const url = addCategoryForm.value.image
  if (!url) return ''
  return /^https?:\/\//.test(url) ? url : (import.meta.env.VITE_API_BASE_URL || '') + url
})
// 上传成功后把相对路径存进表单，提交时随分类一起保存
const imageUpload = (info) => {
  if (info.file.status === 'done') {
    addCategoryForm.value.image = info.file.response.data.url
  } else if (info.file.status === 'error') {
    const msg = (info.file.response && info.file.response.message) || '图片上传失败，请重试'
    message.error(msg)
  }
}
//=============表单校验=================
// 定义表单实例
const categoryFormRef = ref(null)
// 定义校验规则
const categoryFormRules = {
  name: [{required: true, message: '分类名称不能为空', trigger: 'blur'}],
  parentId: [{required: true, message: '请选择上级分类', trigger: 'blur'}],
}
// 弹窗中表单的提交
const handleCategorySubmit = () => {
  categoryFormRef.value.validate()
      .then(res => {
        const data = {
          name: addCategoryForm.value.name,
          parentId: addCategoryForm.value.group === '1' ? null : addCategoryForm.value.parentId,
          status: addCategoryForm.value.status ? 1 : 0,
          recommend: addCategoryForm.value.recommend ? 1 : 0,
          // 分类图只属于一级分类，二级分类不提交
          image: addCategoryForm.value.group === '1' ? (addCategoryForm.value.image || null) : null
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
.category-image-upload {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.category-image-preview {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  cursor: pointer;
}
</style>
