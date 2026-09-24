<template>
  <a-modal v-model:visible="onlyRefundReviewVisible"
           title="售后审核" width="min(900px, 92vw)" class="review" okText="确认" cancelText="取消" @ok="submitReview">
    <div class="item">
      <div class="item-title">售后信息</div>
      <a-descriptions bordered :column="2" :label-style="{ width: '160px' }">
        <a-descriptions-item label="售后单号">{{ currentOrder?.after_sale_no }}</a-descriptions-item>
        <a-descriptions-item label="申请时间">{{ currentOrder?.created_at }}</a-descriptions-item>
        <a-descriptions-item label="售后类型"> {{ afterSaleStatus.typeMap[currentOrder?.after_sale_type] }}
        </a-descriptions-item>
        <a-descriptions-item label="售后原因">{{
            afterSaleStatus.reasonMap[currentOrder?.reason]
          }}
        </a-descriptions-item>
        <a-descriptions-item label="补充说明" :span="2">{{ currentOrder?.remark }}</a-descriptions-item>
      </a-descriptions>
    </div>
    <div class="item">
      <div class="item-title">用户信息</div>
      <a-descriptions bordered :column="2" :label-style="{ width: '160px' }">
        <a-descriptions-item label="收货人">{{ currentOrder?.consignee }}</a-descriptions-item>
        <a-descriptions-item label="手机号码">{{ currentOrder?.phone }}</a-descriptions-item>
        <a-descriptions-item label="收货地址" :span="2">
          {{ (currentOrder?.region || '') + ' ' + (currentOrder?.detail_address || '') }}
        </a-descriptions-item>
      </a-descriptions>
    </div>
    <div class="item">
      <div class="item-title">订单信息</div>
      <a-descriptions bordered :column="2" :label-style="{ width: '160px' }">
        <a-descriptions-item label="订单号">{{ currentOrder?.order_no }}</a-descriptions-item>
        <a-descriptions-item label="支付时间">{{ currentOrder?.pay_at }}</a-descriptions-item>
        <a-descriptions-item label="支付方式">{{ currentOrder?.pay_type }}</a-descriptions-item>
        <a-descriptions-item label="实付总额">￥{{ currentOrder?.pay_amount }}</a-descriptions-item>
      </a-descriptions>
    </div>
    <div class="item">
      <div class="item-title">商品信息</div>
      <a-table :dataSource="items" row-key="product_id" :pagination="false" size="small"
               style="margin-bottom: 16px;" class="table-title">
        <a-table-column title="商品名称" dataIndex="product_name"></a-table-column>
        <a-table-column title="商品图片">
          <template #default="{record}">
            <a-image :src="record.image" :width="80" />
          </template>
        </a-table-column>
        <a-table-column title="单价" width="100">
          <template #default="{ record }">￥{{ record.sales_price }}</template>
        </a-table-column>
        <a-table-column title="增值保障" width="100">
          <template #default="{ record }">
            <span v-if="Number(record.insurance_fee) > 0">￥{{ record.insurance_fee }}</span>
            <span v-else>-</span>
          </template>
        </a-table-column>
        <a-table-column title="购买数量" dataIndex="quantity" width="100"></a-table-column>
        <a-table-column title="单品小计">
          <template #default="{ record }">￥{{ record.refund_amount }}</template>
        </a-table-column>
      </a-table>
    </div>
    <div class="item">
      <div class="item-title">售后进度</div>
      <div style="margin-top:15px">
        <a-steps :current="stepCurrent" size="small">
          <a-step title="用户申请售后" :description="currentOrder?.created_at" />
          <a-step title="商家审核"
                  :status="currentOrder?.status === 'rejected' ? 'error' : undefined"
                  :description="stepDescription(1)"></a-step>
          <a-step title="商家确认退款" :description="stepDescription(2)"></a-step>
          <a-step title="退款成功" :description="stepDescription(3)"></a-step>
        </a-steps>
      </div>
    </div>
    <a-form :model="confirmForm" layout="vertical">
      <a-form-item label="售后审核" name="result">
        <a-select v-model:value="confirmForm.result" placeholder="请选择审核结果" style="width:200px">
          <a-select-option value="approve">审核通过</a-select-option>
          <a-select-option value="refund">确认退款</a-select-option>
          <a-select-option value="refunded">已退款</a-select-option>
          <a-select-option value="reject">拒绝售后</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="商家内部备注" name="merchant_remark">
        <a-textarea v-model:value="confirmForm.merchant_remark" placeholder="请输入内部备注" :rows="3" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<script setup>
