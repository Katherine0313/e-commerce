<template>
  <div class="order-history card">
    <overview-title
      class="mb-7"
      title="订单记录"
      subtitle="本月新增"
      :change="change"
      :up="up"
      :down="down"
    />
    <a-timeline v-if="list.length" :reverse="reversed">
      <a-timeline-item
        v-for="(order, i) in list"
        :key="order.id"
        :class="`${order.statusClass} ${
          i === list.length - 1 && !reversed ? 'dashed' : ''
        }`"
      >
        <div class="time-line-content flex items-center">
          <span class="money mr-1 text-primary-500 font-bold"
            >￥{{ formatThousand(order.amount, 2) }}</span
          >-
          <span class="source ml-1">{{ order.title }}</span>
        </div>
        <!-- 原来是硬编码的「07/12 23:45 天猫商城」，现在读真实时间 + 订单状态 -->
        <div class="time text-subtext text-xs">
          {{ order.time }} {{ order.statusText }}
        </div>
      </a-timeline-item>
      <a-timeline-item class="tail">
        <div style="height: 28px">订单新增中...</div>
      </a-timeline-item>
    </a-timeline>
    <a-empty v-else description="暂无订单" class="py-lg" />
    <a-button
      type="primary"
      :class="{ 'reverse-btn': true, reversed, dashed: reversed }"
      @click="reverse"
    >
      翻转顺序
      <template #icon>
        <swap-outlined />
      </template>
    </a-button>
  </div>
</template>
<script>
  import { defineComponent, ref } from 'vue';
  import OverviewTitle from '@/components/statistic/OverviewTitle.vue';
  import { formatThousand } from '@/utils/formatter';
  export default defineComponent({
    components: { OverviewTitle },
    name: 'OrderHistory',
    props: {
      // [{ id, amount, title, time, statusText, statusClass }] 已由父组件排好序、映射好
      list: { type: Array, default: () => [] },
      change: { type: String, default: '' },
      up: { type: Boolean, default: false },
      down: { type: Boolean, default: false },
    },
    setup() {
      return {
        formatThousand,
        reversed: ref(false),
      };
    },
    methods: {
      reverse() {
        this.reversed = !this.reversed;
      },
    },
  });
</script>
<style lang="less" scoped>
  .order-history {
    @apply relative;
    .reverse-btn {
      @apply flex items-center justify-center absolute bottom-6 left-4 right-4;
      :deep(.anticon) {
        transform: rotate(90deg) rotateY(0deg);
        transition: all 0.25s ease-in;
      }
      &.reversed {
        :deep(.anticon) {
          transform: rotate(90deg) rotateY(180deg);
        }
      }
    }
    :deep(.ant-timeline) {
      .ant-timeline-item-content {
        top: -5px;
      }
      .ant-timeline-item-tail {
        height: calc(100% - 7px);
        top: 7px;
        left: 6px;
      }
      .ant-timeline-item-head {
        border-width: 3px;
        height: 14px;
        width: 14px;
      }
      .ant-timeline-item {
        &.canceled .time-line-content {
          .money {
            @apply line-through text-disabled;
          }
        }
        &.completed .ant-timeline-item-head {
          @apply border-success-500;
        }
        &.canceled .ant-timeline-item-head {
          @apply border-disabled;
        }
        &.dashed .ant-timeline-item-tail {
          @apply border-dashed;
        }
        &.tail .ant-timeline-item-head {
          @apply border-disabled opacity-30;
        }
      }
    }
  }
</style>
