<template>
  <div class="shipment-container">
    <a-table :dataSource="list"  :row-selection="{selectedRowKeys,onChange:onOrderSelectChange}" row-key="id">
      <a-table-column title="编号" dataIndex="id"></a-table-column>
      <a-table-column title="订单编号" dataIndex="order_no"></a-table-column>
      <a-table-column title="订单确认时间" dataIndex="confirm_at"></a-table-column>
      <a-table-column title="实收金额" dataIndex="pay_amount"></a-table-column>
      <a-table-column title="支付方式" dataIndex="pay_type"></a-table-column>
      <a-table-column title="客户" dataIndex="consignee"></a-table-column>
      <a-table-column title="配送方式" dataIndex="shipping_type"></a-table-column>
      <a-table-column title="配送信息及备注" dataIndex="remark"></a-table-column>
      <a-table-column title="订单状态" dataIndex="order_status">
        <template #default="{record}">
          <a-tag :color="orderStatus.color[record.order_status] || 'default'">
            {{ orderStatus.map[record.order_status] || record.order_status }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column title="操作">
        <template #default="{record}">
          <div class="ops">
            <a-button type="primary" @click="emit('view', record.id)" size="small">查看订单</a-button>
            <a-button v-if="isAdminUser" type="primary" @click="handlePendingShip(record)" size="small" >去发货</a-button>
            <a-button type="dashed" @click="handleCancelOrder(record)" size="small">取消订单</a-button>
            <a-button type="link" :disabled="!isAdminUser" @click="handleDeleteOrder(record)" size="small">删除</a-button>
          </div>
        </template>
      </a-table-column>
    </a-table>
    <a-modal v-model:visible="pendingShipVisible" title="发货" @ok="submitPendingShipForm">
      <a-form :model="pendingShipForm" style="margin-top: 10px">
        <a-form-item label="快递公司" name="courier">
          <a-select v-model:value="pendingShipForm.courier" placeholder="请选择快递公司" style="width:160px">
            <a-select-option v-for="item in courierList" :key="item.value" :value="item.value">{{
                item.label
              }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="快递单号" name="tracking_no">
          <a-input v-model:value="pendingShipForm.tracking_number" placeholder="请填写快递单号"></a-input>
        </a-form-item>
      </a-form>
    </a-modal>
    <a-button class="bat-delete-btn" :disabled="!isAdminUser" @click="handleBatchDeleteOrders(selectedRowKeys)">批量删除</a-button>
  </div>
</template>
<script setup>
import {ref, onMounted, createVNode} from 'vue'
import {getCouriers, shipOrder, deleteOrder, deleteOrders, cancelOrder} from '@/api/orders.js'
import {message, Modal} from 'ant-design-vue'
import {ExclamationCircleOutlined} from '@ant-design/icons-vue'
import {isAdmin} from '@/utils/auth.js'
defineProps({
  list: {type: Array, default: () => []},
  orderStatus: {type: Object, default: () => ({ map: {}, color: {} })}
})

// 是否为管理员（商家）：删除仅管理员可用
const isAdminUser = isAdmin()

//================= 去发货 按钮 ================
const currentOrderId = ref(null)
const pendingShipVisible = ref(false)
const handlePendingShip = (record) => {
  // 存下订单id
  currentOrderId.value = record.id
  pendingShipVisible.value = true
}
//================= 去发货 表单 ================
const pendingShipForm = ref({courier: undefined, tracking_number: ''})
//================= 快递公司列表 ================
const courierList = ref([])
onMounted(() => {
  getCouriers()
      .then(res => {
        courierList.value = res.data.data
      })
      .catch(err => console.log(err))
})
// ================= 提交发货 =================
const emit = defineEmits(['refresh', 'view'])
const submitPendingShipForm = () => {
  shipOrder(currentOrderId.value, pendingShipForm.value)
      .then(() => {
        message.success('发货成功')
        pendingShipVisible.value = false
        emit('refresh')
      })
      .catch(err => {
        console.log(err)
        message.error('发货失败')
      })
}
// ================== 取消订单 ==================
const handleCancelOrder = (record) => {
  Modal.confirm({
    title: '取消订单',
    icon: createVNode(ExclamationCircleOutlined),
    content: `确认取消订单 ${record.order_no} 吗？`,
    onOk() {
      cancelOrder(record.id)
          .then(() => {
            message.success('订单已取消')
            emit('refresh')
          })
          .catch(err => {
            console.log(err)
            message.error('取消失败')
          })
    }
  })
}
// ================== 删除订单 ==================
const handleDeleteOrder = (record) => {
  Modal.confirm({
    title: '删除订单',
    icon: createVNode(ExclamationCircleOutlined),
    content: `请问确认删除订单 ${record.order_no} 吗?`,
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
//====================== 复选框 ====================
const selectedRowKeys = ref([])
const onOrderSelectChange = (key) => {
  selectedRowKeys.value = key
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
  grid-template-columns: repeat(2, max-content);
  gap: 8px;
}
</style>
