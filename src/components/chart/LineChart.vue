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
  import { formatThousand } from '@/utils/formatter';
  const props = defineProps({
    // [{ name: '销售额', data: [['9月', 1234], ...] }, { name: '订单', data: [...] }]
    // 不传时默认 []，组件进入空态，不会报错
    series: { type: Array, default: () => [] },
    // 是否双轴：两条线量级差异大时用（如销售额+订单量、用户总量+新增）；
    // 同类量级（如待付款/已付款订单）不设，共用左轴，纵坐标刻度才一致
    dualAxis: { type: Boolean, default: false },
    // 纵轴固定刻度间隔（营业额传 2000，即 0/2000/4000...）
    yAxisInterval: { type: Number, default: 0 },
  });
  const container = ref();
  let chart = null;
  const hasData = computed(
    () =>
      Array.isArray(props.series) &&
      props.series.some((s) => Array.isArray(s.data) && s.data.length > 0)
  );

  // 营业额图：以 2000 为基数，按数据量级选 2000 的整数倍，刻度控制在 8 档左右
  function yAxisInterval() {
    const step = props.yAxisInterval;
    if (!step) return undefined;
    const values = props.series
      .flatMap((s) =>
        (s.data || []).map((d) => (Array.isArray(d) ? Number(d[1]) : Number(d)))
      )
      .filter((v) => Number.isFinite(v));
    const max = values.length ? Math.max(...values) : 0;
    if (max <= 0) return step;
    return Math.max(step, Math.ceil(max / step / 8) * step);
  }

  // 提成函数供 init 和 watch 复用同一份配置
  function buildOption() {
    const multi = props.dualAxis && props.series.length > 1;
    return {
      color: ['#005af9', '#985af9', '#f5222d'],
      grid: [
        {
          top: 100,
          left: 32,
          // 右侧多留一点，避免最后一个日期标签被画布边缘裁掉
          right: 24,
          bottom: 20,
          // 营业额是 6 位数，32px 放不下纵轴标签，交给 ECharts 按标签宽度自动留白
          containLabel: true,
        },
      ],
      xAxis: [
        {
          name: '时间',
          nameTextStyle: { color: 'rgba(0 , 0, 0, 0)' },
          type: 'category',
          axisTick: { show: false },
          axisLine: { show: false },
          // 首尾各留 2%，最后一个日期标签不会贴边被裁
          boundaryGap: ['2%', '2%'],
          axisLabel: {
            // 本月数据点较多时自动隐藏重叠标签，而不是挤在一起
            hideOverlap: true,
            margin: 12,
            fontSize: 11,
          },
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
          // 营业额图自动选 2000 的整数倍；其他图不传则用 ECharts 默认
          interval: yAxisInterval(),
          axisTick: { show: false },
          axisLine: { show: false },
          // 金额刻度加千分位，避免 223661 这种长数字难读
          axisLabel: {
            formatter: (value) =>
              Number.isInteger(value) ? formatThousand(value) : value,
          },
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
                axisLabel: {
                  formatter: (value) =>
                    Number.isInteger(value) ? formatThousand(value) : value,
                },
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
