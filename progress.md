# 进度日志

## 会话：2026-10-12

### 当前状态
- **阶段：** 7 - 测试与验证（in_progress）
- **开始时间：** 2026-10-12

### 已执行操作
- 排查图片卡顿根因：列表 80px 缩略图加载原图、后端上传无压缩、详情富文本全量加载原图。
- 确定方案：详情懒加载 + 前端上传压缩（方案 A，不动后端）。
- 新建 `src/utils/compressImage.js`（canvas 压缩，最长边 1200px、质量 0.8、gif/小图跳过、失败兜底）。
- `AddGoods.vue` 主图 `a-upload` 加 `:before-upload="compressImage"`。
- `EditModal.vue` 主图 `a-upload` 加 `:before-upload="compressImage"`。
- `Editor.vue` 富文本上传从 `server` 直传改为 `customUpload`（先压缩再上传，沿用 axios 自动带 token）。
- `Mall.vue` 详情富文本每个 `<img>` 补 `loading="lazy"`。

### 全站性能优化（会话续）
- 新建全局 `v-lazy` 懒加载指令（IntersectionObserver 单例 + 占位图）。
- `main.js` 删除 `vue-ueditor-wrap` 死代码（零使用），注册 `v-lazy` 指令。
- 批量把 14 个文件、16 处列表缩略图从 `<a-image>`/`<img>` 改为 `<img v-lazy>`（商品列表、库存、分类关联、标签、订单、售后、工作台）。
- `vite.config.js` 加 `manualChunks`，拆 vue/antd 独立 chunk。

### 图片目录迁移（public → uploads）
- `server/middleware/upload.js`：上传目录改 `uploads/upload`、`uploads/body`。
- `server/index.js`：静态 serve 改 `uploads/`。
- `server/sqlite/shopDB.js`：`PUBLIC_IMAGE_DIR` 改 `UPLOAD_DIR`（含删店铺时删磁盘文件的逻辑）。
- 迁移 101 张上传图（upload 33 + body 68）到 `uploads/`，保留 public/image 下 3 张静态图（QRcode/store-logo/price-background）。
- `.gitignore` 加 `uploads/`。

> ⚠️ 上述「图片目录迁移」已整体回退：因生产 nginx 反代 /image 到后端、dist 图片拷贝无人访问，迁移对页面性能无实质帮助，且引入 dev 环境 404。已恢复为图片存 public/image，后端 serve 路径、dev proxy、gitignore 全部还原。

### nginx 优化 + UI 调整 + 上线（会话续 2）
- 分析生产 nginx：确认 `/image/upload`、`/image/body` 已反代到后端、HTTP/2 已开、缺 gzip、js/css 缓存仅 12h。
- 生成 `nginx-optimization.md`（完整 www server 块：gzip + js/css immutable + 图片缓存）。
- `Mall.vue` 购物车弹窗按钮高度 20px → 40px（修复按钮被裁切）。
- `Cart.vue`、`Settlement.vue` 支付/继续购物/返回/提交订单 4 个按钮统一 120×40、左右并排居中（.btn-row）。
- 用户已打包上线。

### 创建/修改的文件
- 新建：`src/utils/compressImage.js`
- 修改：`src/pages/goods/add-goods/AddGoods.vue`
- 修改：`src/pages/goods/list/EditModal.vue`
- 修改：`src/pages/goods/add-goods/Editor.vue`
- 修改：`src/pages/goods/list/Mall.vue`

### 测试结果
| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 上传大图后体积 | 压缩到 ≤1200px、100~200KB | 待验证 | pending |
| 详情富文本懒加载 | 首屏只加载可见图片 | 待验证 | pending |

### 错误
| 错误 | 解决方案 |
|------|---------|
| （暂无） | |

## 会话：2026-10-13

### 当前状态
- **阶段：** 商品列表后端分页（代码完成，待验证）

### 已执行操作
- 复核豆包性能分析，确认「商品列表接口无分页」是菜单切换 3 秒卡顿的元凶（图片/富文本懒加载、manualChunks 上一轮已完成）。
- 后端真分页：`productDB.getAll` 加 `LIMIT/OFFSET`（pageSize>0 才分页，兼容旧调用）、`productController.getProducts` 透传 page/pageSize。
- 前端 `List.vue` 接入受控分页器（:pagination + @change + row-key），loadData 携带分页参数，搜索重置回第一页。

### 创建/修改的文件
- 修改：`server/sqlite/productDB.js`
- 修改：`server/controllers/productController.js`
- 修改：`src/pages/goods/list/List.vue`

### 测试结果
| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 商品列表接口分页 | 只返回当前页 13 条 + total | 待验证 | pending |

### 错误
| 错误 | 解决方案 |
|------|---------|
| （暂无） | |

## 五问重启检查
| 问题 | 答案 |
|------|------|
| 我在哪里？ | 阶段 7 - 测试与验证 |
| 我要去哪里？ | 阶段 5 - 交付 |
| 目标是什么？ | 解决列表/详情图片卡顿，降低图片体积与首屏加载量 |
| 我学到了什么？ | 见 findings.md |
| 我做了什么？ | 见上方「已执行操作」 |

---
*每个阶段完成后或遇到错误时更新此文件*
