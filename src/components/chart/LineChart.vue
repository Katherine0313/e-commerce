<template>
  <div style="width: 100%; height: 400px" class="line-chart">
    <!-- series 是异步来的：没数据不 init，避免空坐标系 -->
    <div v-if="!hasData" class="h-full flex items-center justify-center">
      <a-empty description="暂无数据" />
    </div>
    <div v-else ref="container" style="width: 100%; height: 400px"></div>
  </div>
</template>
<script setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import * as echarts from 'echarts';
  const props = defineProps({
    // [{ name: '销售额', data: [['9月', 1234], ...] }, { name: '订单', data: [...] }]
    // 不传时默认 []，组件进入空态，不会报错
    series: { type: Array, default: () => [] },
    // 是否双轴：两条线量级差异大时用（如销售额+订单量、用户总量+新增）；
    // 同类量级（如待付款/已付款订单）不设，共用左轴，纵坐标刻度才一致
    dualAxis: { type: Boolean, default: false },
  });
  const container = ref();
  let chart = null;
  const hasData = computed(
    () =>
      Array.isArray(props.series) &&
      props.series.some((s) => Array.isArray(s.data) && s.data.length > 0)
  );

  // 提成函数供 init 和 watch 复用同一份配置
  function buildOption() {
    const multi = props.dualAxis && props.series.length > 1;
    return {
      color: ['#005af9', '#985af9', '#f5222d'],
      grid: [
        {
          top: 100,
          left: 32,
          right: 12,
          bottom: 20,
        },
      ],
      xAxis: [
        {
          name: '时间',
          nameTextStyle: { color: 'rgba(0 , 0, 0, 0)' },
          type: 'category',
          axisTick: { show: false },
          axisLine: { show: false },
          boundaryGap: 0,
          splitLine: {
            show: false,
          },
        },
      ],
      yAxis: [
        {
          name: '销售额',
          nameTextStyle: { color: 'rgba(0 , 0, 0, 0)' },
          type: 'value',
          axisTick: { show: false },
          axisLine: { show: false },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              width: 2,
              color: 'rgba(0, 0, 0, 0.15)',
            },
          },
        },
        // 第 2 条线是订单量，量级比销售额小两三个数量级，共用左轴会被压成
        // 一条贴底直线，所以单独给一根右轴
        ...(multi
          ? [
              {
                name: props.series[1].name,
                nameTextStyle: { color: 'rgba(0 , 0, 0, 0)' },
                type: 'value',
                axisTick: { show: false },
                axisLine: { show: false },
                splitLine: { show: false },
              },
            ]
          : []),
      ],
      legend: {
        show: true,
        right: '8',
        top: 0,
        orient: 'vertical',
      },
      tooltip: {
        show: true,
        trigger: 'axis',
      },
      series: props.series.map((s, i) => ({
        name: s.name,
        type: 'line',
        smooth: true,
        lineStyle: {
          width: 3,
        },
        yAxisIndex: multi && i > 0 ? 1 : 0,
        data: s.data ?? [],
      })),
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
  // 长度不变只是数值变化时 hasData 不变，必须单独监听 series 重绘
  watch(() => props.series, render, { deep: true });
  // keep-alive 下只有真正关闭标签页才触发，正好是释放图表的时机
  onBeforeUnmount(dispose);
</script>
