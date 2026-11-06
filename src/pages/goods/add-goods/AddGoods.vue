<template>
  <div class="add-goods-container">
    <!-- 顶部步骤条 -->
    <a-steps :current="currentStep" class="steps" @change="onStepChange">
      <a-step title="基础信息" description="分类 / 名称 / 图片 / 详情" />
      <a-step title="规格与销售" description="商品参数 / SKU / 上架状态" />
    </a-steps>

    <!-- Step 1：商品基础信息 -->
    <a-card v-if="currentStep === 0" title="商品基础信息">
      <a-form :model="addGoodsForm" :rules="addGoodsRules" ref="addGoodsFormRef"
              :label-col="{span:3, style:{paddingRight:'5px'}}" :wrapper-col="{span:21}">
        <a-form-item label="商品分类" name="categoryId" >
          <a-cascader
              :options="categoryTree"
              :field-names="{ value: 'id', label: 'name', children: 'children' }"
              v-model:value="addGoodsForm.categoryId"
              @change="handleCategoryChange"
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
      <div class="step-actions">
        <a-button type="primary" @click="nextToStep2">下一步：填写规格</a-button>
      </div>
    </a-card>

    <!-- Step 2：商品规格 + 销售信息 -->
    <template v-if="currentStep === 1">
      <a-card title="商品规格" class="card">
        <SpecsEditor ref="specsRef" />
        <a-divider>销售规格（SKU）</a-divider>
        <SkuEditor ref="skuEditorRef" />
      </a-card>
      <a-card title="销售信息" class="card">
        <SalesInfo ref="salesInfoRef" />
      </a-card>
      <div class="step-actions">
        <a-button @click="currentStep = 0">上一步</a-button>
        <a-button type="primary" @click="handleSubmit">提交商品</a-button>
      </div>
    </template>
  </div>
</template>
<script setup>
import {nextTick, onActivated, onMounted, ref} from 'vue'
import {getGoodsList, getBrandList, getCategoryTree, addGoods} from '@/api/products.js'
import {UploadOutlined} from '@ant-design/icons-vue'
// 导入消息组件
import {message} from 'ant-design-vue'
// 导入富文本组件
import Editor from './Editor.vue'
import SalesInfo from './SalesInfo.vue'
import SpecsEditor from './SpecsEditor.vue'
import SkuEditor from './SkuEditor.vue'
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
// 规格参数子组件实例
const specsRef = ref(null)
// 销售规格（SKU）子组件实例
const skuEditorRef = ref(null)
// 当前步骤：0 = 基础信息，1 = 规格与销售
const currentStep = ref(0)
// 商品图片上传列表（提交成功后清空缩略图）
const fileList = ref([])
// 定义商品品牌响应式变量数组
const brandOptions = ref([])
// 定义层级分类的数据源
const categoryTree = ref([])

// 按 id 找到分类节点（叶子节点的 specTemplate 用于自动生成规格参数行）
const findCategoryNode = (tree, targetId) => {
  for (const node of tree) {
    if (node.id === targetId) return node
    if (node.children) {
      const hit = findCategoryNode(node.children, targetId)
      if (hit) return hit
    }
  }
  return null
}

