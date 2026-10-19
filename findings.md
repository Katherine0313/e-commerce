# 发现与决策

## 需求
- 商品列表页、详情页图片多，打开卡顿、「卡成马赛克」，需要做图片性能优化。

## 研究发现
- 列表 `src/pages/goods/list/List.vue:28` 用 `<a-image :src="record.image" :width="80">` 显示 80px 缩略图，`src` 却是原图 URL。
- 后端 `server/middleware/upload.js` 用 multer 原样保存文件：无大小限制、无压缩、无缩略图；白名单还放行了 `.bmp`、`.mp4` 等大文件。
- 详情 `Mall.vue` 用 `v-html="product.body"` 渲染富文本，body 内常嵌几十张原图，打开弹窗全量加载。
- 上传接口返回 `/image/upload/{filename}` 或 `/image/body/{filename}`（相对路径）；后端 `server/index.js` 将 `/image/*` 映射到 `public/image/*` 静态目录。
- ant-design-vue 的 `a-image` 组件 `inheritAttrs: false`，且显式透传的属性列表里没有 `loading`，所以 `loading="lazy"` 不生效，列表图不能直接靠 a-image 懒加载。
- wangeditor `uploadImage` 的 `customUpload` 签名为 `(file: File, insertFn: (url, alt, href) => void) => void`。
- `src/utils/file.js` 的 `getBase64` 已被 `AuthorTable.vue`、`ProjectTable.vue` 复用，前端引入 `file.js` 安全（`fs`/`path` 仅构建期脚本使用，会被 tree-shake）。
- 项目 axios 实例 `@/api/request.js` 已设置 `baseURL` 并在拦截器自动加 `Authorization`，上传无需手动带 token。
- 用户实测性能数据（Network 面板）：DOM 骨架 3.76s；商品缩略图一次性全量请求，超出浏览器同源并发上限 6 个，排队 11~13s，Load 事件定格 7.03s。核心瓶颈是「缩略图无懒加载 + 全量并发请求」。
- 构建产物体积（`dist/assets` 实量）：主入口 `index.js` 1.9MB、工作台 `Workplace.js` 1.1MB、`SalesInfo.js` 800KB，而商品列表 `List.js` 仅 32KB——说明主入口全量引了重依赖，且列表静态引了编辑弹窗链。
- `vue-ueditor-wrap` 全项目零使用（仅 main.js 注册），是纯死代码，白白占主入口体积。
- `main.js` 全量 `import stepin from 'stepin/es'` + 全量 `ant-design-vue/dist/antd.variable.less`，是主入口 1.9MB 的主要来源。
- 生产 nginx（宝塔）：`/image/upload`、`/image/body` 已反代到后端、HTTP/2 已开启；但未开 gzip、js/css 缓存仅 12h、上传图无浏览器缓存。
- 商品列表接口无分页：`productDB.getAll` 已算 `total`（注释写"分页用"）但未加 `LIMIT/OFFSET`，一次性查全部商品返回大 JSON；前端 `List.vue` 的 `onActivated` 每次切页全量拉取，是菜单切换 3 秒卡顿的主因（与图片懒加载是两回事）。

## 技术决策
| 决策 | 理由 |
|------|------|
| 前端压缩最长边 1200px、质量 0.8 | 商品图/详情图足够清晰，2~5MB 原图 → 100~200KB |
| gif 动图跳过压缩 | canvas 会把 gif 压成静态图，需跳过 |
| 原图边长 ≤1200px 时不压缩 | 避免对小图做无谓的重新编码 |
| 压缩失败兜底返回原图 | 保证上传流程不被中断 |
| 统一转 jpeg | 商品图/详情图均为照片，jpeg 压缩率最佳 |
| 复用 `file.js` 的 `getBase64` | 优先复用已有函数，不重复造轮子 |
| 列表缩略图统一换原生 `<img v-lazy>` | a-image 不透传 loading，原生懒加载最简可靠 |
| 全局 `v-lazy` 指令（IntersectionObserver 单例） | 一次封装、全站 14 个文件复用，滚动进视口才加载 |
| 删 `vue-ueditor-wrap` | 全项目零使用，纯死代码 |
| `manualChunks` 拆 vue/antd 独立 chunk | 依赖 chunk hash 稳定，长期缓存，业务改动不重下大包 |
| 放弃「antd 样式按需」 | stepin 用 `AntdvLessPlugin`（动态主题）+ `antd.variable.less` 实现运行时换主题，删全量 less 会破坏换肤，只能靠缓存而非减体积 |
| 放弃「上传图挪出 public」 | 生产 nginx 反代 /image 到后端，dist 图片拷贝本就无人访问；迁移收益≈0，且引入 dev 404、生产迁移成本 |

## 后台管理端对接（2026-10-19）

### 统一驼峰契约
- 后端 Java VO 驼峰，前端字段从旧 Node 的 snake_case 改成 camelCase，前后端 + C 端（小程序）三套对齐，不用 @JsonNaming 翻译层。
- 后台接口路径走 `/api/admin/**`（JwtInterceptor 按此分流 admin 身份）。

### 分页策略（按模块）
- 商品列表：后端真分页（page/pageSize → PageVO{list,total}），前端受控分页器。
- 订单列表：4 个状态 tab 独立请求后端分页（status + page），不做前端 filter。
- 发货页：3 个状态 tab 全量（status 筛选 + pageSize 给足），订单量少不分页。

### 状态契约
- 订单状态从旧 Node 字符串（pending_pay）改为数字 code（1-6），前端 filter/tag 用数字；后端 OrderStatusEnum 提供 adminDescMap()/colorMap()。

### 时间字段
- 后端 LocalDateTime 加 @JsonFormat(pattern="yyyy-MM-dd HH:mm:ss")，避免 ISO 格式（T 分隔）前端不好读。

### 公共组件
- date-range-select.vue：时间字段下拉（下单/支付/发货时间）+ 日期范围，change 吐 {dateField,startDate,endDate}，reset() 供刷新清空；订单/发货/售后复用。

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 列表缩略图加载原图 | 上传时前端压缩原图 |
| 详情富文本全量加载原图 | 给每个 `<img>` 补 `loading="lazy"` |
| 富文本 `server` 直传无法做上传前压缩 | 改 `customUpload` 手动压缩后再上传 |

## 资源
- 后端上传：`server/middleware/upload.js`、`server/controllers/uploadController.js`、`server/routes/uploadRoutes.js`
- 上传接口：`POST /api/upload`（商品主图）、`POST /api/upload?type=body`（详情图）
- 前端上传入口：`AddGoods.vue`、`EditModal.vue`（a-upload）、`Editor.vue`（wangeditor uploadImage）

## 视觉/浏览器发现

每完成两次查看、浏览器或搜索操作，就更新本节。
将图片、PDF、截图等多模态发现立即转述为文本，以免上下文丢失。

- （本次任务未进行浏览器/截图操作）

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
