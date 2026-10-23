<template>
  <div class="order-container">
    <a-table class="title" :data-source="list" :pagination="pagination" @change="onPageChange"
             :row-selection="{selectedRowKeys,onChange:onOrderSelectChange}" row-key="id">
      <a-table-column title="编号" dataIndex="id"></a-table-column>
      <a-table-column title="订单编号" dataIndex="orderNo"></a-table-column>
      <a-table-column title="支付时间" dataIndex="payAt"></a-table-column>
      <a-table-column title="用户账号" dataIndex="userId"></a-table-column>
      <a-table-column title="订单总金额" dataIndex="payAmount"></a-table-column>
      <a-table-column title="支付方式" dataIndex="payTypeDesc"></a-table-column>
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
            <a-button v-if="isAdminUser" type="primary" style="margin-right:10px;"
                      @click="handleConfirmOrders(record)" >订单确认
            </a-button>
            <a-button :disabled="!isAdminUser" @click="$emit('delete',record.id)" size="small" type="link">删除
            </a-button>
          </div>
        </template>
      </a-table-column>
    </a-table>
    <a-button class="bat-delete-btn" :disabled="!isAdminUser" @click="batchDelete">批量删除</a-button>

    <!--订单确认审核弹窗-->
    <a-modal v-model:visible="confirmVisible" title="订单确认审核" width="900px" @ok="submitConfirm"
             @cancel="confirmVisible = false">
      <a-descriptions :column="2" bordered size="small" style="margin-bottom: 16px;">
        <a-descriptions-item label="订单编号">{{ currentOrder?.orderNo }}</a-descriptions-item>
        <a-descriptions-item label="客户名称">{{ currentOrder?.consignee }}</a-descriptions-item>
        <a-descriptions-item label="收货地址">{{ currentOrder?.region }} {{
            currentOrder?.detailAddress
          }}
        </a-descriptions-item>
        <a-descriptions-item label="实付金额">¥{{ currentOrder?.payAmount }}</a-descriptions-item>
      </a-descriptions>
      <a-table :dataSource="currentOrder?.items" row-key="productId" :pagination="false" size="small"
               style="margin-bottom: 16px;" class="title">
        <a-table-column title="商品名称" dataIndex="productName"></a-table-column>
        <a-table-column title="商品图片">
          <template #default="{record}">
            <img v-lazy="record.image" width="80"/>
          </template>
        </a-table-column>
        <a-table-column title="购买数量" dataIndex="quantity" width="100"></a-table-column>
        <a-table-column title="当前库存" dataIndex="stock" width="100">
          <template #default="{text}">
            <span :style="{color: text < 10 ? 'red' : 'inherit'}">{{ text }}</span>
          </template>
        </a-table-column>
        <a-table-column title="发货状态">
          <template #default="{record}">
            <a-tag :color="record.stock >= record.quantity ? 'cyan' : 'red'">
              {{ record.stock >= record.quantity ? '库存充足' : '库存不足' }}
            </a-tag>
          </template>
        </a-table-column>
      </a-table>
      <a-form :model="confirmForm" layout="vertical">
        <a-form-item label="审核结果" name="result">
          <a-select v-model:value="confirmForm.result" placeholder="请选择审核结果" style="width:200px">
            <a-select-option value="approve">确认通过</a-select-option>
            <a-select-option value="reject">驳回订单</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="商家内部备注" name="remark">
          <a-textarea v-model:value="confirmForm.remark" placeholder="请输入内部备注" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
<script setup>
import {ref} from 'vue'
import {getDetailOrders, confirmOrder, cancelOrder, updateOrder} from '@/api/orders.js'
import {message} from 'ant-design-vue'
import {isAdmin} from '@/utils/auth.js'

defineProps({
  list: {type: Array, default: () => []},
  orderStatus: {type: Object, default: () => ({ map: {}, color: {} })},
  pagination: {type: Object, default: () => ({})},
})

const emit = defineEmits(['view', 'delete', 'batchDelete', 'refresh', 'pageChange'])

// 分页变化时通知父组件加载对应页
const onPageChange = (pag) => {
  emit('pageChange', pag.current)
}

// 是否为管理员（商家）：审批类操作仅商家可见
const isAdminUser = isAdmin()

//====================== 复选框 ====================
const selectedRowKeys = ref([])
const onOrderSelectChange = (key) => {
  selectedRowKeys.value = key
}
const batchDelete = () => {
  emit('batchDelete', selectedRowKeys.value)
}

// ================== 订单确认审核弹窗 ==================
const confirmVisible = ref(false)
const currentOrder = ref(null)
const confirmForm = ref({result: undefined, remark: ''})
const handleConfirmOrders = (record) => {
  getDetailOrders(record.id)
      .then(res => {
        currentOrder.value = res.data?.data
        confirmForm.value = {result: undefined, remark: ''}
        confirmVisible.value = true
      })
      .catch(err => {
        console.log(err)
        message.error('获取订单详情失败')
      })
}
const submitConfirm = () => {
  if (!confirmForm.value.result) {
    message.warning('请选择审核结果')
    return
  }
  const orderId = currentOrder.value.id
  const action = confirmForm.value.result === 'approve'
      ? confirmOrder(orderId)
      : cancelOrder(orderId)

  action
      .then(() => {
        if (confirmForm.value.remark) {
          updateOrder(orderId, {remark: confirmForm.value.remark})
        }
        const label = confirmForm.value.result === 'approve' ? '已确认通过' : '已驳回'
        message.success(label)
        confirmVisible.value = false
        emit('refresh')
      })
      .catch(err => {
        console.log(err)
        message.error('操作失败')
      })
}
</script>


<style scoped>

.title {
  margin-top: 20px;
}

/*表头*/

/*行元素*/
.title :deep(.ant-table-tbody >tr > td) {
  font-size: 14px;
  text-align: center;
}

/* 操作列 - 防止按钮换行叠加 */
.title :deep(.ant-table-thead >tr >th:last-child) {
  padding-left: 80px;
  text-align: left;
}


.order-container {
  position: relative;
}

.bat-delete-btn {
  position: absolute;
  bottom: 15px;
}

/* 操作列按钮：每行最多两个，自动换行 */
.ops {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  gap: 8px;
}
</style>
