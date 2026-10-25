<template>
  <a-modal v-model:visible="exchangeReviewVisible"
           title="售后审核" width="min(900px, 92vw)" class="review" okText="确认" cancelText="取消" @ok="submitReview">
    <div class="item">
      <div class="item-title">售后信息</div>
      <a-descriptions bordered :column="isMobile ? 1 : 2" :label-style="isMobile ? {} : { width: '160px' }">
        <a-descriptions-item label="售后单号">{{ currentOrder?.afterSaleNo }}</a-descriptions-item>
        <a-descriptions-item label="申请时间">{{ currentOrder?.createdAt }}</a-descriptions-item>
        <a-descriptions-item label="售后类型"> {{ afterSaleStatus.typeMap[currentOrder?.afterSaleType] }}
        </a-descriptions-item>
        <a-descriptions-item label="售后原因">{{
            afterSaleStatus.reasonMap[currentOrder?.reason]
          }}
        </a-descriptions-item>
        <a-descriptions-item label="货物状态" :span="2">{{ currentOrder?.goodsStatusDesc || '—' }}</a-descriptions-item>
        <a-descriptions-item label="补充说明" :span="2">{{ currentOrder?.remark }}</a-descriptions-item>
      </a-descriptions>
    </div>
    <div class="item">
      <div class="item-title">用户信息</div>
      <a-descriptions bordered :column="isMobile ? 1 : 2" :label-style="isMobile ? {} : { width: '160px' }">
        <a-descriptions-item label="收货人">{{ currentOrder?.consignee }}</a-descriptions-item>
        <a-descriptions-item label="手机号码">{{ currentOrder?.phone }}</a-descriptions-item>
        <a-descriptions-item label="收货地址" :span="2">
          {{ (currentOrder?.region || '') + ' ' + (currentOrder?.detailAddress || '') }}
        </a-descriptions-item>
      </a-descriptions>
    </div>
    <div class="item">
      <div class="item-title">订单信息</div>
      <a-descriptions bordered :column="isMobile ? 1 : 2" :label-style="isMobile ? {} : { width: '160px' }">
        <a-descriptions-item label="订单号">{{ currentOrder?.orderNo }}</a-descriptions-item>
        <a-descriptions-item label="支付时间">{{ currentOrder?.payAt }}</a-descriptions-item>
        <a-descriptions-item label="支付方式">{{ currentOrder?.payTypeDesc }}</a-descriptions-item>
        <a-descriptions-item label="退款金额">￥{{ refundTotal.toFixed(2) }}</a-descriptions-item>
      </a-descriptions>
    </div>
    <div class="item">
      <div class="item-title">商品信息</div>
      <a-table :dataSource="items" row-key="productId" :pagination="false" size="small"
               style="margin-bottom: 16px;" class="table-title">
        <a-table-column title="商品名称" dataIndex="productName"></a-table-column>
        <a-table-column title="商品图片">
          <template #default="{record}">
            <img v-lazy="record.image" width="80" />
          </template>
        </a-table-column>
        <a-table-column title="单价" width="100">
          <template #default="{ record }">￥{{ record.salesPrice }}</template>
        </a-table-column>
        <a-table-column title="增值保障" width="100">
          <template #default="{ record }">
            <span v-if="Number(record.insuranceFee) > 0">￥{{ record.insuranceFee }}</span>
            <span v-else>-</span>
          </template>
        </a-table-column>
        <a-table-column title="购买数量" dataIndex="quantity" width="100"></a-table-column>
        <a-table-column title="单品小计">
          <template #default="{ record }">￥{{ record.refundAmount }}</template>
        </a-table-column>
      </a-table>
    </div>
    <div class="item">
      <div class="item-title">售后进度</div>
      <div style="margin-top:15px">
        <a-steps :current="stepCurrent" size="small">
          <a-step title="用户申请售后" :description="currentOrder?.createdAt" />
          <a-step title="商家审核"
                  :status="currentOrder?.status === 'rejected' ? 'error' : undefined"
                  :description="stepDescription(1)"></a-step>
          <a-step title="买家退货" :description="stepDescription(2)"></a-step>
          <a-step title="商家换货" :description="stepDescription(3)"></a-step>
          <a-step title="换货完成" :description="stepDescription(4)"></a-step>
        </a-steps>
      </div>
    </div>
    <a-form :model="confirmForm" layout="vertical">
      <a-form-item label="售后审核" name="result">
        <a-select v-model:value="confirmForm.result" placeholder="请选择审核结果" style="width:220px">
          <a-select-option value="approve">审核通过</a-select-option>
          <a-select-option value="exchanging">确认收到退货，开始换货</a-select-option>
          <a-select-option value="exchanged">换货完成</a-select-option>
          <a-select-option value="reject">拒绝售后</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="商家内部备注" name="merchantRemark">
        <a-textarea v-model:value="confirmForm.merchantRemark" placeholder="请输入内部备注" :rows="3" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<script setup>
