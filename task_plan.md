# 任务计划：全站性能优化

将此文件作为任务的持久化路线图。在开始复杂工作前创建，并在阶段变化时及时更新。

## 目标

系统性地优化整个网站性能：降低首屏/切换页面的 JS 体积、解决图片全量请求排队，覆盖所有页面而非单点。

## 下一步

对接剩余后台模块：库存预警、售后、工作台（dashboard/shops/upload）。

## 当前阶段

后台管理端对接（商品/分类/标签/订单完成）

## 各阶段

将任务拆分为三到七个可验证的阶段。状态只能使用 `pending`、`in_progress` 或 `complete`，并在工作推进时更新。

### 阶段 1：需求与发现
- [x] 理解用户意图（全站卡顿，不止某页面）
- [x] 定位根因（主入口 1.9MB、缩略图全量请求排队、后端无压缩/缩略图）
- [x] 将发现记录到 findings.md
- **状态：** complete

### 阶段 2：规划与结构
- [x] 确定四层优化方案（打包瘦身 / 图片 / 加载策略 / 服务端 nginx）
- [x] 记录决策及理由
- **状态：** complete

### 阶段 3：图片源头优化
- [x] 新建 compressImage.js 上传压缩
- [x] AddGoods/EditModal 主图上传加压缩
- [x] Editor.vue 富文本上传改 customUpload 压缩
- [x] Mall.vue 详情富文本 img 懒加载
- **状态：** complete

### 阶段 4：全站列表缩略图懒加载
- [x] 新建全局 v-lazy 指令（IntersectionObserver）
- [x] main.js 注册指令 + 删除 vue-ueditor-wrap 死代码
- [x] 批量替换 14 个文件的列表缩略图为 v-lazy
- **状态：** complete

### 阶段 5：打包优化
- [x] 删除 vue-ueditor-wrap 死代码
- [x] vite manualChunks 拆 vue/antd 独立 chunk
- [x] antd 样式按需 —— 判定不可行（stepin 动态主题依赖 antd.variable.less）
- **状态：** complete

### 阶段 6：服务端 nginx（生产）
- [x] 分析 nginx 配置：确认 /image 反代已配好、HTTP/2 已开启
- [x] 提供 gzip + js/css immutable + 图片缓存配置（nginx-optimization.md）
- [x] 用户已打包上线
- **状态：** complete

### 阶段 7：测试与验证
- [ ] 验证列表缩略图滚动才加载
- [ ] 验证上传压缩生效
- [ ] 验证 nginx gzip/缓存生效（响应头）
- **状态：** in_progress

### 阶段 8：商品列表后端分页
- [x] 定位根因：商品列表接口无分页，onActivated 全量拉取
- [x] productDB.getAll 加 LIMIT/OFFSET（pageSize>0 才分页，兼容旧调用）
- [x] productController.getProducts 透传 page/pageSize
- [x] List.vue 接入受控分页器（:pagination + @change + row-key）
- [x] 搜索重置回第一页
- [ ] 验证翻页/改每页条数/搜索正确
- **状态：** in_progress

### 阶段 9：后台管理端对接
- [x] 商品/分类/标签 CRUD 对接（路径 /api/admin/** + 统一驼峰契约）
- [x] 订单模块对接（列表 4 tab 后端分页 + 状态数字 code + 日期筛选）
- [x] 公共时间选择器组件 date-range-select.vue（订单/发货复用，售后待接）
- [ ] 库存预警、售后、工作台（dashboard/shops/upload）对接
- **状态：** in_progress

## 关键问题

1. 生产 nginx 的 gzip/缓存优化是否要做？（需用户改宝塔 nginx 配置并 reload）

## 已做决策

| 决策 | 理由 |
|------|------|
| 前端上传压缩（1200px/0.8）而非后端 sharp | 不动后端、风险低、全站受益 |
| 列表缩略图统一换原生 `<img v-lazy>` | antd a-image 不透传 loading |
| 全局 v-lazy 指令（IntersectionObserver 单例） | 一次封装，全站复用 |
| manualChunks 拆 vue/antd | 长期缓存 |
| 删 vue-ueditor-wrap | 全项目零使用，纯死代码 |
| 放弃「antd 样式按需」 | stepin 用 AntdvLessPlugin 动态主题，删 antd.variable.less 破坏换肤 |
| 放弃「图片挪出 public」 | 生产 nginx 反代 /image 到后端，dist 图片拷贝本就无人访问，迁移收益≈0、代价大 |

## 遇到的错误

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| dev 环境 /image/upload 404（迁移后） | 1 | 回退迁移，图片保留在 public/image |

## 备注
- 随着工作推进，将阶段状态从 `pending` 更新为 `in_progress`，再更新为 `complete`。
- 做重大决策前，重新读取目标和下一步。
- 及时记录错误，避免重复失败的方法。
