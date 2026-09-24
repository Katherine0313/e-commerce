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
  const props = defineProps({
    color: Array,
    list: Array,
  });
  const container = ref();
  let chart = null;
  // 有数据才建图，空数据走空态
  const hasData = computed(
    () => Array.isArray(props.list) && props.list.length > 0
  );

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
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: '#fff' },
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
