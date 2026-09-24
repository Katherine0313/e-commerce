<template>
  <a-modal v-model:visible="returnRefundDetailVisible" title="售后详情"
           width="min(900px, 92vw)" class="detail">
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
          <a-step title="申请售后" :description="currentOrder?.created_at" />
          <a-step title="商家审核"
                  :status="currentOrder?.status === 'rejected' ? 'error' : undefined"
                  :description="stepDescription(1)"></a-step>
          <a-step title="买家退货" :description="stepDescription(2)"></a-step>
          <a-step title="商家确认退款" :description="stepDescription(3)"></a-step>
          <a-step title="退款成功" :description="stepDescription(4)"></a-step>
        </a-steps>
      </div>
    </div>
    <div class="item" v-if="!currentOrder?.return_at && currentOrder?.status === 'returning'">
      <div class="item-title">选择退货方式</div>
      <div class="return">
        <div class="head"><span>官方退货</span><span>|</span><span>丢损必赔</span><span>|</span><span>免填地址</span>
        </div>
        <div class="content">
          <div class="l">
            <div class="list top" id="l-top" @click="chooseReturnWay('pickup')" style="cursor: pointer;">
              <div style="display:flex;"> <div>上门取件</div>
                <div style="flex:1;margin-left:10px;"><span style="padding:5px 10px;border:1px solid #FF6700;color:#FF6700">
                  商家指定服务</span><span style="padding:5px 10px;border:1px solid #FF6700;background: #FF6700;color:#fff;">官方保障</span></div>
              </div>
              <div class="list-r">
                <span class="dot" :class="{ active: returnWay === 'pickup' }"></span>
              </div>
            </div>
            <div class="list">商家同意退货后，将为您上门取件，具体日期将以短信形式通知，您可随时修改或取消</div>
            <div class="list time " :style="{ pointerEvents: returnWay === 'self' ? 'none' : 'auto', opacity: returnWay === 'self' ? 0.5 : 1 }">
              <div class="list-l" :class="{ active: selectedTime === 'morning' }"
                   @click="selectedTime = selectedTime === 'morning' ? '' : 'morning'">
                <span>商家同意退货后</span><span>09:00‑13:00</span>
              </div>
              <div class="list-r" :class="{ active: selectedTime === 'afternoon' }"
                   @click="selectedTime = selectedTime === 'afternoon' ? '' : 'afternoon'">
                <span>商家同意退货后</span><span>13:00‑19:00</span>
              </div>
            </div>
          </div>
          <div class="r " @click="chooseReturnWay('self')" style="cursor: pointer;">
            <div>
              <div style="margin-bottom:5px;">自行寄回</div>
              <div>
                <div class="item-l">放弃丢损必赔保障服务，运费自行支付 / 垫付</div>
              </div>
            </div>
            <div class="item-r"><span class="dot" :class="{ active: returnWay === 'self' }"></span></div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <a-button v-if="currentOrder?.status === 'returning' && !currentOrder?.return_at"
                :disabled="returnWay === 'pickup' && !selectedTime"
                type="primary" @click="handleAfterSaleReturn"
                >
        提交退货
      </a-button>
    </template>
  </a-modal>

</template>
<script setup>
import {ref, computed} from "vue";
import {message} from 'ant-design-vue'
import {getAfterSale,submitAfterSaleReturn} from '@/api/afterSale.js'
const returnRefundDetailVisible = ref(false)
const currentOrder = ref()
// 选中的取件时间段：'' / 'morning' / 'afternoon'
const selectedTime = ref('')
// 退货方式：'pickup' 上门取件 / 'self' 自行寄回
const returnWay = ref('pickup')
const chooseReturnWay = (way) => {
  returnWay.value = way
  if (way === 'self') selectedTime.value = ''   // 切到自行寄回时清掉时间段
}
// 根据售后状态，算进度条走到第几步
const stepCurrent = computed(() => {
  const status = currentOrder.value?.status
  if (status === 'reviewing') return 1                // 商家审核中 → 停在「商家审核」
  if (status === 'returning') return 2                // 买家退货中 → 走到「买家退货」
  if (['refunding', 'exchanging'].includes(status)) return 3  // 商家确认退款 → 走到「商家确认退款」
  if (status === 'refund_confirming') return 4        // 确认退款 → 走到「退款成功」
  if (['refunded', 'exchanged', 'returned'].includes(status)) return 5  // 完成 → 全部走完
  return 1                                            // 其它（含拒绝）默认停「商家审核」
})

