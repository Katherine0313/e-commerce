<template>
  <div style="height: 240px" class="bar-chart">
    <!-- list 是异步来的：数据没到之前不 init，否则会留下「有坐标轴、没有柱子」的空图表 -->
    <div v-if="!hasData" class="h-full flex items-center justify-center">
      <a-empty description="暂无数据" />
    </div>
    <div v-else ref="container" style="height: 240px"></div>
  </div>
</template>
<script setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import * as echarts from 'echarts';
  import { formatThousand } from '@/utils/formatter';
  const props = defineProps({
    color: Array,
    list: Array,
    // 纵轴固定刻度间隔（营业额传 2000）
    yAxisInterval: { type: Number, default: 0 },
  });
  const container = ref();
  let chart = null;
  // 有数据才建图，空数据走空态
  const hasData = computed(
    () => Array.isArray(props.list) && props.list.length > 0
  );

  // 营业额图：以 2000 为基数，按数据量级选 2000 的整数倍，刻度控制在 8 档左右
  function yAxisInterval() {
    const step = props.yAxisInterval;
    if (!step) return undefined;
    const values = (props.list || [])
      .map((d) => Number(Array.isArray(d) ? d[1] : d))
      .filter((v) => Number.isFinite(v));
    const max = values.length ? Math.max(...values) : 0;
    if (max <= 0) return step;
    return Math.max(step, Math.ceil(max / step / 8) * step);
  }

  // 提成函数供 init 和 watch 复用同一份配置
  function buildOption() {
    return {
      color: props.color ?? ['#ff0000'],
      backgroundColor: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 1,
        y2: 0,
        colorStops: [
          {
            offset: 0,
            color: '#00369e',
          },
          {
            offset: 0.33,
            color: '#005cfd',
          },
          {
            offset: 1,
            color: '#a18dff',
          },
        ],
      },
      grid: [
        {
          top: 40,
          left: 56,
          right: 20,
          bottom: 40,
          // 营业额是 6 位数，按纵轴标签实际宽度自动留白
          containLabel: true,
        },
      ],
      xAxis: [
        {
          name: '时间',
          nameTextStyle: { color: 'rgba(0, 0, 0, 0)' },
          type: 'category',
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: '#fff' },
          splitLine: {
            show: false,
          },
        },
      ],
      darkMode: true,
      yAxis: [
        {
          name: '销售额',
          nameTextStyle: { color: 'rgba(0, 0, 0, 0)' },
          type: 'value',
          interval: yAxisInterval(),
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: {
            color: '#fff',
            // 金额刻度加千分位
            formatter: (value) =>
              Number.isInteger(value) ? formatThousand(value) : value,
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              width: 2,
              color: 'rgba(255, 255, 255, 0.25)',
            },
          },
        },
      ],
      series: [
        {
          type: 'bar',
          barWidth: 24,
          itemStyle: {
            borderRadius: 4,
          },
          data: props.list ?? [],
        },
      ],
    };
  }

  // notMerge 整份替换，避免残留上一次的 series
  function render() {
    if (chart) {
      chart.setOption(buildOption(), true);
    }
  }
  function resize() {
    chart?.resize();
  }
  function dispose() {
    window.removeEventListener('resize', resize);
    // 原来漏了 dispose，keep-alive 关标签页后会泄漏 canvas
    chart?.dispose();
    chart = null;
  }
  async function init() {
    // v-else 分支的 DOM 要等渲染完才有 ref
    await nextTick();
    if (!container.value) return;
    chart = echarts.init(container.value);
    render();
    window.addEventListener('resize', resize);
  }

  onMounted(() => {
    if (hasData.value) init();
  });
  // 空 ↔ 有数据切换：建图 / 销毁
  watch(hasData, (v) => (v ? init() : dispose()));
  // 长度不变只是数值变化时 hasData 不变，必须单独监听 list 重绘
  watch(() => props.list, render, { deep: true });
  // keep-alive 下只有真正关闭标签页才触发，正好是释放图表的时机
  onBeforeUnmount(dispose);
</script>
<style scoped lang="less">
  .bar-chart {
    :deep(canvas) {
      @apply rounded-lg;
    }
  }
</style>
