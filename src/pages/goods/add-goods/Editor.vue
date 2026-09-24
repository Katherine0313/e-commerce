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
import {getToken} from '@/utils/token'
import {message} from 'ant-design-vue'

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
      server: import.meta.env.VITE_API_BASE_URL + '/api/upload?type=body',
      fieldName: 'file',
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      headers: {Authorization: `Bearer ${getToken()}`},
      customInsert(res, insertFn) {
        insertFn(res.data.url, '', res.data.url)
      },
      // 上传失败（如文件类型不被允许）：把后端返回的具体原因提示给用户
      onError(file, err, res) {
        message.error((res && res.message) || '图片上传失败，请重试')
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