// 进度条每一步的描述文字
const stepDescription = (index) => {
  const o = currentOrder.value
  const status = o?.status
  const done = ['refunded', 'exchanged', 'returned']
  const processing = ['refunding', 'exchanging']
  const isReturning = status === 'returning'
  if (index === 0) return o?.created_at || ''
  if (index === 1) {           // 商家审核
    if (status === 'reviewing') return '审核中'
    if (status === 'rejected') return o?.rejected_at || '不通过'
    if (isReturning || processing.includes(status) || status === 'refund_confirming' || done.includes(status)) return o?.review_at || '已完成'
    return '待处理'
  }
  if (index === 2) {           // 买家退货
    if (status === 'rejected') return '—'
    if (isReturning) return '退货中'
    if (processing.includes(status) || status === 'refund_confirming' || done.includes(status)) return o?.return_at || '已完成'
    return '待处理'
  }
  if (index === 3) {           // 商家确认退款
    if (status === 'rejected') return '—'
    if (processing.includes(status)) return '退款中'
    if (status === 'refund_confirming') return o?.refund_at || '已确认退款'
    if (done.includes(status)) return o?.refund_at || '已完成'
    return '待处理'
  }
  if (index === 4) {           // 退款成功
    if (status === 'rejected') return '—'
    if (status === 'refund_confirming') return '退款中'
    if (done.includes(status)) return o?.refunded_at || '已完成'
    return '待处理'
  }
  return ''
}
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

// 定义打开弹窗的方法，并暴露给父组件ReturnRefund.vue
const returnRefundDetailOpen = (record) => {
  returnRefundDetailVisible.value = true
  currentOrder.value = record
  loadDetailOrders(record.id)
}
defineExpose({returnRefundDetailOpen})
// =================== 提交退货方式 ===============
const handleAfterSaleReturn = () => {
  if (!currentOrder.value?.id) return
  submitAfterSaleReturn(currentOrder.value.id, {
    return_way: returnWay.value,
    return_time_slot: returnWay.value === 'pickup' ? selectedTime.value : null,
  })
      .then(res => {
        if (res.data?.success) {
          message.success('退货方式提交成功')
          loadDetailOrders(currentOrder.value.id)   // 重新拉详情，return_at 有值，整块自动隐藏
        } else {
          message.error(res.data?.message || '提交失败')
        }
      })
      .catch(err => {
        message.error('提交失败：' + (err.response?.data?.message || err.message))
      })
}

</script>

<style scoped>
.detail .item {
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

/*底部*/
.return {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  border: 1px solid #ccc;
}

.return .head {
  height: 40px;
  border-bottom: 1px solid #ccc;
  background: #FF6700;
  border-radius: 8px;
  font-size: 20px;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;

}

.return .content {
  display: flex;
  padding: 10px 0;
}

.return .content .l {
  width: 50%;
  border-right: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  padding: 0 10px;
}

.return .content .r {
  flex: 1;
  display: flex;
  padding: 0 10px;
  justify-content: space-between;
}
/*退货时间*/
.return .content .time .list-l,
.return .content .time .list-r {
  width: 120px;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  border: 1px solid #ccc;
  cursor: pointer;
  text-align: center;
  line-height: 24px;
  padding: 5px 0;
  transition: border-color .2s, background-color .2s, color .2s;
}

.return .content .time .list-l.active,
.return .content .time .list-r.active {
  border-color: #FF6700;
  background: #fff7f0;
  color: #FF6700;
}

.return .content .time {
  display: flex;
  justify-content: space-around;
}

/*圆圈*/
.content .dot {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: background-color .2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content .dot.active {
  background-color: #1890ff;
  border-color: #1890ff;
}

.content .dot.active::after {
  content: '';
  display: block;
  width: 7px;
  height: 12px;
  border: 2px solid #fff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
  margin-top: -2px;
}

#l-top {
  display: flex;
  justify-content: space-between;
}
.list{
  margin:10px 0;
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