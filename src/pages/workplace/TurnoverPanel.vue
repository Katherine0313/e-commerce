<template>
  <div class="turnover-panel card p-lg">
    <div class="flex items-start justify-between">
      <OverviewTitle
        title="营业额"
        :subtitle="turnover.timeDesc || periodLabel"
      />
      <!-- 维度与后端一致：昨日 / 近7天 / 本月 -->
      <a-radio-group
        :value="period"
        button-style="solid"
        size="small"
        @change="onPeriodChange"
      >
        <a-radio-button
          v-for="item in PERIODS"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </a-radio-button>
      </a-radio-group>
    </div>
    <div class="turnover-value flex items-baseline mt-md">
      <span class="text-base">￥</span>
      <span class="text-xxl font-bold">{{
        formatThousand(turnover.turnover, 2)
      }}</span>
    </div>
    <!-- 昨日只有一天，画单点没有意义，只展示汇总数字 -->
    <div
      v-if="period === 'yesterday'"
      class="h-[200px] flex items-center justify-center"
    >
      <a-empty description="昨日仅展示汇总营业额" />
    </div>
    <line-chart v-else :series="series" />
  </div>
</template>
<script setup>
  import { computed } from 'vue';
  import LineChart from '@/components/chart/LineChart.vue';
  import OverviewTitle from '@/components/statistic/OverviewTitle.vue';
  import { formatThousand } from '@/utils/formatter';

  const PERIODS = [
    { value: 'yesterday', label: '昨日' },
    { value: 'week', label: '近7天' },
    { value: 'month', label: '本月' },
  ];

  const props = defineProps({
    // 后端 TurnoverVO：{ timeDesc, turnover }
    turnover: {
      type: Object,
      default: () => ({ timeDesc: '', turnover: 0 }),
    },
    // 后端 TurnoverReportVO：{ dateList, turnoverList }
    report: {
      type: Object,
      default: () => ({ dateList: [], turnoverList: [] }),
    },
    period: { type: String, default: 'week' },
  });
  const emit = defineEmits(['change-period']);

  const periodLabel = computed(
    () => PERIODS.find((p) => p.value === props.period)?.label || ''
  );

  // dateList 是 yyyy-MM-dd，X 轴只显示 MM-dd
  const series = computed(() => [
    {
      name: '营业额',
      data: (props.report?.dateList || []).map((d, i) => [
        String(d).slice(5),
        Number(props.report.turnoverList?.[i]) || 0,
      ]),
    },
  ]);

  function onPeriodChange(e) {
    emit('change-period', e.target.value);
  }
</script>
<style scoped lang="less">
  .turnover-panel {
    :deep(.line-chart) {
      @apply -mt-10;
    }
  }
</style>
