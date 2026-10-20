<template>
  <div class="user-growth card p-lg">
    <OverviewTitle title="用户增长" subtitle="近 12 个月" />
    <line-chart :series="series" dual-axis />
  </div>
</template>
<script>
  import { defineComponent } from 'vue';
  import dayjs from 'dayjs';
  import LineChart from '@/components/chart/LineChart.vue';
  import OverviewTitle from '@/components/statistic/OverviewTitle.vue';
  export default defineComponent({
    components: { LineChart, OverviewTitle },
    name: 'UserGrowth',
    props: {
      // { months: ['2025-11', ...], newUsers: [5, ...], totalUsers: [100, ...] }
      data: { type: Object, default: () => ({ months: [], newUsers: [], totalUsers: [] }) },
    },
    computed: {
      // 双折线：用户总量（累计）+ 新增用户（每月增量）
      series() {
        const { months, newUsers, totalUsers } = this.data;
        const labels = months.map((m) => (m ? dayjs(`${m}-01`).format('M月') : ''));
        return [
          { name: '用户总量', data: labels.map((l, i) => [l, totalUsers[i] ?? 0]) },
          { name: '新增用户', data: labels.map((l, i) => [l, newUsers[i] ?? 0]) },
        ];
      },
    },
  });
</script>
<style scoped lang="less">
  .user-growth {
    :deep(.line-chart) {
      @apply -mt-10;
    }
  }
</style>
