<template>
  <div class="projects card">
    <div class="flex items-baseline justify-between">
      <overview-title title="库存预警" subtitle="按异常程度排序" />
      <!-- 原来是三个点不动的演示单选，换成真实汇总（预警 = 低库存，积压 = 超上限） -->
      <div class="extra">
        <a-tag v-if="total" color="red">预警 {{ total }} 项</a-tag>
        <a-tag v-if="overstock" :color="statusColor('high')"
          >积压 {{ overstock }} 项</a-tag
        >
        <a-tag v-if="!total && !overstock" color="green">库存正常</a-tag>
      </div>
    </div>
    <a-table
      :columns="columns"
      :dataSource="rows"
      :pagination="false"
      row-key="product_id"
    >
      <template #bodyCell="{ record, column }">
        <template v-if="column.dataIndex === 'product'">
          <div class="flex items-center">
            <img class="w-6 h-6 rounded object-cover" v-lazy="record.image" />
            <span class="ml-sm">{{ record.name }}</span>
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'stock'">
          <!-- 状态标签已经带了档位颜色，这里只额外突出「彻底缺货」这种字典里没有的情况 -->
          <span
            class="font-bold"
            :class="Number(record.stock) <= 0 ? 'text-error-500' : ''"
          >
            {{ record.stock }}
          </span>
        </template>
        <template v-else-if="column.dataIndex === 'min_stock'">
          <span style="color: #9e9e9e; font-weight: 700; font-size: 12px">
            {{ record.min_stock ?? '-' }}
          </span>
        </template>
        <template v-else-if="column.dataIndex === 'statusKey'">
          <a-tag :color="statusColor(record.statusKey)">
            {{ statusText(record.statusKey) }}
          </a-tag>
        </template>
      </template>
    </a-table>
    <a-button
      size="large"
      class="add-btn"
      type="dashed"
      @click="router.push('/stock/stock-list')"
    >
      <template #icon>
        <inbox-outlined />
      </template>
      查看全部库存
    </a-button>
  </div>
</template>
<script setup>
  import { useRouter } from 'vue-router';
  import OverviewTitle from '@/components/statistic/OverviewTitle.vue';
  const router = useRouter();
  const props = defineProps({
    // 已排序、已截断的异常行（来自 useWorkplaceData 的 alertRows）
    rows: { type: Array, default: () => [] },
    // 低库存预警数
    total: { type: Number, default: 0 },
    // 高库存积压数
    overstock: { type: Number, default: 0 },
    // 后端 /api/stock/status-constants 的 { map, color }
    dict: { type: Object, default: () => ({ map: {}, color: {} }) },
  });
  // 三档状态的中文与颜色都走字典，字典没加载出来时退回英文 key，不渲染空标签
  const statusText = (key) => props.dict?.map?.[key] || key;
  const statusColor = (key) => props.dict?.color?.[key] || 'default';
  const columns = [
    { title: '商品', dataIndex: 'product' },
    { title: '当前库存', dataIndex: 'stock' },
    { title: '预警阈值', dataIndex: 'min_stock' },
    { title: '状态', dataIndex: 'statusKey' },
  ];
</script>
<style lang="less" scoped>
  .projects {
    :deep(.ant-table) {
      @apply -mx-md;

      .ant-table-thead {
        > tr > th:first-child {
          @apply pl-lg;
        }

        > tr > th:last-child {
          @apply pr-lg;
        }
      }

      .ant-table-tbody {
        > tr > td {
          @apply border-b-0 border-t;

          &:first-child {
            @apply pl-lg;
          }

          &:last-child {
            @apply pr-lg;
          }
        }
      }
    }

    .add-btn {
      @apply justify-center flex items-center mt-md -mx-2;
      width: calc(100% + 16px);
    }
  }
</style>
