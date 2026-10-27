// 从vue-router库导入两个核心函数：创建路由实例、创建history模式路由
import {createRouter, createWebHistory} from 'vue-router'

/**
 * createRouter：用于创建路由管理器实例，管理页面跳转、路由守卫、路由匹配等核心功能
 * createWebHistory：创建HTML5 History模式的路由模式
 特点：地址栏不带 # 哈希符号，标准干净URL，需要后端配置支持刷新不404
 对比 createWebHashHistory：哈希模式自带#，无需后端配置
 */


const routes = [
    {
        path: '/',
        redirect: '/workplace',
        meta: {
            renderMenu: false,
        },
    },
    {
        // 登录页独立成整屏路由（view: blank 时 stepin 不渲染后台布局），不再套 FrontView 的营销头部
        path: '/front/login',
        name: 'Login',
        meta: {
            icon: 'LoginOutlined',
            view: 'blank',
            target: '_blank',
            cacheable: false,
            // 登录页是整屏独立页面，不进入侧边导航
            renderMenu: false,
        },
        component: () => import('@/pages/login'),
    },
    {
        path: '/front',
        name: '前端',
        meta: {
            renderMenu: false,
        },
        component: () => import('@/components/layout/FrontView.vue'),
        children: [
            {
                path: 'home',
                name: 'Home',
                meta: {
                    view: 'blank',
                },
                component: () => import('@/pages/home'),
            },
        ],
    },
    {
        path: '/workplace',
        name: 'Workplace',
        meta: {
            isLogin: true,
            icon: 'DashboardOutlined',
            title: '工作台',
            renderMenu: true,
            cacheable: true,
        },
        component: () => import('@/pages/workplace/Workplace.vue'),
    },
    {
        path: '/table',
        name: 'Table',
        meta: {
            isLogin: true,
            title: '表格',
            icon: 'TableOutlined',
            renderMenu: true,
            cacheable: true,
        },
        component: () => import('@/pages/table/Table.vue'),
    },
    {
        path: '/personal',
        name: 'Personal',
        meta: {
            isLogin: true,
            title: '个人中心',
            icon: 'ProfileOutlined',
            renderMenu: true,
            cacheable: true,
        },
        component: () => import('@/pages/personal/Personal.vue'),
    },
    {
        path: '/goods',
        name: 'Goods',
        meta: {
            isLogin: true,
            title: '商品管理',
            icon: 'ReconciliationOutlined',
            renderMenu: true,
            cacheable: true,
        },
        children: [
            {
                path: 'list',
                name: 'List',
                meta: {
                    title: '商品列表',
                },
                component: () => import('@/pages/goods/list/List.vue')
            },
            {
                path: 'add-goods',
                name: 'addGoods',
                meta: {
                    title: '添加商品',
                },
                component: () => import('@/pages/goods/add-goods/AddGoods.vue')
            },
            {
                path: 'categories',
                name: 'Categories',
                meta: {
                    title: '商品分类',
                },
                component: () => import('@/pages/goods/category/Category.vue')
            },
            {
                path: 'tag',
                name: 'Tag',
                meta: {
                    title: '商品标签',
                },
                component: () => import('@/pages/goods/tag/Tag.vue')
            },

        ]
    },
    {
        path: '/orders',
        name: 'Orders',
        meta: {
            isLogin: true,
            title: '订单管理',
            icon: 'ShoppingCartOutlined',
            renderMenu: true,
            cacheable: true,
        }, children: [
            {
                path: 'order-list',
                name: 'OrderList',
                meta: {
                    title: '订单列表',
                },
                component: () => import('@/pages/orders/OrderList.vue'),
            },
            {
                path: 'ship',
                name: 'Ship',
                meta: {
                    title: '发货管理',
                },
                component: () => import('@/pages/orders/shipment/Ship.vue'),
            }
            ]
    },
    {
        path: '/after-sales',
        name: 'AfterSales',
        meta: {
            isLogin: true,
            title: '售后管理',
            icon: 'CustomerServiceOutlined',
            renderMenu: true,
            cacheable: true,
        }, children: [
            {
                path: 'after-sale-list',
                name: 'AfterSaleList',
                meta: {
                    title: '售后订单',
                },
                component: () => import('@/pages/after-sales/AfterSaleList.vue'),
            }
        ]
    },
    {
        path: '/stock',
        name: 'Stock',
        meta: {
            isLogin: true,
            title: '库存管理',
            icon: 'InboxOutlined',
            renderMenu: true,
            cacheable: true,
        },children: [{
            path: 'stock-list',
            name: 'StockList',
            meta: {
                title: '库存列表',
            },
            component: () => import('@/pages/stock/StockList.vue'),
        }]
        },
    {
        path: '/business',
        name: 'Business',
        meta: {
            isLogin: true,
            title: '经营工具',
            icon: 'FundOutlined',
            renderMenu: true,
            cacheable: true,
        },
        children: [
            {
                path: 'on-sale',
                name: 'OnSale',
                meta: {
                    title:'促销工具'
                },
                component: () => import('@/pages/business/OnSale.vue'),
            }
        ]
        },
    {
        path: '/:pathMatch(.*)*',
        name: '404',
        props: true,
        meta: {
            icon: 'CreditCardOutlined',
            renderMenu: false,
            cacheable: false,
            _is404Page: true,
        },
        component: () => import('@/pages/Exp404.vue'),
    },
];
// ==================== 路由实例创建 ====================
// 1. 创建一个【真正能用的路由工具】
const router = createRouter({
    // 2.设置网址风格
    history: createWebHistory(import.meta.env.BASE_URL),
    // 3.把你写的【路线地图】交给路由工具，让它认识所有路径
    routes
})
export default router;
