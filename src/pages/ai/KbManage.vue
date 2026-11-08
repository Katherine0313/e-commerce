<template>
  <div>
    <!-- 工具栏：scope 切换 + 分类 / 状态筛选 + 关键词 + 新建 -->
    <div class="head">
      <a-form layout="inline">
        <a-form-item>
          <a-radio-group v-model:value="query.scope" button-style="solid" @change="handleScopeChange">
            <a-radio-button value="">全部</a-radio-button>
            <a-radio-button value="客服">客服</a-radio-button>
            <a-radio-button value="运营">运营</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="query.category" style="width: 160px" placeholder="分类" allow-clear
                    :options="categoryOptions" />
        </a-form-item>
        <a-form-item>
          <a-select v-model:value="query.status" style="width: 120px" placeholder="状态" allow-clear
                    :options="statusOptions" />
        </a-form-item>
        <a-form-item>
          <a-input v-model:value="query.keyword" placeholder="问题 / 关键词" allow-clear
                   style="width: 200px" @pressEnter="handleSearch" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="handleSearch">
            <SearchOutlined />
            搜索
          </a-button>
        </a-form-item>
      </a-form>
      <a-button v-permission="'ai:chat:use'" type="primary" @click="openCreate">
        <PlusOutlined />
        新建条目
      </a-button>
    </div>

    <a-table :dataSource="list" :columns="columns" :pagination="pagination" row-key="id"
             :loading="loading" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'question'">
          <a-tooltip :title="record.question">
            <span class="cell-question">{{ record.question }}</span>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'answer'">
          <a-tooltip :title="record.answer">
            <span class="cell-answer">{{ record.answer }}</span>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'scope'">
          <a-tag :color="record.scope === '运营' ? 'blue' : 'green'">{{ record.scope }}</a-tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 1 ? 'green' : 'default'">
            {{ record.status === 1 ? '启用' : '停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'hitCount'">
          {{ record.hitCount || 0 }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button size="small" style="margin-right: 6px" @click="openEdit(record)">编辑</a-button>
          <a-popconfirm title="确定删除该条目？" @confirm="handleDelete(record)">
            <a-button size="small" danger>删除</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <!-- 新建 / 编辑弹窗 -->
    <a-modal v-model:visible="formVisible" :title="editingId ? '编辑知识条目' : '新建知识条目'"
             :width="720" :confirm-loading="saving" @ok="handleSubmit">
      <a-form :model="form" :label-col="{ span: 4 }">
        <a-form-item label="适用范围" required>
          <a-radio-group v-model:value="form.scope">
            <a-radio value="客服">客服</a-radio>
            <a-radio value="运营">运营</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="分类">
          <a-select v-model:value="form.category" style="width: 100%" placeholder="选择或输入分类"
                    allow-clear :options="categoryOptions" />
        </a-form-item>
        <a-form-item label="问题" required>
          <a-input v-model:value="form.question" :maxlength="255" placeholder="标准问法，如「多久能收到货？」" />
        </a-form-item>
        <a-form-item label="答案" required>
          <a-textarea v-model:value="form.answer" :rows="4" :maxlength="1000"
                      placeholder="答案原文，直接返回给用户" />
        </a-form-item>
        <a-form-item label="关键词">
          <a-input v-model:value="form.keywords" :maxlength="255"
                   placeholder="逗号分隔，如「发货,物流,多久」" />
        </a-form-item>
        <a-form-item label="优先级">
          <a-input-number v-model:value="form.priority" :min="0" :max="999" style="width: 120px" />
          <span class="unit">（同分时越大越优先）</span>
        </a-form-item>
        <a-form-item label="状态">
          <a-switch v-model:checked="form.status" :checked-value="1" :un-checked-value="0"
                    checked-children="启用" un-checked-children="停用" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { listKb, listKbCategories, createKb, updateKb, deleteKb } from '@/api/ai'

const loading = ref(false)
const list = ref([])
const categories = ref([])

const query = reactive({
  scope: '',
  category: undefined,
  status: undefined,
  keyword: '',
  page: 1,
  pageSize: 20,
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
})

const statusOptions = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
]

const categoryOptions = ref([])

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
  { title: '问题', dataIndex: 'question', key: 'question', width: 220, ellipsis: true },
  { title: '答案', dataIndex: 'answer', key: 'answer', ellipsis: true },
  { title: '分类', dataIndex: 'category', key: 'category', width: 110 },
  { title: '范围', dataIndex: 'scope', key: 'scope', width: 80 },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: '命中', dataIndex: 'hitCount', key: 'hitCount', width: 70 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 160 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
]

async function loadCategories() {
  const { data } = await listKbCategories(query.scope || undefined)
  categoryOptions.value = (data || []).map((c) => ({ value: c, label: c }))
}

async function loadList() {
  loading.value = true
  try {
    const params = { ...query }
    if (!params.scope) delete params.scope
    if (!params.category) delete params.category
    if (params.status === undefined || params.status === null) delete params.status
    if (!params.keyword) delete params.keyword
    const { data } = await listKb(params)
    list.value = data.list || []
    pagination.total = data.total || 0
    pagination.current = data.page || 1
    pagination.pageSize = data.pageSize || 20
  } finally {
    loading.value = false
  }
}

function handleScopeChange() {
  query.category = undefined
  query.page = 1
  loadCategories()
  loadList()
}

function handleSearch() {
  query.page = 1
  loadList()
}

function handleTableChange(pag) {
  query.page = pag.current
  query.pageSize = pag.pageSize
  loadList()
}

// ---- 新建 / 编辑 ----
const formVisible = ref(false)
const saving = ref(false)
const editingId = ref(null)
const form = reactive({
  scope: '客服',
  category: '',
  question: '',
  answer: '',
  keywords: '',
  priority: 0,
  status: 1,
})

function resetForm() {
  editingId.value = null
  form.scope = '客服'
  form.category = ''
  form.question = ''
  form.answer = ''
  form.keywords = ''
  form.priority = 0
  form.status = 1
}

function openCreate() {
  resetForm()
  formVisible.value = true
}

function openEdit(record) {
  editingId.value = record.id
  form.scope = record.scope
  form.category = record.category || ''
  form.question = record.question
  form.answer = record.answer
  form.keywords = record.keywords || ''
  form.priority = record.priority || 0
  form.status = record.status
  formVisible.value = true
}

async function handleSubmit() {
  if (!form.question.trim() || !form.answer.trim()) {
    message.warning('问题和答案不能为空')
    return
  }
  saving.value = true
  try {
    const payload = {
      scope: form.scope,
      category: form.category || '',
      question: form.question.trim(),
      answer: form.answer.trim(),
      keywords: form.keywords || '',
      priority: form.priority || 0,
      status: form.status,
    }
    if (editingId.value) {
      await updateKb(editingId.value, payload)
      message.success('已更新')
    } else {
      await createKb(payload)
      message.success('已创建')
    }
    formVisible.value = false
    loadList()
  } finally {
    saving.value = false
  }
}

async function handleDelete(record) {
  await deleteKb(record.id)
  message.success('已删除')
  loadList()
}

onMounted(() => {
  loadCategories()
  loadList()
})
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.cell-question {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.cell-answer {
  display: inline-block;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.unit {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}
</style>
