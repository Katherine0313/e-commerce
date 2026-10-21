/**
 * 工作台数据聚合：父组件一次拉取，通过 props 分发给子组件，避免订单数据被重复请求 4 次。
 * 口径常量集中在这里，以后改口径只改这一处。
 */
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';
import { getAllOrders, getOrderStatus } from '@/api/orders.js';
import { getAfterSales } from '@/api/afterSale.js';
import { getDashboard } from '@/api/products.js';
import { getUserStatistics } from '@/api/user.js';
import { loadShop, shop } from '@/utils/shop.js';
import { formatThousand } from '@/utils/formatter.js';

// ==================== 口径常量 ====================
// 计入「销售额」的状态（OrderStatusEnum 数字 code）：待付款(1)还没付钱、已取消(6)不产生成交，都排除
const PAID_STATUS = [2, 3, 4, 5]; // 待确认/待发货/已发货/已完成
// 计入「订单量」时排除的状态（数字 code）
const COUNTED_EXCLUDE = [6]; // 已取消
// 待商家处理的售后状态
const AFTER_SALE_TODO = 'reviewing';
const RECENT_ORDER_LIMIT = 6; // 订单记录卡取几笔
const TREND_MONTHS = 12; // 折线图月数

// ==================== 纯函数 ====================
/** pay_amount 是 REAL 列但可能以字符串返回，统一转数字（formatThousand 内部要 toFixed） */
export const toAmount = (o) => Number(o?.payAmount) || 0;

/** created_at 正常是 'YYYY-MM-DD HH:mm:ss'，兜底兼容 Unix 秒 */
const toDate = (v) => {
  if (!v) return null;
  return typeof v === 'number' ? dayjs(v * 1000) : dayjs(String(v));
};

/** 订单的日期键 'YYYY-MM-DD' */
export const dayKey = (o) => {
  const d = toDate(o?.createdAt);
  return d && d.isValid() ? d.format('YYYY-MM-DD') : '';
};

/** 订单的月份键 'YYYY-MM' */
const monthKeyOf = (o) => {
  const d = toDate(o?.createdAt);
  return d && d.isValid() ? d.format('YYYY-MM') : '';
};

/** 排序用的时间戳 */
const timeOf = (o) => {
  const d = toDate(o?.createdAt);
  return d && d.isValid() ? d.valueOf() : 0;
};

export const isPaidOrder = (o) => PAID_STATUS.includes(o.orderStatus);
export const isCountedOrder = (o) => !COUNTED_EXCLUDE.includes(o.orderStatus);

/** 订单状态 → 时间线样式类（沿用模板里已有的 completed / process / canceled 三档） */
export const orderStatusClass = (s) =>
  s === 5 ? 'completed' : s === 6 ? 'canceled' : 'process';

/** 求和，取不到值按 0 兜底，避免 NaN 扩散 */
const sumBy = (list, pick) =>
  list.reduce((sum, o) => sum + (Number(pick(o)) || 0), 0);

/**
 * 环比涨跌幅。上期为 0 时无法计算（除零得 Infinity），返回 null → 调用处不显示涨跌幅。
 * 返回字段名与 OverviewTitle / MiniStatisticCard 的 props 对齐，可以整对象传
 */
export function growth(current, previous) {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { change: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0, down: pct < 0 };
}
// 拿不到环比时的占位，模板里直接展开就行
const NO_GROWTH = Object.freeze({ change: '', up: false, down: false });

/** 近 N 个自然月（含本月）按月分组。返回 [['9月', 值], ...] */
export function groupByMonth(list, months, pick) {
  const keys = [];
  const bucket = new Map();
  for (let i = months - 1; i >= 0; i--) {
    const key = dayjs().subtract(i, 'month').format('YYYY-MM');
    keys.push(key);
    bucket.set(key, 0);
  }
  list.forEach((o) => {
    const k = monthKeyOf(o);
    if (bucket.has(k)) bucket.set(k, bucket.get(k) + (Number(pick(o)) || 0));
  });
  return keys.map((k) => [dayjs(`${k}-01`).format('M月'), round2(bucket.get(k))]);
}

/** 金额保留 2 位，避免浮点累加出 0.30000000000000004 */
const round2 = (v) => Math.round(v * 100) / 100;

