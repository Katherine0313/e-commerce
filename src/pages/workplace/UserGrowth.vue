<template>
  <div class="user-growth card p-lg">
    <OverviewTitle title="用户增长" :subtitle="periodLabel" />
    <!-- 用户总量和新增量级差很多，用双纵轴，避免新增曲线被压成贴底直线 -->
    <line-chart :series="series" dual-axis />
  </div>
</template>
<script>
  import { defineComponent } from 'vue';
  import dayjs from 'dayjs';
  import LineChart from '@/components/chart/LineChart.vue';
  import OverviewTitle from '@/components/statistic/OverviewTitle.vue';
  import { PERIODS } from './useWorkplaceData';
  export default defineComponent({
    components: { LineChart, OverviewTitle },
    name: 'UserGrowth',
    props: {
      // { bucketType: 'hour' | 'day' | 'month', buckets: [...], newUsers: [...], totalUsers: 123 }
      data: {
        type: Object,
        default: () => ({ bucketType: '', buckets: [], newUsers: [], totalUsers: 0 }),
      },
      // 全局报表时间维度，仅用于副标题
      period: { type: String, default: 'week' },
    },
    computed: {
      periodLabel() {
        return PERIODS.find((p) => p.value === this.period)?.label || '';
      },
      // 双折线：用户总量（期初总量 + 增量累计）+ 新增用户
      series() {
        const { bucketType, buckets = [], newUsers = [], totalUsers = 0 } = this.data;
        const nums = newUsers.map((n) => Number(n) || 0);
        // 期初总量 = 当前总量 − 本时间段新增，避免累计线从 0 开始
        let acc = (Number(totalUsers) || 0) - nums.reduce((s, n) => s + n, 0);
        const cumulative = nums.map((n) => (acc += n));
        const labels = buckets.map((b) => this.formatBucket(b, bucketType));
        return [
          { name: '用户总量', data: labels.map((l, i) => [l, cumulative[i] ?? 0]) },
          { name: '新增用户', data: labels.map((l, i) => [l, nums[i] ?? 0]) },
        ];
      },
    },
    methods: {
      // 小时桶已是 HH:00；月桶显示「M月」；日桶 yyyy-MM-dd → MM-dd
      formatBucket(bucket, type) {
        if (type === 'hour') return bucket;
        if (type === 'month') return dayjs(`${bucket}-01`).format('M月');
        return String(bucket).slice(5);
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
