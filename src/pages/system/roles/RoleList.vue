<template>
  <div>
    <div class="head">
      <span class="tip">角色决定后台菜单和按钮权限，账号通过分配角色获得权限。</span>
      <a-button v-permission="'system:role:add'" type="primary" @click="openCreate">新增角色</a-button>
    </div>

    <a-table :dataSource="list" :columns="columns" row-key="id" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'userCount'">
          <!-- 启用中的账号数 / 总账号数：禁用账号不阻止角色删除 -->
          <a-tooltip v-if="record.enabledUserCount > 0" :title="`有 ${record.enabledUserCount} 个启用中的账号，暂不能删除`">
            <span>{{ record.enabledUserCount }} / {{ record.userCount }}</span>
          </a-tooltip>
          <span v-else>{{ record.userCount }} / {{ record.userCount }}</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 1 ? 'green' : 'default'">
            {{ record.status === 1 ? '正常' : '停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <!-- 固定三列，缺失的按钮用空占位补齐，保证每行按钮上下对齐 -->
          <div class="row-actions">
            <a-button v-permission="'system:role:edit'" type="link" size="small"
                      @click="openEdit(record)">编辑</a-button>
            <a-button v-permission="'system:role:assign'" type="link" size="small"
                      @click="openAssign(record)">分配菜单</a-button>
            <a-popconfirm v-if="record.roleKey !== 'admin'" title="确定删除该角色？" @confirm="handleDelete(record)">
              <a-button v-permission="'system:role:remove'" type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
            <span v-else></span>
          </div>
        </template>
      </template>
    </a-table>

    <!-- 新增 / 编辑角色 -->
    <a-modal v-model:visible="formVisible" :title="editingId ? '编辑角色' : '新增角色'" :width="560"
             :confirm-loading="saving" @ok="handleSubmit">
      <a-form :model="form" :label-col="{ span: 5 }">
        <a-form-item label="角色标识" required>
          <a-input v-model:value="form.roleKey" :disabled="!!editingId" :maxlength="32"
                   placeholder="小写字母开头，如 operator" />
        </a-form-item>
        <a-form-item label="角色名称" required>
          <a-input v-model:value="form.roleName" :maxlength="64" />
        </a-form-item>
        <a-form-item label="状态">
          <a-switch v-model:checked="form.statusBool" checked-children="正常" un-checked-children="停用" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.remark" :maxlength="120" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 分配菜单 -->
    <a-modal v-model:visible="assignVisible" :title="`分配菜单 - ${assignTarget?.roleName || ''}`"
             :width="620" :confirm-loading="assigning" @ok="handleAssign">
      <div class="tree-wrap">
        <a-tree v-model:checkedKeys="checkedKeys" :tree-data="treeData" checkable
                default-expand-all :selectable="false" />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  addRole,
  assignRoleMenus,
  deleteRole,
  getMenuTree,
  getRole,
  getRoles,
  updateRole,
} from '@/api/system.js'

const list = ref([])
const menuTree = ref([])
const saving = ref(false)
const formVisible = ref(false)
const editingId = ref(null)
const assignVisible = ref(false)
const assigning = ref(false)
const assignTarget = ref(null)
const checkedKeys = ref([])
const form = ref(emptyForm())

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
  { title: '角色标识', dataIndex: 'roleKey', key: 'roleKey', width: 140 },
  { title: '角色名称', dataIndex: 'roleName', key: 'roleName', width: 140 },
  { title: '账号数', key: 'userCount', width: 120 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 250 },
]

function emptyForm() {
  return {
    roleKey: '',
    roleName: '',
    statusBool: true,
    remark: '',
  }
}

function loadData() {
  getRoles().then((res) => {
    list.value = res.data.data || []
  })
}

function loadMenuTree() {
  getMenuTree().then((res) => {
    menuTree.value = res.data.data || []
  })
}

function toTreeData(nodes) {
  return (nodes || []).map((node) => ({
    title: node.perms ? `${node.name}（${node.perms}）` : node.name,
    key: node.id,
    children: toTreeData(node.children),
  }))
}

const treeData = computed(() => toTreeData(menuTree.value))

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  formVisible.value = true
}

function openEdit(record) {
  editingId.value = record.id
  form.value = {
    roleKey: record.roleKey,
    roleName: record.roleName,
    statusBool: record.status === 1,
    remark: record.remark || '',
  }
  formVisible.value = true
}

function handleSubmit() {
  if (!form.value.roleKey.trim()) {
    message.warning('请输入角色标识')
    return
  }
  if (!form.value.roleName.trim()) {
    message.warning('请输入角色名称')
    return
  }
  const payload = {
    roleKey: form.value.roleKey.trim(),
    roleName: form.value.roleName.trim(),
    status: form.value.statusBool ? 1 : 0,
    remark: form.value.remark,
  }
  saving.value = true
  const request = editingId.value ? updateRole(editingId.value, payload) : addRole(payload)
  request
    .then(() => {
      message.success(editingId.value ? '角色已更新' : '角色已创建')
      formVisible.value = false
      loadData()
    })
    .finally(() => {
      saving.value = false
    })
}

function openAssign(record) {
  assignTarget.value = record
  getRole(record.id).then((res) => {
    checkedKeys.value = res.data.data.menuIds || []
    assignVisible.value = true
  })
}

// 勾选子菜单时自动补上父菜单，保证侧边栏能正确组装
function withAncestors(keys) {
  const parentMap = new Map()
  const walk = (nodes) => {
    (nodes || []).forEach((node) => {
      (node.children || []).forEach((child) => parentMap.set(child.id, node.id))
      walk(node.children)
    })
  }
  walk(menuTree.value)
  const result = new Set(keys)
  keys.forEach((key) => {
    let parent = parentMap.get(key)
    while (parent) {
      result.add(parent)
      parent = parentMap.get(parent)
    }
  })
  return Array.from(result)
}

function handleAssign() {
  assigning.value = true
  assignRoleMenus(assignTarget.value.id, withAncestors(checkedKeys.value))
    .then(() => {
      message.success('菜单权限已保存')
      assignVisible.value = false
      loadData()
    })
    .finally(() => {
      assigning.value = false
    })
}

function handleDelete(record) {
  deleteRole(record.id).then(() => {
    message.success('角色已删除')
    loadData()
  })
}

onMounted(() => {
  loadData()
  loadMenuTree()
})
onActivated(loadData)
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
}

.tip {
  color: #999;
  font-size: 13px;
}

.tree-wrap {
  max-height: 60vh;
  overflow: auto;
  padding: 8px 4px;
}

/* 操作列固定三列：缺按钮时留空占位，保证多行按钮上下对齐 */
.row-actions {
  display: grid;
  grid-template-columns: repeat(3, 72px);
  align-items: center;
  justify-content: center;
}

.row-actions > * {
  justify-self: center;
}
</style>