// ==================== 主 composable ====================
export function useWorkplaceData() {
  // ---------------- 原始状态 ----------------
  const orders = ref([]); // 本店全部订单（非 admin 时是本人订单，后端已过滤 is_deleted）
  const orderStatus = ref({ map: {}, color: {} }); // 订单状态字典
  const productStat = ref({ totalProducts: 0, totalStock: 0, totalValue: 0 });
  const afterSaleTodo = ref(0);
  const userGrowth = ref({ months: [], newUsers: [], totalUsers: [] }); // 用户增长（月、新增、累计）

  // ---------------- 时间窗口 ----------------
  // dayOffsetKey(0)=今天
  const dayOffsetKey = (daysAgo) =>
    dayjs().subtract(daysAgo, 'day').format('YYYY-MM-DD');
  const TODAY = dayOffsetKey(0);

  const ordersOfDay = (key) => orders.value.filter((o) => dayKey(o) === key);
  const monthPrefix = (offset) => dayjs().subtract(offset, 'month').format('YYYY-MM');
  const ordersOfMonth = (offset) =>
    orders.value.filter((o) => monthKeyOf(o) === monthPrefix(offset));

  // ---------------- 顶部三个 a-statistic ----------------
  const headline = computed(() => ({
    products: Number(productStat.value.totalProducts) || 0,
    orders: orders.value.filter(isCountedOrder).length,
    amount: sumBy(orders.value.filter(isPaidOrder), toAmount),
  }));

  // ---------------- 今日 / 昨日 ----------------
  const todayStat = computed(() => ({
    amount: sumBy(ordersOfDay(TODAY).filter(isPaidOrder), toAmount),
    count: ordersOfDay(TODAY).filter(isCountedOrder).length,
  }));
  const yesterdayStat = computed(() => ({
    amount: sumBy(ordersOfDay(dayOffsetKey(1)).filter(isPaidOrder), toAmount),
    count: ordersOfDay(dayOffsetKey(1)).filter(isCountedOrder).length,
  }));

  // ---------------- 近 12 个月（柱状图）----------------
  // 近 12 月（含本月）订单
  const monthOrders = computed(() =>
    orders.value.filter((o) => {
      const k = monthKeyOf(o);
      return !!k && k >= monthPrefix(TREND_MONTHS - 1);
    })
  );
  // 前 12 月（用于环比）
  const prevMonthOrders = computed(() =>
    orders.value.filter((o) => {
      const k = monthKeyOf(o);
      return (
        !!k &&
        k >= monthPrefix(TREND_MONTHS * 2 - 1) &&
        k < monthPrefix(TREND_MONTHS - 1)
      );
    })
  );

  const monthlySales = computed(() =>
    groupByMonth(monthOrders.value.filter(isPaidOrder), TREND_MONTHS, toAmount)
  );

  const monthRaw = computed(() => {
    const sales = sumBy(monthOrders.value.filter(isPaidOrder), toAmount);
    const count = monthOrders.value.filter(isCountedOrder).length;
    return { sales, count, perOrder: count ? sales / count : 0 };
  });

  const monthSalesGrowth = computed(
    () =>
      growth(
        monthRaw.value.sales,
        sumBy(prevMonthOrders.value.filter(isPaidOrder), toAmount)
      ) ?? NO_GROWTH
  );

  const monthStats = computed(() => [
    { title: '近12月销售额', value: `￥${formatThousand(monthRaw.value.sales, 2)}` },
    { title: '近12月订单量', value: formatThousand(monthRaw.value.count, 0) },
    {
      title: '月均销售额',
      value: `￥${formatThousand(monthRaw.value.sales / TREND_MONTHS, 2)}`,
    },
    { title: '客单价', value: `￥${formatThousand(monthRaw.value.perOrder, 2)}` },
  ]);

  const monthSummary = computed(() =>
    monthRaw.value.count
      ? `近 ${TREND_MONTHS} 个月共成交 ${monthRaw.value.count} 笔订单，月均销售额 ￥${formatThousand(
          monthRaw.value.sales / TREND_MONTHS,
          2
        )}。`
      : `近 ${TREND_MONTHS} 个月暂无成交订单。`
  );

  // ---------------- 近 12 个月（折线图）----------------
  // 只统计订单量：待付款（1）、已付款（2/3/4/5）、已取消（6），不算营业额
  const monthlySeries = computed(() => [
    {
      name: '待付款订单',
      data: groupByMonth(orders.value.filter((o) => o.orderStatus === 1), TREND_MONTHS, () => 1),
    },
    {
      name: '已付款订单',
      data: groupByMonth(orders.value.filter(isPaidOrder), TREND_MONTHS, () => 1),
    },
    {
      name: '取消订单',
      data: groupByMonth(orders.value.filter((o) => o.orderStatus === 6), TREND_MONTHS, () => 1),
    },
  ]);

  const monthGrowth = computed(
    () =>
      growth(
        ordersOfMonth(0).filter(isCountedOrder).length,
        ordersOfMonth(1).filter(isCountedOrder).length
      ) ?? NO_GROWTH
  );

  const orderMonthGrowth = computed(
    () =>
      growth(
        ordersOfMonth(0).filter(isCountedOrder).length,
        ordersOfMonth(1).filter(isCountedOrder).length
      ) ?? NO_GROWTH
  );

  // ---------------- 订单记录卡（最近若干笔）----------------
  const recentOrders = computed(() =>
    [...orders.value]
      .sort((a, b) => timeOf(b) - timeOf(a))
      .slice(0, RECENT_ORDER_LIMIT)
      .map((o) => ({
        id: o.id,
        amount: toAmount(o),
        // remark 是买家备注，大多为空，用收货人更稳
        title: o.consignee || o.orderNo || `订单 ${o.id}`,
        time: toDate(o.createdAt)?.format('MM/DD HH:mm') || '-',
        statusText:
          orderStatus.value.map?.[o.orderStatus] || o.orderStatus || '-',
        statusClass: orderStatusClass(o.orderStatus),
      }))
  );

  // ---------------- 今日待办 ----------------
  const todo = computed(() => ({
    pendingConfirm: orders.value.filter(
      (o) => o.orderStatus === 2
    ).length,
    pendingShip: orders.value.filter(
      (o) => o.orderStatus === 3
    ).length,
    afterSale: afterSaleTodo.value,
  }));

  // ---------------- 四张统计卡 ----------------
  const cards = computed(() => {
    // 待发货 / 库存预警是「当前快照」不是流量指标，算不出有意义的环比 → 不传 change
    return [
      {
        title: '今日销售额',
        value: `￥${formatThousand(todayStat.value.amount, 2)}`,
        ...(growth(todayStat.value.amount, yesterdayStat.value.amount) || {}),
        icon: 'dollar-circle-filled',
        iconClass: 'text-blue-100',
      },
      {
        title: '今日订单量',
        value: formatThousand(todayStat.value.count, 0),
        ...(growth(todayStat.value.count, yesterdayStat.value.count) || {}),
        icon: 'shopping-filled',
        iconClass: 'text-green-100',
      },
      {
        title: '待发货订单',
        value: formatThousand(todo.value.pendingShip, 0),
        icon: 'carry-out-filled',
        iconClass: 'text-purple-100',
      },
      {
        title: '用户总量',
        value: formatThousand(
          userGrowth.value.totalUsers[userGrowth.value.totalUsers.length - 1] || 0,
          0
        ),
        icon: 'team-outlined',
        iconClass: 'text-primary-100',
      },
    ];
  });

  // ---------------- 取数 ----------------
  /** 静态数据：字典 + 店铺信息。keep-alive 下 onMounted 只跑一次 */
  function loadStatic() {
    getOrderStatus()
      .then((res) => {
        orderStatus.value = res.data.data || { map: {}, color: {} };
      })
      .catch((err) => console.error('订单状态字典加载失败', err));
    // 复用 utils/shop 的模块级缓存，App.vue 启动时已拉过 → 这里通常不发请求
    loadShop();
  }

  /** 业务数据：每次进入工作台都刷新 */
  function loadAll() {
    return Promise.all([
      // 工作台要全量订单做近7天/近12月统计，后端是分页接口，pageSize 传大值一次拉全
      getAllOrders({ pageSize: 1000 })
        .then((res) => {
          // 后端返回分页结构 { list, total, page, pageSize }，取 list 数组
          orders.value = res.data.data?.list || [];
        })
        .catch((err) => {
          // 401/403/404/500 已由 request.js 拦截器统一提示，这里只兜网络错误
          if (!err.response) message.error('网络连接超时，请检查网络后再试');
          console.error('订单数据加载失败', err);
        }),
      getDashboard()
        .then((res) => {
          productStat.value = res.data.data || productStat.value;
        })
        .catch((err) => console.error('商品统计加载失败', err)),
      getAfterSales({ status: AFTER_SALE_TODO })
        .then((res) => {
          afterSaleTodo.value = (res.data.data || []).length;
        })
        .catch((err) => console.error('售后数据加载失败', err)),
      getUserStatistics()
        .then((res) => {
          const data = res.data.data || {};
          const months = data.months || [];
          const newUsers = data.newUsers || [];
          // 用户总量 = 累计新增
          let acc = 0;
          const totalUsers = newUsers.map((n) => (acc += Number(n) || 0));
          userGrowth.value = { months, newUsers, totalUsers };
        })
        .catch((err) => console.error('用户统计加载失败', err)),
    ]);
  }

  return {
    shopInfo: computed(() => shop.value),
    headline,
    cards,
    todo,
    monthlySales,
    monthSalesGrowth,
    monthStats,
    monthSummary,
    monthlySeries,
    monthGrowth,
    orderMonthGrowth,
    recentOrders,
    userGrowth,
    loadStatic,
    loadAll,
  };
}
