<template>
  <div class="add-goods-container">
    <a-card title="商品信息">
      <a-form :model="addGoodsForm" :rules="addGoodsRules" ref="addGoodsFormRef"
              :label-col="{span:3, style:{paddingRight:'5px'}}" :wrapper-col="{span:21}">
        <a-form-item label="商品分类" name="categoryId" >
          <a-cascader
              :options="categoryTree"
              :field-names="{ value: 'id', label: 'name', children: 'children' }"
              v-model:value="addGoodsForm.categoryId"
              :change-on-select="false"
              style="max-width:270px"
          />
        </a-form-item>
        <a-form-item label="商品名称" name="name">
          <a-input placeholder="请输入商品名称" v-model:value="addGoodsForm.name" style="width:40%" />
        </a-form-item>
        <a-form-item label="商品品牌" name="brand">
          <a-select placeholder="请选择商品品牌" v-model:value="addGoodsForm.brand">
            <a-select-option v-for="brand in brandOptions" :value="brand" :key="brand" label="option"></a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="主标题">
          <a-textarea v-model:value="addGoodsForm.title" show-count maxLength="100" />
        </a-form-item>
        <a-form-item label="商品副标题" name="subTitle">
          <a-input v-model:value="addGoodsForm.subTitle" placeholder="请输入商品副标题" />
        </a-form-item>
        <a-form-item label="商品图片">
          <a-upload
              :action="uploadAction"
              :headers="uploadHeaders"
              :before-upload="beforeUpload"
              v-model:file-list="fileList"
              @change="imageUpload"
          >
            <a-button class="upload-btn" >
              <UploadOutlined />
              点击上传
            </a-button>
          </a-upload>
        </a-form-item>
        <a-form-item label="商品详情">
          <Editor v-model="addGoodsForm.body" />
        </a-form-item>
      </a-form>
    </a-card>
    <a-card title="销售信息" class="card">
      <SalesInfo ref="salesInfoRef" />
    </a-card>
  </div>
  <div class="addGoods-btn">
    <a-button type="primary" @click="cancel">取消</a-button>
    <a-button type="primary" @click="handleSubmit">提交</a-button>
  </div>

</template>
<script setup>
import {onActivated, onMounted, ref} from 'vue'
import {getGoodsList, getBrandList, getCategoryTree, addGoods} from '@/api/products.js'
import {UploadOutlined} from '@ant-design/icons-vue'
// 导入消息组件
import {message} from 'ant-design-vue'
// 导入富文本组件
import Editor from './Editor.vue'
import SalesInfo from './SalesInfo.vue'
import {getToken} from '@/utils/token'
import {compressImage} from '@/utils/compressImage'
import {getImageSpec} from '@/utils/image-spec'


const data = ref([])
const total = ref(0)
const current = ref(1)
const pageSize = ref(10) // 每页条目默认10条
// 定义输入框的search
const search = ref('')

// 添加商品对话框表单实例ref，用于触发校验、重置
const addGoodsFormRef = ref(null)
// 销售信息子组件实例
const salesInfoRef = ref(null)
// 商品图片上传列表（提交成功后清空缩略图）
const fileList = ref([])
// 定义商品品牌响应式变量数组
const brandOptions = ref([])
// 定义层级分类的数据源
const categoryTree = ref([])
const uploadAction = import.meta.env.VITE_API_BASE_URL + '/api/admin/upload'
// 商品主图压成 800×800 白底方：与历史商品图（python 脚本产物）口径一致，
// 商品卡和详情页都是方图位，规格表见 utils/image-spec.js
const productImageSpec = getImageSpec('upload')
const beforeUpload = (file) => compressImage(file, productImageSpec)
// 加载商品数据，分页复用，便于统一维护
const loadData = () => {
  // handlePageChange事件触发时，加载的商品要对应到点击的那一页，所以
  // 获取商品列表的函数一定要传参，参数是当前页（当前页的值由current接收）和每页条目数
  getGoodsList({
    page: current.value,
    pageSize: pageSize.value,
    search: search.value,
  })
      .then(res => {
        data.value = res.data.data
        total.value = res.data.total
      })
      .catch(err => {
        message.error('网络连接超时，请检查网络后再试')
        console.log('商品列表加载失败', err)
      })
}
// 加载全部品牌下拉选项数据
const loadBrand = () => {
  getBrandList()
      .then(res => {
        // 将接口返回的品牌数组赋值给下拉响应式变量，渲染a-select-option
        brandOptions.value = res.data.data
      })
      .catch(err => {
        message.error('网络连接超时，请检查网络后再试')
        console.log('商品品牌列表加载失败', err)
      })
}
// 渲染商品列表的表格,在生命周期钩子中调用，确保DOM已就绪再拉取接口
onMounted(() => {
  loadData()    // 加载商品分页列表数据
  loadBrand()   // 加载品牌下拉选项数据

})
onActivated(() => {
  getCategoryTree()
      .then(res => {
        categoryTree.value = res.data.data
      })
  .catch(err => {
    console.log(err)
  })
})
// ====================== 按钮 ======================

