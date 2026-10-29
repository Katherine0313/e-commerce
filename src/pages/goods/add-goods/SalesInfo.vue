<template>
  <a-form :model="salesInfoForm" :rules="salesInfoRules" ref="salesInfoFormRef"
          :label-col="{span:3,style:{paddingRight:'5px'}}">
    <a-form-item label="上架状态">
      <a-radio-group v-model:value="salesInfoForm.listingStatus">
        <a-radio :value="1">上架</a-radio>
        <a-radio :value="0">下架</a-radio>
      </a-radio-group>
    </a-form-item>
    <a-form-item label="规格明细">
      <a-table :data-source="specList" class="spec-list" :pagination="false" :scroll="{x:1000}">
        <a-table-column title="销售价">
          <template #default>
            <a-form-item name="salesPrice">
              <a-input-number v-model:value="salesInfoForm.salesPrice" addon-before="￥" :min="0" :precision="2" />
            </a-form-item>
          </template>
        </a-table-column>
        <a-table-column title="市场价">
          <template #default>
            <a-form-item name="marketPrice">
              <a-input-number v-model:value="salesInfoForm.marketPrice" addon-before="￥" :min="0" :precision="2" />
            </a-form-item>
          </template>
        </a-table-column>
        <a-table-column title="成本价">
          <template #default>
            <a-form-item name="costPrice">
              <a-input-number v-model:value="salesInfoForm.costPrice" addon-before="￥" :min="0" :precision="2" />
            </a-form-item>
          </template>
        </a-table-column>
        <a-table-column title="商品编码">
          <template #default>
            <a-form-item name="productCode">
              <a-input v-model:value="salesInfoForm.productCode" />
            </a-form-item>
          </template>
        </a-table-column>
        <a-table-column title="库存">
          <template #default>
            <a-form-item name="stock" >
              <a-input-number v-model:value="salesInfoForm.stock" :min="0" :precision="0" />
            </a-form-item>
          </template>
        </a-table-column>
        <a-table-column title="重量(kg)">
          <template #default>
            <a-form-item >
              <a-input-number v-model:value="salesInfoForm.weight" :min="0" :precision="1" />
            </a-form-item>
          </template>
        </a-table-column>
        <a-table-column title="体积(m³)">
          <template #default>
            <a-form-item >
              <a-input-number v-model:value="salesInfoForm.volume" :min="0" :precision="1" />
            </a-form-item>
          </template>
        </a-table-column>
      </a-table>
    </a-form-item>
  </a-form>
</template>
<script setup>
import {ref} from 'vue';
// 定义表格行，用于占位
const specList = ref([{}])
// 定义表单实例
const salesInfoFormRef = ref()
// 定义表单，用于存放每个表单项的数据
const salesInfoForm = ref({
  listingStatus: 1,
  salesPrice: null,
  marketPrice: null,
  costPrice:null,
  productCode:'',
  stock:null,
  weight:null,
  volume:null
})
// 定义校验规则
const salesInfoRules = {
  salesPrice:[{required:true,message:'请填写销售价',trigger:'blur'}],
  marketPrice:[{required:true,message:'请填写市场价',trigger:'blur'}],
  costPrice:[{required:true,message:'请填写成本价',trigger:'blur'}],
  productCode:[{required:true,message:'请填写商品编码',trigger:'blur'}],
  stock:[{required:true,message:'请填写库存',trigger:'blur'}],
}
// 暴露规则校验方法给父组件用
const validate = () => {
  return salesInfoFormRef.value?.validate()
}
// 清空销售信息（提交成功 / 取消时由父组件调用）
const resetForm = () => {
  salesInfoForm.value = {
    listingStatus: 1,
    salesPrice: null,
    marketPrice: null,
    costPrice: null,
    productCode: '',
    stock: null,
    weight: null,
    volume: null,
  }
  salesInfoFormRef.value?.clearValidate()
}
// 把表单暴露出去，给父组件引用
defineExpose({salesInfoForm, validate, resetForm})
</script>
<style scoped>
.spec-list :deep(.ant-table-tbody > tr > td){
  padding-bottom:0;
}
.spec-list {
  border: 1px solid rgb(230, 230, 230);
  border-radius: 5px;
}
</style>