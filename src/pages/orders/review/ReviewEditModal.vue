<template>
  <a-modal
      :visible="visible"
      :title="isEdit ? '编辑虚拟评价' : '新增虚拟评价'"
      :confirm-loading="submitting"
      ok-text="保存"
      cancel-text="取消"
      :width="620"
      @update:visible="(v) => emit('update:visible', v)"
      @ok="handleSubmit"
  >
    <a-form layout="vertical">
      <a-form-item label="商品" required>
        <!-- 搜索选择商品：商品名/图由后端从商品表取，前端只传 productId -->
        <a-select
            v-model:value="form.productId"
            show-search
            :filter-option="false"
            placeholder="输入商品名搜索并选择"
            :loading="productLoading"
            @search="searchProduct"
            @focus="searchProduct('')"
        >
          <a-select-option v-for="item in productOptions" :key="item.id" :value="item.id">
            {{ item.title || item.name }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="评分" required>
        <a-rate v-model:value="form.rating" />
      </a-form-item>

      <a-form-item label="评价标签">
        <a-select
            v-model:value="form.tag"
            placeholder="可从预设标签里选，也可自己填"
            allow-clear
            show-search
            :filter-option="false"
            :options="tagOptions"
            @search="handleTagSearch"
        />
      </a-form-item>

      <a-form-item label="评价内容" required>
        <a-textarea v-model:value="form.content" :rows="4" :maxlength="500" show-count
                    placeholder="请输入评价内容（至少 5 个字）" />
      </a-form-item>

      <a-form-item label="评价图片">
        <a-upload
            :action="uploadAction"
            :headers="uploadHeaders"
            :before-upload="beforeUpload"
            v-model:file-list="fileList"
            accept="image/*"
            list-type="picture-card"
            @change="handleUploadChange"
        >
          <div v-if="fileList.length < 6">
            <UploadOutlined />
            <div class="ant-upload-text">上传</div>
          </div>
        </a-upload>
        <div class="tip">最多 6 张，建议 {{ specLabel(reviewSpec) }}（上传前已自动压缩）</div>
      </a-form-item>

      <a-alert type="warning" show-icon
               message="虚拟评价不挂真实订单，前台会带「系统评价」标记；买家真实评价不可编辑。"
      />
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { getToken } from '@/utils/token'
import { compressImage } from '@/utils/compressImage'
import { getImageSpec, specLabel } from '@/utils/image-spec'
import { getGoodsList } from '@/api/products.js'
import { addVirtualReview, getReviewDetail, updateVirtualReview } from '@/api/review.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 有 id 是编辑，没有是新增
  reviewId: { type: Number, default: null },
})
const emit = defineEmits(['update:visible', 'success'])

const submitting = ref(false)
const productLoading = ref(false)
const productOptions = ref([])
const fileList = ref([])

const form = ref({
  productId: undefined,
  rating: 5,
  tag: undefined,
  content: '',
})

// 评价晒图规格：缩略图很小，但可点开看大图
const reviewSpec = getImageSpec('review')
const uploadAction = import.meta.env.VITE_API_BASE_URL + '/api/admin/upload?type=review'
const uploadHeaders = { Authorization: 'Bearer ' + getToken() }
const beforeUpload = (file) => compressImage(file, reviewSpec)

const isEdit = computed(() => !!props.reviewId)

// 预设评价标签（后台写虚拟评价常用），允许自定义输入
const DEFAULT_TAGS = ['质量好', '性价比高', '物流快', '包装精美', '做工精细', '与描述一致', '物美价廉']
const tagOptions = ref(DEFAULT_TAGS.map((t) => ({ value: t, label: t })))

function handleTagSearch(value) {
  const text = (value || '').trim()
  if (!text) {
    tagOptions.value = DEFAULT_TAGS.map((t) => ({ value: t, label: t }))
    return
  }
  const list = DEFAULT_TAGS.slice()
  if (!list.includes(text)) list.unshift(text)
  tagOptions.value = list.map((t) => ({ value: t, label: t }))
}

/** 搜索商品：下拉里只显示 id，前端不传商品名 */
function searchProduct(keyword) {
  productLoading.value = true
  getGoodsList({ search: keyword || undefined, page: 1, pageSize: 20 })
      .then((res) => {
        productOptions.value = (res.data.data.list || []).map((p) => ({
          id: p.id,
          name: p.name,
          title: p.title,
        }))
      })
      .finally(() => {
        productLoading.value = false
      })
}

/** 上传完成：把返回的相对路径记下来 */
function handleUploadChange(info) {
  if (info.file.status === 'done') {
    info.file.url = info.file.response.data.url
  }
}

function resetForm() {
  form.value = { productId: undefined, rating: 5, tag: undefined, content: '' }
  fileList.value = []
}

/** 打开时：新增清空，编辑回填 */
watch(() => props.visible, (val) => {
  if (!val) {
    resetForm()
    return
  }
  if (props.reviewId) {
    getReviewDetail(props.reviewId).then((res) => {
      const data = res.data.data
      form.value = {
        productId: data.productId,
        rating: data.rating || 5,
        tag: data.tag || undefined,
        content: data.content || '',
      }
      // 图片回填成 a-upload 的 fileList 结构
      fileList.value = parseImages(data.images).map((item) => ({
        uid: item.url,
        name: item.url.split('/').pop(),
        status: 'done',
        url: imgUrl(item.url),
        response: { data: { url: item.url } },
      }))
      // 编辑时把当前商品也放进下拉，否则选中项显示不出名字
      if (data.productId) {
        productOptions.value = [
          { id: data.productId, name: data.productName, title: data.productName },
          ...productOptions.value.filter((p) => p.id !== data.productId),
        ]
      }
    })
  } else {
    resetForm()
    searchProduct('')
  }
})

function handleSubmit() {
  if (!form.value.productId) {
    message.error('请选择商品')
    return
  }
  if (!form.value.rating || form.value.rating < 1 || form.value.rating > 5) {
    message.error('请选择 1~5 星评分')
    return
  }
  if (!form.value.content || form.value.content.trim().length < 5) {
    message.error('评价内容至少 5 个字')
    return
  }
  const images = fileList.value
      .filter((f) => f.status === 'done' && f.response && f.response.data && f.response.data.url)
      .map((f) => ({ url: f.response.data.url, type: 'image' }))
  const payload = {
    productId: form.value.productId,
    rating: form.value.rating,
    tag: form.value.tag || null,
    content: form.value.content.trim(),
    images: images.length ? JSON.stringify(images) : null,
  }
  submitting.value = true
  const req = props.reviewId
    ? updateVirtualReview(props.reviewId, payload)
    : addVirtualReview(payload)
  req.then(() => {
    message.success(props.reviewId ? '保存成功' : '新增成功')
    emit('update:visible', false)
    emit('success')
  }).finally(() => {
    submitting.value = false
  })
}

/** 解析媒体 JSON：[{"url":"...","type":"image"}] */
function parseImages(json) {
  if (!json) return []
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr.filter((m) => m && m.url) : []
  } catch (e) {
    return []
  }
}

function imgUrl(path) {
  if (!path) return ''
  return /^https?:\/\//.test(path) ? path : (import.meta.env.VITE_API_BASE_URL || '') + path
}
</script>

<style scoped>
.tip {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}
</style>
