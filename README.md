# 电商后台管理系统

基于 Vue 3、Vite 和 Ant Design Vue 的中后台管理项目，后端使用 Express 与 SQL.js（SQLite）。

## 主要功能

- 动态主题与多页签
- ABAC / RBAC 权限控制
- 常用业务组件和页面模板
- Swagger API 文档

## 环境要求

- Node.js `>= 16.14.0`
- Yarn `>= 1.21.1`

## 启动项目

```sh
npm install
npm run dev
```

启动后访问：http://127.0.0.1:5173

## 打包部署

```sh
npm run build
```

- 产物在 `dist/` 目录
- 打包前先改 `.env` 里的 `VITE_API_BASE_URL` 为空值（同源相对路径，由 Nginx 反代 `/api`；`VITE_` 变量是构建时打进产物的，改完必须重新打包）
- **上传时排除 `.env`**：本地这份含真实 `JWT_SECRET` 和 `ALLOW_TEMPLATE_WRITE=1`，绝不能上服务器（`build` 时仍需要它，所以是「build 完再排除/删掉」）。云上单独新建一份 `.env`，只放 `JWT_SECRET=<新随机串>` 和 `PORT=3000`


