<template>
  <div class="active-users card p-lg">
    <bar-chart :color="['#ffffff']" :list="list" />
    <div class="details">
      <OverviewTitle
        title="近 7 天销售趋势"
        subtitle="较前 7 天"
        :change="change"
        :up="up"
        :down="down"
      />
      <div class="content">{{ summary }}</div>
      <div class="statistics">
        <a-statistic
          :title="item.title"
          :value="item.value"
          v-for="(item, i) in stats"
          :key="i"
        />
      </div>
    </div>
  </div>
</template>
<script>
  import { defineComponent } from 'vue';
  import BarChart from '@/components/chart/BarChart.vue';
  import OverviewTitle from '@/components/statistic/OverviewTitle.vue';
  export default defineComponent({
    name: 'ActiveUsers',
    components: { BarChart, OverviewTitle },
    props: {
      // [['9/13', 1234], ...] 近 7 天每日销售额
      list: { type: Array, default: () => [] },
      change: { type: String, default: '' },
      up: { type: Boolean, default: false },
      down: { type: Boolean, default: false },
      // [{ title, value }] 底部小统计
      stats: { type: Array, default: () => [] },
      // 正文一句话，由真实数据生成
      summary: { type: String, default: '' },
    },
  });
</script>
<style scoped lang="less">
  .active-users {
    .details {
      @apply mt-lg;
    }
    .content {
      @apply mt-md text-title;
    }
    .statistics {
      @apply flex mt-md;
      :deep(.ant-statistic) {
        @apply flex-1 flex flex-col-reverse;
        .ant-statistic-title {
          @apply text-xs -mt-1;
        }
        .ant-statistic-content {
          @apply font-bold;
        }
      }
    }
  }
</style>