//提交按钮
const handleSubmit = () => {
  // 1. 先校验父组件表单
  addGoodsFormRef.value.validate()
      .then(() => {
        // 2. 再检验子组件的销售信息表单
       return salesInfoRef.value.validate()
      })
      .then(() => {
        // 3. 级联框的值是路径数组(如[1,101])，后端需要单个 number，取最后一级 id
        const path = addGoodsForm.value.categoryId || []
        const goodsData = {
          ...addGoodsForm.value,
          categoryId: path.length ? Number(path[path.length - 1]) : null,
          ...salesInfoRef.value?.salesInfoForm,
        }
        // 4. 调用添加商品接口
        return addGoods(goodsData)
      })
      .then(res => {
        console.log(res)
        // 3. 后端接口返回成功，执行收尾逻辑
        message.success('商品新增成功')
        // 主表单 + 图片 + 富文本 + 销售信息全部清空，方便继续录入下一件
        resetAll()
        // 重新加载数据
        loadData()
      })
      .catch(err => {
        //  errorFields（存储所有出错字段的数组）
        if (err && err.errorFields) {
          console.log('表单校验未通过', err)
        } else {
          // 只有接口请求报错才提示
          message.error('网络连接异常，请检查网络后再试')
          console.log('产品新增失败', err)
        }
      })
}
// 清空整页表单：主表单有 name 的字段由 resetFields 清，其余手动清
const resetAll = () => {
  addGoodsFormRef.value?.resetFields()
  addGoodsForm.value.name = ''
  addGoodsForm.value.brand = undefined
  addGoodsForm.value.subTitle = ''
  addGoodsForm.value.title = ''
  addGoodsForm.value.categoryId = []
  addGoodsForm.value.image = undefined
  addGoodsForm.value.body = ''
  fileList.value = []
  salesInfoRef.value?.resetForm()
}
// 取消按钮
const cancel = () => {
  resetAll()
}
// ====================== 表单校验 =====================
// 数据表单（统一放对象里，和a-form的model对应）
const addGoodsForm = ref({
  name: '',
  image: undefined,
  body: '',
  // brand用undefined,否则placeholder不显示
  brand: undefined,
  subTitle: '',
  title: '',
  categoryId: [],
})

// 校验规则
const addGoodsRules = {
  categoryId: [
    {required: true, type: 'array', message: '商品分类不能为空', trigger: 'change'}
  ],
  name: [
    {required: true, message: '商品名称不能为空', trigger: 'blur'}
  ],
  brand: [
    {required: true, message: '商品品牌不能为空', trigger: 'change'}
  ],
  subTitle: [
    {required: true, message: '商品副标题不能为空', trigger: 'blur'}
  ]
}
// ====================== 图片上传 =====================
const imageUpload = (info) => {
  if (info.file.status === 'done') {
    // 把url存进image
    addGoodsForm.value.image = info.file.response.data.url
  } else if (info.file.status === 'error') {
    // 上传失败（如文件类型不被允许）：取后端返回的具体原因提示用户
    const msg = (info.file.response && info.file.response.message) || '图片上传失败，请重试'
    message.error(msg)
  }
}
const uploadHeaders = {
  Authorization: 'Bearer ' + getToken()
}
// ====================== 富文本 =====================


</script>


<style scoped>
.add-goods-container {
  max-width:900px;
  display: flex;
  flex-direction: column;
}

.card {
  margin-top: 20px;
}

.addGoods-btn {
  display: flex;
  gap: 20px;
  margin: 20px 0 0 600px;
}

/*卡片标题样式*/
:deep(.ant-card-head-title ) {
  font-weight: bold;
}

/* 笔记本：600px 左边距会把按钮挤出屏幕，改为右对齐 */
@media (max-width: 1200px) {
  .addGoods-btn {
    justify-content: flex-end;
    margin-left: 0;
  }
}

/* 手机：表单标签改为上下结构，固定宽度字段铺满 */
@media (max-width: 767px) {
  .add-goods-container {
    max-width: 100%;
    width: 100%;
  }

  .add-goods-container :deep(.ant-form-item-row) {
    display: block;
  }

  .add-goods-container :deep(.ant-form-item-label),
  .add-goods-container :deep(.ant-form-item-control) {
    width: 100%;
    max-width: none;
    flex: none;
    text-align: left;
  }

  .add-goods-container :deep(.ant-cascader),
  .add-goods-container :deep(.ant-input),
  .add-goods-container :deep(.ant-select) {
    width: 100% !important;
    max-width: 100% !important;
  }

  .addGoods-btn {
    margin: 16px 0 0;
    justify-content: flex-end;
  }
}
</style>