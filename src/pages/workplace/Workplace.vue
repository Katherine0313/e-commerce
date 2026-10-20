<template>
  <div class="workplace grid grid-rows-none gap-4 mt-xxs">
    <!-- 非管理员看到的订单只属于本人，和商品/库存的全店口径不一致，这里明确说明 -->
    <a-alert
      v-if="!isAdminUser"
      type="info"
      show-icon
      message="当前为普通用户账号，订单相关指标仅统计您本人的订单；使用商家（管理员）账号可查看全店数据。"
    />
    <div
      class="bg-container p-base rounded-b-lg rounded-tr-lg pt-8 flex items-end justify-between"
    >
      <div class="flex items-center">
        <!-- JWT 里只有 {username, role}，没有头像字段，沿用顶栏同一张默认图 -->
        <img
          src="@/assets/avatar/zongjie.webp"
          class="w-16 h-16 rounded-full"
        />
        <div class="ml-base">
          <div class="text-title font-bold text-lg">{{ greeting }}</div>
          <div class="text-subtext font-bold text-sm">{{ roleText }}</div>
        </div>
      </div>
      <div class="flex items-start">
        <a-statistic
          class="w-20"
          :valueStyle="{ fontWeight: 500 }"
          title="商品"
          :value="headline.products"
        ></a-statistic>
        <a-statistic
          class="w-20"
          :valueStyle="{ fontWeight: 500 }"
          title="订单"
          :value="headline.orders"
        ></a-statistic>
        <a-statistic
          class="w-20"
          :valueStyle="{ fontWeight: 500 }"
          title="销售额"
        >
          <template #formatter>
            <div>
              <span class="text-base">￥</span
              >{{ formatThousand(headline.amount, 2) }}
            </div>
          </template>
        </a-statistic>
      </div>
    </div>
    <div class="grid grid-cols-12 gap-6">
      <mini-statistic-card
        class="card col-span-12 mdx:col-span-6 xlx:col-span-3"
        v-for="(item, i) in cards"
        :key="i"
        :title="item.title"
        :value="item.value"
        :change="item.change"
        :up="item.up"
        :down="item.down"
      >
        <template #icon>
          <component
            :class="`text-[96px] translate-x-[25%] translate-y-[25%] opacity-75 ${item.iconClass}`"
            v-bind:is="item.icon"
          />
        </template>
      </mini-statistic-card>
    </div>
    <div class="overview grid grid-cols-12 gap-4">
      <active-users
        class="col-span-12 xlx:col-span-6 xxlx:col-span-5 drop-shadow-sm"
        :list="weekDailySales"
        :stats="weekStats"
        :summary="weekSummary"
        :change="weekGrowth.change"
        :up="weekGrowth.up"
        :down="weekGrowth.down"
      />
      <order-stats
        class="col-span-12 xlx:col-span-6 xxlx:col-span-7 drop-shadow-sm"
        :series="monthlySeries"
        :change="monthGrowth.change"
        :up="monthGrowth.up"
        :down="monthGrowth.down"
      />
    </div>
    <div class="project-list grid grid-cols-12 gap-4">
      <user-growth
        class="col-span-12 xlx:col-span-7 xxlx:col-span-8 drop-shadow-sm"
        :data="userGrowth"
      />
      <order-history
        class="col-span-12 xlx:col-span-5 xxlx:col-span-4 drop-shadow-sm"
        :list="recentOrders"
        :change="orderMonthGrowth.change"
        :up="orderMonthGrowth.up"
        :down="orderMonthGrowth.down"
      />
    </div>
    <about-us :shop-info="shopInfo" :todo="todo" />
  </div>
</template>

<script setup>
  import { computed, onActivated, onMounted } from 'vue';
  import dayjs from 'dayjs';
  import MiniStatisticCard from '@/components/statistic/MiniStatisticCard.vue';
  import ActiveUsers from './ActiveUsers.vue';
  import OrderStats from './OrderStats.vue';
  import UserGrowth from './UserGrowth.vue';
  import OrderHistory from './OrderHistory.vue';
  import AboutUs from './AboutUs.vue';
  import { useUnbounded } from '@/utils/useTheme';
  import { formatThousand } from '@/utils/formatter';
  import { getCurrentUser, isAdmin } from '@/utils/auth';
  import { useWorkplaceData } from './useWorkplaceData';

  useUnbounded();

  const {
    shopInfo,
    headline,
    cards,
    todo,
    weekDailySales,
    weekGrowth,
    weekStats,
    weekSummary,
    monthlySeries,
    monthGrowth,
    orderMonthGrowth,
    recentOrders,
    userGrowth,
    loadStatic,
    loadAll,
  } = useWorkplaceData();

  // 字典/店铺信息只拉一次；业务数据每次进入都刷新（首次挂载也会触发 onActivated）
  onMounted(loadStatic);
  onActivated(loadAll);

  const isAdminUser = isAdmin();
  const userName = getCurrentUser()?.username || '访客';

  const greeting = computed(() => {
    const h = dayjs().hour();
    const word =
      h < 6
        ? '凌晨好'
        : h < 12
        ? '上午好'
        : h < 14
        ? '中午好'
        : h < 18
        ? '下午好'
        : '晚上好';
    return `${word}，${userName}，欢迎回来`;
  });

  // 原来是演示身份「CEO / Co-Founder」，换成真实角色 + 店铺名
  const roleText = computed(() =>
    [isAdminUser ? '店铺管理员' : '普通用户', shopInfo.value?.name]
      .filter(Boolean)
      .join(' · ')
  );
</script>

<style scoped lang="less">
  .workplace {
  }
</style>
