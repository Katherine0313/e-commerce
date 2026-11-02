<template>
  <div class="shipment-container">
    <a-table :dataSource="list" :row-selection="{selectedRowKeys,onChange:onOrderSelectChange}" row-key="id">
      <a-table-column title="编号" dataIndex="id"></a-table-column>
      <a-table-column title="订单编号" dataIndex="orderNo"></a-table-column>
      <a-table-column title="发货时间" dataIndex="shipAt"></a-table-column>
      <a-table-column title="订单金额" dataIndex="payAmount"></a-table-column>
      <a-table-column title="优惠金额">
        <template #default="{record}">
          <span v-if="record.discountAmount > 0" style="color:#FF6700">-¥{{ record.discountAmount }}</span>
          <span v-else>—</span>
        </template>
      </a-table-column>
      <a-table-column title="支付方式" dataIndex="payTypeDesc"></a-table-column>
      <a-table-column title="客户" dataIndex="consignee"></a-table-column>
      <a-table-column title="配送方式" dataIndex="courier"></a-table-column>
      <a-table-column title="快递单号" dataIndex="trackingNumber"></a-table-column>
      <a-table-column title="订单状态" dataIndex="orderStatus">
        <template #default="{record}">
          <a-tag :color="orderStatus.color[record.orderStatus] || 'default'">
            {{ orderStatus.map[record.orderStatus] || record.orderStatus }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="操作">
        <template #default="{record}">
          <div class="ops">
            <a-button type="primary" @click="emit('view', record.id)" size="small">查看订单</a-button>
            <a-button type="primary" @click="handleExpress(record)" size="small">物流跟踪</a-button>
            <a-button v-if="hasPermi('order:order:update')" @click="handleFinishOrder(record)" size="small">确认收货</a-button>
            <a-button type="dashed" :disabled="record.has_after_sale" @click="openAfterSale(record)" size="small">申请售后</a-button>
            <a-button v-if="hasPermi('order:order:remove')" type="link" @click="handleDeleteOrder(record)" size="small">删除</a-button>
          </div>
        </template>
      </a-table-column>
    </a-table>
    <a-button v-if="hasPermi('order:order:remove')" class="bat-delete-btn" @click="handleBatchDeleteOrders(selectedRowKeys)">批量删除</a-button>

    <!--物流跟踪弹窗-->
    <a-modal v-model:visible="expressVisible" title="物流轨迹" :footer="null" width="600px">
      <div class="logistics-header">
        <div>快递公司：<strong>{{ logisticsData.courier }}</strong></div>
        <div>快递单号：<strong>{{ logisticsData.trackingNumber }}</strong></div>
      </div>
      <a-timeline v-if="logisticsData.traces?.length" style="margin-top: 20px;">
        <a-timeline-item
            v-for="(item, index) in logisticsData.traces"
            :key="index"
            :color="index === 0 ? 'green' : (index === logisticsData.traces.length - 1 ? 'blue' : 'gray')"
        >
          <div class="trace-item">
            <div class="trace-status">{{ item.status }}</div>
            <div class="trace-desc">{{ item.desc }}</div>
            <div class="trace-time" v-if="item.time">{{ item.time }}</div>
          </div>
        </a-timeline-item>
      </a-timeline>
      <a-empty v-else description="暂无物流信息" />
    </a-modal>

    <!--申请售后弹窗-->
    <a-modal v-model:visible="afterSaleVisible" title="申请售后" width="560px"
             ok-text="提交售后申请" cancel-text="取消"
             @ok="submitAfterSale" @cancel="afterSaleVisible = false">
      <a-form :model="afterSaleForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="订单编号">
              <a-input v-model:value="afterSaleForm.orderNo" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="订单状态">
              <a-input v-model:value="afterSaleForm.orderStatus" disabled />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="售后类型" required>
          <a-select v-model:value="afterSaleForm.after_sale_type">
            <a-select-option value="only_refund">仅退款</a-select-option>
            <a-select-option value="return_refund">退货退款</a-select-option>
            <a-select-option value="exchange">换货</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="售后原因" required>
          <a-select v-model:value="afterSaleForm.reason" placeholder="请选择售后原因">
            <a-select-option value="quality">质量问题</a-select-option>
            <a-select-option value="seven_days">七天无理由</a-select-option>
            <a-select-option value="wrong_goods">发错货</a-select-option>
            <a-select-option value="rejected">用户拒收</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="售后备注">
          <a-textarea v-model:value="afterSaleForm.remark" placeholder="填写问题描述" :rows="4" />
        </a-form-item>
        <a-form-item label="上传凭证">
          <a-upload
              v-model:file-list="fileList"
              :action="uploadAction"
              :headers="uploadHeaders"
              :before-upload="beforeUpload"
              name="file"
              list-type="picture-card"
              :multiple="true"
              accept="image/*"
              @preview="handlePreview"
              @change="handleUploadChange"
          >
            <div v-if="fileList.length < 5">
              <PlusOutlined />
              <div style="margin-top: 8px; color: rgba(0,0,0,0.45)">上传凭证图片</div>
            </div>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>

    <!--凭证图片预览-->
    <a-modal v-model:visible="previewVisible" :footer="null" title="凭证预览">
      <img :src="previewImage" style="width: 100%" alt="凭证图片" />
    </a-modal>
  </div>
</template>
<script setup>
import {ref, reactive, createVNode} from 'vue'
import {deleteOrder, deleteOrders, getLogistics, finishOrder} from '@/api/orders.js'
import {addAfterSale} from '@/api/afterSale.js'
import {message, Modal} from 'ant-design-vue'
import {ExclamationCircleOutlined, PlusOutlined} from '@ant-design/icons-vue'
import {hasPermi} from '@/utils/auth.js'
import {getToken} from '@/utils/token'
import {compressImage} from '@/utils/compressImage'
import {getImageSpec} from '@/utils/image-spec'

defineProps({
  list: {type: Array, default: () => []},
  orderStatus: {type: Object, default: () => ({ map: {}, color: {} })}
})

// ================== 确认收货 ==================
const emit = defineEmits(['refresh', 'view'])
const handleFinishOrder = (record) => {
  Modal.confirm({
    title: '确认收货',
    icon: createVNode(ExclamationCircleOutlined),
    content: `确认订单 ${record.orderNo} 已收货吗？`,
    onOk() {
      finishOrder(record.id)
          .then(() => {
            message.success('确认收货成功')
            emit('refresh')
          })
          .catch(err => {
            console.log(err)
            message.error('操作失败')
          })
    }
  })
}
//====================== 复选框 ====================
const selectedRowKeys = ref([])
const onOrderSelectChange = (key) => {
  selectedRowKeys.value = key
}
// ================== 删除订单 ==================
const handleDeleteOrder = (record) => {
  Modal.confirm({
    title: '删除订单',
    icon: createVNode(ExclamationCircleOutlined),
    content: `请问确认删除订单 ${record.orderNo} 吗?`,
    onOk() {
      deleteOrder(record.id)
          .then(() => {
            message.success('删除成功')
            emit('refresh')
          })
          .catch(err => {
            console.log(err)
            message.error('删除失败')
          })
    }
  })
}
//====================== 批量删除 ==================
const handleBatchDeleteOrders = (ids) => {
  Modal.confirm({
    title: '批量删除订单',
    icon: createVNode(ExclamationCircleOutlined),
    content: `请问确认删除这 ${ids.length} 条订单吗？`,
    onOk() {
      deleteOrders(ids)
          .then(() => {
            message.success('订单已删除')
            emit('refresh')
          })
          .catch(err => {
            console.log(err)
            message.error('删除失败')
          })
    }
  })
}
//====================== 物流跟踪 ==================
const expressVisible = ref(false)
const logisticsData = reactive({
  courier: '',
  trackingNumber: '',
  traces: []
})
const handleExpress = (record) => {
  expressVisible.value = true
  // 重置
  logisticsData.courier = ''
  logisticsData.trackingNumber = ''
  logisticsData.traces = []
  // 请求物流轨迹
  getLogistics(record.id)
      .then(res => {
        const data = res.data?.data
        if (data) {
          logisticsData.courier = data.courier
          logisticsData.trackingNumber = data.trackingNumber
          logisticsData.traces = data.traces || []
        }
      })
      .catch(err => {
        console.log(err)
        message.error('获取物流信息失败')
      })
}
// ================== 申请售后 ==================
const uploadAction = import.meta.env.VITE_API_BASE_URL + '/api/admin/upload?type=after-sale'
const uploadHeaders = {Authorization: 'Bearer ' + getToken()}
// 售后凭证图最长边压到 1200：列表里只缩略到 88px，但点开预览要看清晰
const afterSaleSpec = getImageSpec('after-sale')
const beforeUpload = (file) => compressImage(file, afterSaleSpec)

const afterSaleVisible = ref(false)
const afterSaleForm = reactive({
  order_id: null,
  orderNo: '',
  orderStatus: '已发货',
  after_sale_type: 'only_refund',
  reason: undefined,
  remark: '',
})
const fileList = ref([])

// 上传凭证：失败（如文件类型不被允许）时即时提示后端返回的具体原因
const handleUploadChange = (info) => {
  if (info.file.status === 'error') {
    const msg = (info.file.response && info.file.response.message) || '上传失败，请重试'
    message.error(msg)
  }
}

const openAfterSale = (record) => {
  afterSaleForm.order_id = record.id
  afterSaleForm.orderNo = record.orderNo
  afterSaleForm.orderStatus = '已发货'
  afterSaleForm.after_sale_type = 'only_refund'
  afterSaleForm.reason = undefined
  afterSaleForm.remark = ''
  fileList.value = []
  afterSaleVisible.value = true
}

const submitAfterSale = () => {
  if (!afterSaleForm.reason) {
    message.warning('请选择售后原因')
    return
  }
  if (fileList.value.some(f => f.status === 'uploading')) {
    message.warning('凭证图片上传中，请稍候')
    return
  }
  if (fileList.value.some(f => f.status === 'error')) {
    message.error('部分凭证图片上传失败，请重试')
    return
  }
  const images = fileList.value.map(f => f.response?.data?.url).filter(Boolean)

  addAfterSale({
    order_id: afterSaleForm.order_id,
    after_sale_type: afterSaleForm.after_sale_type,
    reason: afterSaleForm.reason,
    remark: afterSaleForm.remark,
    images,
  })
      .then(() => {
        message.success('售后申请已提交')
        afterSaleVisible.value = false
        emit('refresh')
      })
      .catch(err => {
        console.log(err)
        message.error(err.response?.data?.message || '提交失败')
      })
}

const previewVisible = ref(false)
const previewImage = ref('')
const handlePreview = (file) => {
  previewImage.value = file.url || file.thumbUrl || file.response?.data?.url || ''
  previewVisible.value = true
}
</script>

<style scoped>
.shipment-container {
  margin-top: 20px;
  position: relative;
}


/*行元素*/
:deep(.ant-table .ant-table-tbody > tr > td) {
  font-size: 14px;
}


.bat-delete-btn {
  position: absolute;
  bottom: 15px;
}

/* 操作列按钮：每行最多两个，自动换行 */
.ops {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  gap: 8px;
}

/*物流轨迹*/
.logistics-header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
}
.logistics-header div {
  line-height: 2;
  font-size: 14px;
}
.trace-item {
  line-height: 1.8;
}
.trace-status {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.trace-desc {
  font-size: 13px;
  color: #666;
}
.trace-time {
  font-size: 12px;
  color: #999;
}
</style>
