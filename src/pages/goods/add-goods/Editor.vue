<template>
  <div class="rich-editor-wrap">
    <Toolbar
        :editor="editorRef"
        :defaultConfig="toolbarConfig"
        style="border:1px solid #d9d9d9;border-bottom:none;border-radius:6px 6px 0 0"
    />
    <Editor
        :defaultConfig="editorConfig"
        style="border:1px solid #d9d9d9;border-radius:0 0 6px 6px;overflow-y:auto;min-height:300px"
        @onCreated="handleCreated"
        @onChange="handleChange"
    />
  </div>
</template>
<script setup>
import {ref, shallowRef, watch, onBeforeUnmount} from 'vue'
import {Editor, Toolbar} from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import {message} from 'ant-design-vue'
import axios from '@/api/request.js'
import {compressImage} from '@/utils/compressImage'
import {getImageSpec} from '@/utils/image-spec'

// 正文图按最长边 1200 压缩：富文本满宽展示，2x 够用，规格表见 utils/image-spec.js
const bodySpec = getImageSpec('body')

const props = defineProps({
  modelValue: {type: String, default: ''},
  placeholder: {type: String, default: '请输入商品图文详情...'}
})
const emit = defineEmits(['update:modelValue'])

const editorRef = shallowRef(null)

const toolbarConfig = {
  toolbarKeys: ['headerSelect', 'bold', 'italic', 'underline', 'color', 'bgColor',
    'justifyLeft', 'justifyCenter', 'justifyRight', 'divider', 'uploadImage',
    'insertTable', 'insertLink', 'undo', 'redo', 'clearStyle']
}
const editorConfig = {
  placeholder: props.placeholder,
  height: 300,
  MENU_CONF: {
    uploadImage: {
      async customUpload(file, insertFn) {
        // 超过 30MB 直接拒绝：canvas 解码超大图会吃爆浏览器内存
        if (file.size > 30 * 1024 * 1024) {
          message.error('图片不能超过 30MB')
          return
        }
        try {
          // 先压缩原图再上传，避免详情页富文本里全是原图导致卡顿
          const compressed = await compressImage(file, bodySpec)
          // 体积上限放在压缩之后判：原图 12MB 压完可能只剩 200KB，
          // 放在压缩前判会把这种图误拒
          if (compressed.size > 5 * 1024 * 1024) {
            message.error('图片压缩后仍超过 5MB，请换一张')
            return
          }
          const formData = new FormData()
          formData.append('file', compressed)
          const res = await axios.post('/api/admin/upload?type=body', formData)
          insertFn(res.data.data.url, '', res.data.data.url)
        } catch (err) {
          // 上传失败（如文件类型不被允许）：把后端返回的具体原因提示给用户
          message.error((err.response && err.response.data && err.response.data.message) || '图片上传失败，请重试')
        }
      }
    }
  }
}

// 父组件更新 modelValue 时（如编辑回填），同步到编辑器
watch(() => props.modelValue, (val) => {
  if (editorRef.value && editorRef.value.getHtml() !== val) {
    editorRef.value.setHtml(val)
  }
})

const handleCreated = (editor) => {
  editorRef.value = editor
  // 初始值回填
  if (props.modelValue) {
    editor.setHtml(props.modelValue)
  }
}

// 内容变化时回传给父组件
const handleChange = (editor) => {
  emit('update:modelValue', editor.getHtml())
}

onBeforeUnmount(() => {
  editorRef.value?.destroy()
})
</script>
<style scoped>
.rich-editor-wrap {
  width: 100%;
  z-index: 100;
}
</style>
