<template>
  <div class="user-growth card p-lg">
    <OverviewTitle title="用户增长" :subtitle="periodLabel" />
    <!-- 两条线都是累计值、量级接近，共用一根纵轴：
         双轴各自缩放会把「新增」画得比「总量」还高，看图的人没法换算，纯误导 -->
    <line-chart :series="series" />
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
      // { bucketType: 'hour' | 'day' | 'month', buckets: [...], newUsers: [...], cumulativeUsers: [...], cumulativeNewUsers: [...], totalUsers: 123 }
      data: {
        type: Object,
        default: () => ({ bucketType: '', buckets: [], newUsers: [], cumulativeUsers: [], cumulativeNewUsers: [], totalUsers: 0 }),
      },
      // 全局报表时间维度，仅用于副标题
      period: { type: String, default: 'week' },
    },
    computed: {
      periodLabel() {
        return PERIODS.find((p) => p.value === this.period)?.label || '';
      },
      // 双折线（都是累计值，共用一根轴）：
      // 用户总量 = 期初存量 + 逐桶累加（后端算好）；累计新增 = 期内新增前缀和
      series() {
        const { bucketType, buckets = [], newUsers = [], cumulativeUsers = [], cumulativeNewUsers = [], totalUsers = 0 } = this.data;
        const nums = newUsers.map((n) => Number(n) || 0);
        const labels = buckets.map((b) => this.formatBucket(b, bucketType));
        // 累计存量曲线：优先用后端返回的 cumulativeUsers；老接口没这个字段时用 totalUsers 反推兜底
        let total;
        if (Array.isArray(cumulativeUsers) && cumulativeUsers.length) {
          total = cumulativeUsers.map((n) => Number(n) || 0);
        } else {
          let acc = (Number(totalUsers) || 0) - nums.reduce((s, n) => s + n, 0);
          total = nums.map((n) => (acc += n));
        }
        // 累计新增曲线：后端没返回时自己算前缀和（与后端算法等价）
        let added;
        if (Array.isArray(cumulativeNewUsers) && cumulativeNewUsers.length) {
          added = cumulativeNewUsers.map((n) => Number(n) || 0);
        } else {
          let acc = 0;
          added = nums.map((n) => (acc += n));
        }
        return [
          { name: '用户总量', data: labels.map((l, i) => [l, total[i] ?? 0]) },
          { name: '累计新增', data: labels.map((l, i) => [l, added[i] ?? 0]) },
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

    // 手机端图例移到底部，负 margin 会压住标题
    @media (max-width: 767px) {
      :deep(.line-chart) {
        margin-top: -8px;
      }
    }
  }
</style>
