<template>
  <div class="search">
    <a-input-search placeholder="请输入商品名称" enter-button="搜索"
                    v-model:value="searchProductName" @search="loadStockList" allow-clear>
    </a-input-search>
  </div>
  <a-table :dataSource="stockList" class="title" :row-selection="{}">
    <a-table-column title="编号" dataIndex="stock_id"></a-table-column>
    <a-table-column title="商品信息" dataIndex="name"></a-table-column>
    <a-table-column>
      <template #default="{record}">
        <img v-lazy="record.image" width="80" />
      </template>
    </a-table-column>
    <a-table-column title="产品描述" dataIndex="description"></a-table-column>
    <a-table-column title="库存" dataIndex="stock"></a-table-column>
    <a-table-column title="库存状态">
      <template #default="{record}">
        <a-tag v-if="record.statusKey" :color="statusColor(record.statusKey)">
          {{ statusText(record.statusKey) }}</a-tag>
        <span v-else style="color: #bfbfbf">未设置</span>
      </template>
    </a-table-column>
    <a-table-column title="预警状态">
      <template #default="{record}">
        <a-tag :color="isAlertOn(record.alert_enabled) ? 'green' : 'default'">
          {{ isAlertOn(record.alert_enabled) ? '已开' : '未开'}}</a-tag>
      </template>
    </a-table-column>
    <a-table-column title="操作">
      <template #default="{record}">
        <a-button type="primary" @click="handleStockVisible(record)">设置</a-button>
      </template>
    </a-table-column>
  </a-table>
  <a-modal v-model:visible="stockVisible" @ok="submitStockForm">
    <a-form :model="stockForm" ref="stockFormRef" :rules="stockRules">
      <a-form-item label="库存预警">
        <a-switch v-model:checked="stockForm.alert_enabled" />
      </a-form-item>
        <template v-if="stockForm.alert_enabled">
          <a-form-item label="库存下限" name="min_stock" required>
            <a-input-number v-model:value="stockForm.min_stock" />
          </a-form-item>
          <a-form-item label="库存上限" name="max_stock" required>
            <a-input-number v-model:value="stockForm.max_stock" />
          </a-form-item>
        </template>
    </a-form>
  </a-modal>
</template>

<script setup>
import {ref, onMounted, onActivated} from 'vue'
import {getStockList, createStock, getStockStatus} from '@/api/stock.js'
import {isAlertOn, stockStatusOf} from '@/utils/stock.js'
import {message} from 'ant-design-vue'
const stockList = ref([])
const searchProductName = ref('')
// 库存状态字典（high/normal/low 的中文与颜色），和订单/售后页拉字典的写法保持一致
const stockStatus = ref({map: {}, color: {}})
const loadStockStatus = () => {
  getStockStatus()
      .then(res => {
        stockStatus.value = res.data.data
      })
      .catch(err => console.log(err))
}
const statusText = (key) => stockStatus.value.map?.[key] || key
const statusColor = (key) => stockStatus.value.color?.[key] || 'default'
// 加载库存列表的方法（带搜索关键词）
const loadStockList = () => {
  getStockList({search: searchProductName.value})
      .then(res => {
        stockList.value = res.data.data.map(item => ({
          ...item,
          alert_enabled: item.alert_enabled === 1,
          // 状态是算出来的，不是接口字段，见 utils/stock.js
          statusKey: stockStatusOf(item),
        }))
      })
      .catch(err => console.log(err))
}
onMounted(() => {
  loadStockStatus()
})
onActivated(() => {
  loadStockList()
})
// =================== 设置按钮 ================
// 弹窗
const stockVisible = ref(false)
const stockForm = ref()
const handleStockVisible = (record) => {
  stockVisible.value = true
  stockForm.value = {
    product_id: record.product_id,
    alert_enabled: record.alert_enabled,
    min_stock: record.min_stock,
    max_stock: record.max_stock,
  }
}
// ================== 校验规则 ==================
const stockFormRef = ref(null)
// min/max 校验交给 v-if 控制：alert_enabled=false 时表单项不渲染，规则不参与校验
const stockRules = {
  min_stock: [{ required: true, message: '请填写库存下限', trigger: 'blur' }],
  // max_stock 加一条跨字段校验：必须大于 min_stock，否则报错
  max_stock: [
    { required: true, message: '请填写库存上限', trigger: 'blur' },
    {
      validator: (rule, value) => {
        if (stockForm.value.min_stock != null && value != null && stockForm.value.min_stock >= value) {
          return Promise.reject('库存下限必须小于上限')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
}
// ================== 提交库存预警表单 ============
const submitStockForm = () => {
  stockFormRef.value.validate()
      .then(()=>{
        createStock({
          product_id: stockForm.value.product_id,
          alert_enabled: stockForm.value.alert_enabled ? 1 : 0,
          min_stock: stockForm.value.min_stock,
          max_stock: stockForm.value.max_stock,
        })
      })
      .then(() => {
        stockVisible.value = false
        message.success('库存预警创建成功！')
        loadStockList()
      })
      .catch(err => {
        console.log(err)
        message.error('库存预警创建失败！')
      })
}

</script>

<style scoped>
/*表头*/

/*行元素*/
.title :deep(.ant-table-tbody >tr > td) {
  font-size: 14px;
  text-align: center;
}
.search{
  max-width: 300px;
  margin:20px 0;
}
</style>