// 切换分类：按新分类的规格模板重建参数行 + 重新拉销售规格库（只展示该分类相关的规格名）
const handleCategoryChange = (value) => {
  const id = Array.isArray(value) ? value[value.length - 1] : value
  const node = findCategoryNode(categoryTree.value, id)
  specsRef.value?.applyTemplate(node?.specTemplate || [])
  // SKU 编辑器按分类过滤规格库：避免手机类也看到"轴体/色温"等无关规格名
  skuEditorRef.value?.setCategory(id ?? null)
}
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
// ====================== 步骤切换 ======================
// 点击步骤条切换：从 0 → 1 要校验；从 1 → 0 不需要
const onStepChange = (step) => {
  if (step === currentStep.value) return
  if (step > currentStep.value) {
    nextToStep2()
  } else {
    currentStep.value = step
  }
}
// Step 1 → Step 2：校验基础信息表单必须过
const nextToStep2 = () => {
  addGoodsFormRef.value.validate()
      .then(() => {
        currentStep.value = 1
        // v-if 导致 SkuEditor / SpecsEditor 首次挂载，handleCategoryChange 里的调用可能白跑（ref 为 null）
        // 所以切到 Step 2 后主动再调一次，确保规格模板和规格库都已按分类过滤加载
        const path = addGoodsForm.value.categoryId || []
        const id = path.length ? Number(path[path.length - 1]) : null
        const node = findCategoryNode(categoryTree.value, id)
        nextTick(() => {
          specsRef.value?.applyTemplate(node?.specTemplate || [])
          skuEditorRef.value?.setCategory(id ?? null)
        })
      })
      .catch(() => {
        message.warning('请先完善基础信息（分类、名称、品牌、副标题）')
      })
}

// ====================== 按钮 ======================

//提交按钮
const handleSubmit = () => {
  // 0. 规格参数：参数名不能为空（后端也会拦，这里先提示更友好）
  if (!specsRef.value?.validate()) {
    return
  }
  // 0.1 销售规格（SKU）：校验组合、价格与库存
  if (!skuEditorRef.value?.validate()) {
    return
  }
  // 1. 校验主表单
  addGoodsFormRef.value.validate()
      .then(() => {
        // 2. 级联框的值是路径数组(如[1,101])，后端需要单个 number，取最后一级 id
        const path = addGoodsForm.value.categoryId || []
        const goodsData = {
          ...addGoodsForm.value,
          categoryId: path.length ? Number(path[path.length - 1]) : null,
          ...salesInfoRef.value?.salesInfoForm,
          specs: specsRef.value?.getSpecs() ?? [],
          ...skuEditorRef.value?.getPayload(),
        }
        // 商品级价格/库存由 SKU 聚合兜底，后端保存时会再按 SKU 重算
        const aggregate = skuEditorRef.value?.getAggregate()
        if (aggregate) {
          goodsData.salesPrice = aggregate.salesPrice
          goodsData.marketPrice = aggregate.marketPrice
          goodsData.costPrice = aggregate.costPrice
          // 商品级库存不再由前端提交，后端按 SKU 自动重算（库存变动只能走库存模块）
          goodsData.productCode = goodsData.productCode || aggregate.productCode || `SPU${Date.now()}`
        }
        // 3. 调用添加商品接口
        return addGoods(goodsData)
      })
      .then(() => {
        message.success('商品新增成功')
        resetAll()
        loadData()
      })
      .catch(err => {
        if (err && err.errorFields) {
          console.log('表单校验未通过', err)
        } else {
          message.error('网络连接异常，请检查网络后再试')
          console.log('产品新增失败', err)
        }
      })
}
// 清空整页表单：主表单有 name 的字段由 resetFields 清，其余手动清
const resetAll = () => {
  currentStep.value = 0
  addGoodsFormRef.value?.resetFields()
  addGoodsForm.value.name = ''
  addGoodsForm.value.brand = undefined
  addGoodsForm.value.subTitle = ''
  addGoodsForm.value.title = ''
  addGoodsForm.value.categoryId = []
  addGoodsForm.value.image = undefined
  addGoodsForm.value.body = ''
  fileList.value = []
  specsRef.value?.resetForm()
  skuEditorRef.value?.reset()
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
  margin: 0 auto;
}

.card {
  margin-top: 20px;
}

.steps {
  margin-bottom: 24px;
  max-width: 600px;
}

.step-actions {
  display: flex;
  gap: 12px;
  margin: 20px 0;
  padding-top: 16px;
  border-top: 1px dashed #f0f0f0;
  justify-content: center;
}

/*卡片标题样式*/
:deep(.ant-card-head-title ) {
  font-weight: bold;
}

/* 笔记本 */
@media (max-width: 1200px) {
  .steps {
    max-width: 100%;
  }
}

/* 手机：表单标签改为上下结构 */
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
}
</style>