<template>
  <a-table :data-source="categoryData" row-key="id" class="category-table">
    <a-table-column title="商品分类" dataIndex="label"></a-table-column>
    <a-table-column title="排序">
      <template #default="{ record }">
        <span class="sort-order">{{ isParentCategory(record) ? record.sort_index : '' }}</span>
        <a-button type="text"
                  title="上移"
                  aria-label="上移"
                  :loading="isMoving(record, 'up')"
                  :disabled="movingKey !== null || !canMove(record, 'up')"
                  @click="handleMoveCategory(record, 'up')"
                  class="arrow-btn">
          <ArrowUpOutlined class="arrow"
                           :class="isParentCategory(record) ? 'arrow-parent' : 'arrow-child'" />
        </a-button>
      </template>
    </a-table-column>
    <a-table-column title="关联产品数">
      <template #default="{ record }">
        <span v-if="!record.children || !record.children.length">{{ record.product_count ?? 0 }}</span>
      </template>
    </a-table-column>
    <a-table-column title="是否在网店显示">
      <template #default="{ record }">
        <a-switch :checked="record.status === 1"
                  @change="(checked) => categoryStatusChange(record,checked)" />
      </template>
    </a-table-column>
    <a-table-column title="操作">
      <template #default="{record}">
        <a-button type="primary"
                  v-if="isParentCategory(record)" style="margin-right: 10px;"
                  @click="addCategoryRef.addCategoryModal()"
        >新增分类
        </a-button>
        <a-button v-else type="link" @click="relateGoodsRef.relateGoodsModal(record)">关联产品</a-button>
        <a-button type="link" @click="handleDeleteCategory(record)">删除</a-button>
      </template>
    </a-table-column>
  </a-table>
  <AddCategory ref="addCategoryRef" @refresh="loadCategoryTree" />
  <RelateGoods ref="relateGoodsRef" @refresh="loadCategoryTree" />
</template>

<script setup>
import {getCategoryTree, updateCategoryTree, deleteCategory, moveCategory} from '@/api/products.js'
import {onActivated, ref} from 'vue'
import {ArrowUpOutlined} from '@ant-design/icons-vue'
import AddCategory from '@/pages/goods/category/AddCategory.vue'
import RelateGoods from '@/pages/goods/category/RelateGoods.vue'
import {message, Modal} from 'ant-design-vue'
// 定义商品分类的响应式变量
const categoryData = ref([])
// 定义新增下级的实例
const addCategoryRef = ref(null)
// 定义关联产品的实例
const relateGoodsRef = ref(null)
// 当前正在移动的分类
const movingKey = ref(null)
// 开关状态的回调
const categoryStatusChange = (record, checked) => {
  record.status = checked ? 1 : 0
  updateCategoryTree(record.id, {status: checked ? 1 : 0})
}
// ===========刷新商品列表===========
// 定义加载商品分类列表的方法
const loadCategoryTree = () => {
  return getCategoryTree()
      .then(res => {
        if (res.data.success) {
          categoryData.value = res.data.data
        }
      })
      .catch(err => {
        message.error('商品分类列表加载失败')
        console.log(err)
      })
}
// 一级分类蓝色箭头，二级分类绿色箭头
// 判断是否是一级分类（后端只在根节点挂 children）
const isParentCategory = (record) => Array.isArray(record.children)
// 查找分类所属的同级数组
const findSiblings = (nodes, id) => {
  if (nodes.some(node => Number(node.id) === Number(id))) {
    return nodes
  }
  for (const node of nodes) {
    if (Array.isArray(node.children)) {
      const siblings = findSiblings(node.children, id)
      if (siblings) return siblings
    }
  }
  return null
}
// 判断分类是否可以向指定方向移动
const canMove = (record, direction) => {
  const siblings = findSiblings(categoryData.value, record.id)
  if (!siblings) return false
  const index = siblings.findIndex(item => Number(item.id) === Number(record.id))
  return direction === 'up' ? index > 0 : index >= 0 && index < siblings.length - 1
}
// 判断当前按钮是否正在加载
const isMoving = (record, direction) => {
  return movingKey.value === `${record.id}:${direction}`
}
// 调整商品分类顺序
const handleMoveCategory = (record, direction) => {
  movingKey.value = `${record.id}:${direction}`
  moveCategory(record.id, direction)
      .then(() => {
        message.success('分类顺序调整成功')
        return loadCategoryTree()
      })
      .catch(err => {
        message.error(err.response?.data?.message || '调整分类顺序失败')
        console.log(err)
      })
      .finally(() => {
        movingKey.value = null
      })
}
// 首次进入或切回页面时刷新分类列表
onActivated(() => {
  loadCategoryTree()
})

// ===========删除商品分类===========

const handleDeleteCategory = (record) => {
  Modal.confirm({
    title: '确认删除',
    content: `确认删除商品分类「 ${record.label} 」吗？`,
    onOk: () => {
      deleteCategory(record.id)
          .then(() => {
            message.success('删除成功')
            loadCategoryTree()
          })
          .catch((err) => {
            message.error('分类不存在')
            console.log(err)
          })
    }
  })
}
</script>

<style scoped>
.sort-order {
  display: inline-block;
  min-width: 24px;
  text-align: center;
}

.category-table{
  max-width: 90%;
}
/*行元素*/
.category-table :deep(.ant-table-tbody > tr > td) {
  font-size: 14px;
}
.category-table :deep(.ant-table-thead > tr > th:first-child) {
  text-align: left;
}
.category-table :deep(.ant-table-tbody > tr > td:first-child) {
  text-align: left;
}
.category-table :deep(.ant-table-thead > tr > th:last-child) {
  padding-left: 50px;
}
.arrow{
  font-size: 23px;
  font-weight:600;
}
/* 一级分类箭头蓝色 */
.arrow-parent{
  color:#1890ff;
}
/* 二级分类箭头绿色 */
.arrow-child{
  color:#52c41a;
  font-size:15px;
}
/* 已在同级首项、箭头置灰时不要再显示成可用色 */
.arrow-btn[disabled] .arrow{
  color:rgba(0, 0, 0, 0.25);
}
.arrow-btn:hover{
  background:rgba(22, 119, 255, 0.1);
}
</style>