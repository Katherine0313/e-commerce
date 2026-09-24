<template>
  <div class="sales-overview card p-lg">
    <OverviewTitle
      title="销售概览"
      subtitle="近 12 个月"
      :change="change"
      :up="up"
      :down="down"
    />
    <line-chart :series="series" />
  </div>
</template>
<script>
  import { defineComponent } from 'vue';
  import LineChart from '@/components/chart/LineChart.vue';
  import OverviewTitle from '@/components/statistic/OverviewTitle.vue';
  export default defineComponent({
    components: { LineChart, OverviewTitle },
    name: 'SalesOverview',
    props: {
      // [{ name: '销售额', data: [['9月', 1234], ...] }, { name: '订单', data: [...] }]
      series: { type: Array, default: () => [] },
      change: { type: String, default: '' },
      up: { type: Boolean, default: false },
      down: { type: Boolean, default: false },
    },
  });
</script>
<style scoped lang="less">
  .sales-overview {
    :deep(.line-chart) {
      @apply -mt-10;
    }
  }
</style>