import {ref, computed} from "vue";
import {getAfterSale, reviewAfterSale} from '@/api/afterSale.js'
import {message} from 'ant-design-vue'
import {useIsMobile} from '@/composables/useMediaQuery'

// 手机端描述列表改单列，避免 160px 标签把内容挤没
const isMobile = useIsMobile()
const exchangeReviewVisible = ref(false)
const currentOrder = ref()
// =================== 加载订单详情 ============
const items = ref([])
// 退款金额 = 售后明细单品小计之和（单品售后=该商品小计）
const refundTotal = computed(() =>
  (items.value || []).reduce((sum, i) => sum + (Number(i.refundAmount) || 0), 0)
)
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

// 定义打开弹窗的方法，暴露给父组件Exchange.vue
const exchangeReviewOpen = (record) => {
  exchangeReviewVisible.value = true
  currentOrder.value = record
  loadDetailOrders(record.id)
}
defineExpose({exchangeReviewOpen})
// ================ 商家审核 =================
const confirmForm = ref({result: undefined, merchantRemark: ''})

// 根据售后状态，算进度条走到第几步（换货流程：申请→审核→买家退货→商家换货→完成）
const stepCurrent = computed(() => {
  const status = currentOrder.value?.status
  if (status === 'reviewing') return 1                                // 商家审核中 → 停在「商家审核」
  if (status === 'returning' || status === 'returning_exchange') return 2  // 买家退货中 → 走到「买家退货」
  if (status === 'exchanging') return 3                              // 商家换货中 → 走到「商家换货」
  if (status === 'exchange_shipping') return 4                       // 商家已发货 → 走到「换货完成」
  if (['refunded', 'exchanged', 'returned'].includes(status)) return 5    // 完成 → 全部走完
  return 1
})

// 进度条每一步的描述文字
const stepDescription = (index) => {
  const o = currentOrder.value
  const status = o?.status
  const done = ['refunded', 'exchanged', 'returned']
  if (index === 0) return o?.createdAt || ''
  if (index === 1) {           // 商家审核
    if (status === 'reviewing') return '审核中'
    if (status === 'rejected') return o?.rejectedAt || '不通过'
    return o?.reviewAt || '已完成'
  }
  if (index === 2) {           // 买家退货
    if (status === 'rejected') return '—'
    // 买家已提交退货方式（含换货仍停在 returning 的情况）→ 显示提交时间
    if (o?.returnAt) return o.returnAt
    if (status === 'returning' || status === 'returning_exchange') return '退货中'
    return '已完成'
  }
  if (index === 3) {           // 商家换货
    if (status === 'rejected') return '—'
    // 商家已确认收到退货，开始换货 → 显示确认时间
    if (o?.exchange_at) return o.exchange_at
    if (status === 'exchanging') return '处理中'
    if (status === 'exchange_shipping' || done.includes(status)) return '已发货'
    return '待处理'
  }
  if (index === 4) {           // 换货完成
    if (status === 'rejected') return '—'
    if (status === 'exchange_shipping') return '进行中'
    if (done.includes(status)) return o?.exchanged_at || '已完成'
    return '待处理'
  }
  return ''
}

// 下拉选项 → 后端 status（换货流程：审核通过 → 买家退货 → 商家换货 → 已完成）
const reviewResultMap = {
  approve: 'returning',      // 审核通过 → 等待买家退货（不是直接换货）
  exchanging: 'exchanging',  // 商家确认收到退货 → 开始换货
  exchanged: 'exchanged',    // 换货完成 → 已完成
  reject: 'rejected',        // 拒绝售后 → 售后拒绝
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
    merchantRemark: confirmForm.value.merchantRemark,
  })
      .then(() => {
        message.success('审核提交成功')
        confirmForm.value = []
        exchangeReviewVisible.value = false
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