import {ref, computed} from "vue";
import {getAfterSale, reviewAfterSale} from '@/api/afterSale.js'
import {message} from 'ant-design-vue'

const onlyRefundReviewVisible = ref(false)
const currentOrder = ref()
// =================== 加载订单详情 ============
const items = ref([])
const loadDetailOrders = (id) => {
  getAfterSale(id)
      .then(res => {
        const detail = res.data.data
        currentOrder.value = detail
        items.value = detail.items
      })
      .catch(err => {
        console.log('详情请求失败：', err.response?.status, err.response?.data)
      })

}
defineProps({
  afterSaleStatus: {type: Object, default: () => ({map: {}, reasonMap: {}, typeMap: {}})}
})

// 定义打开弹窗的方法，暴露给父组件AfterSaleList.vue
const onlyRefundReviewOpen = (record) => {
  onlyRefundReviewVisible.value = true
  currentOrder.value = record
  loadDetailOrders(record.id)
}
defineExpose({onlyRefundReviewOpen})
// ================ 商家审核 =================
const confirmForm = ref({result: undefined, merchant_remark: ''})

// 根据售后状态，算进度条走到第几步
const stepCurrent = computed(() => {
  const status = currentOrder.value?.status
  if (status === 'reviewing') return 1   // 商家审核中 → 停在「商家审核」
  if (['refunding', 'exchanging', 'returning'].includes(status)) return 2  // 审核通过 → 到「商家确认退款」
  if (status === 'refund_confirming') return 3   // 确认退款 → 到「退款成功」
  if (['refunded', 'exchanged', 'returned'].includes(status)) return 4     // 完成 → 全部走完
  return 1                                // 其它（含拒绝）默认停「商家审核」
})

// 进度条每一步的描述文字
const stepDescription = (index) => {
  const o = currentOrder.value
  const status = o?.status
  const done = ['refunded', 'exchanged', 'returned']
  const processing = ['refunding', 'exchanging', 'returning']
  if (index === 0) return o?.created_at || ''
  if (index === 1) {           // 商家审核
    if (status === 'reviewing') return '审核中'
    if (status === 'rejected') return o?.rejected_at || '不通过'
    if (processing.includes(status) || status === 'refund_confirming' || done.includes(status)) return o?.review_at || '已完成'
    return '待处理'
  }
  if (index === 2) {           // 商家确认退款
    if (status === 'rejected') return '—'
    if (processing.includes(status)) return '退款中'
    if (status === 'refund_confirming') return o?.refund_at || '已确认退款'
    if (done.includes(status)) return o?.refund_at || '已完成'
    return '待处理'
  }
  if (index === 3) {           // 退款成功
    if (status === 'rejected') return '—'
    if (status === 'refund_confirming') return '退款中'
    if (done.includes(status)) return o?.refunded_at || '已完成'
    return '待处理'
  }
  return ''
}

// 下拉选项 → 后端 status
const reviewResultMap = {
  approve: 'refunding',          // 审核通过 → 退款中
  refund: 'refund_confirming',   // 确认退款 → 确认退款中
  refunded: 'refunded',          // 已退款 → 已退款
  reject: 'rejected',            // 拒绝售后 → 售后拒绝
}

const emit = defineEmits(['refresh'])
const submitReview = () => {
  const status = reviewResultMap[confirmForm.value.result]
  if (!status) {
    message.warning('请先选择审核结果')
    return
  }
  reviewAfterSale(currentOrder.value.id, {
    status,
    merchant_remark: confirmForm.value.merchant_remark,
  })
      .then(() => {
        message.success('审核提交成功')
        confirmForm.value = []
        onlyRefundReviewVisible.value = false
        loadDetailOrders(currentOrder.value.id)
        emit('refresh')
      })
      .catch(err => {
        message.error(err.response?.data?.message || '审核失败')
      })
}

</script>

<style scoped>
.review .item {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.item .item-title {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 5px;
  padding: 8px 0 8px 10px;
  font-size: 16px;
  border-radius: 8px;
}


.item .table-title:deep(.ant-table-tbody >tr >td) {
  font-size: 14px;
  text-align: center;
}

.item .table-item {
  border-radius: 8px;
}

/* 售后进度条：窄弹窗下缩小字体、允许换行，避免标题/时间戳被挡 */
.item :deep(.ant-steps-item-title) {
  font-size: 13px;
  white-space: normal;
  line-height: 1.4;
}

.item :deep(.ant-steps-item-description) {
  font-size: 12px;
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
}
</style>
