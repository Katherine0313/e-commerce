# 电商后端 API 文档

## 基础信息

- 基础 URL: `http://localhost:3000`
- 数据格式: JSON
- 字符编码: UTF-8

---

## 授权认证

### 认证方式

本 API 使用 JWT (JSON Web Token) 进行身份认证。

### 获取 Token

#### 登录

```http
POST /api/login
```

**请求体:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "管理员",
      "role": "admin"
    }
  }
}
```

**失败响应 (401):**
```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

### 使用 Token

在需要认证的接口中，需要在请求头中添加 `Authorization` 字段：

```
Authorization: Bearer <your_token>
```

### 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| user | user123 | 普通用户 |

---

## 认证接口

### 用户登录
```http
POST /api/login
```
*无需认证*

### 获取当前用户信息
```http
GET /api/user/info
```
*需要认证*

**响应:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### 登出
```http
POST /api/logout
```
*需要认证*

**响应:**
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

## 商品接口

### 获取商品列表
```http
GET /api/products
```
*无需认证*

**查询参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | integer | 否 | 分类筛选 |
| search | string | 否 | 搜索关键词 |

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "iPhone 15 Pro",
      "price": 9999,
      "description": "最新款苹果手机",
      "category_id": 101,
      "stock": 100,
      "image": "https://images.unsplash.com/..."
    }
  ]
}
```

### 获取单个商品详情
```http
GET /api/products/:id
```
*无需认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 商品 ID |

### 获取商品分类（树形）
```http
GET /api/categories
```
*无需认证*

**响应:**
```json
{
  "success": true,
  "data": ["手机", "电脑", "配件", "平板"]
}
```

### 获取仪表盘数据
```http
GET /api/products/dashboard
```
*需要认证*

**响应:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 4,
    "totalStock": 430,
    "totalValue": 4299200,
    "products": [...]
  }
}
```

### 创建商品
```http
POST /api/products
```
*需要认证*

**请求体:**
```json
{
  "name": "商品名称",
  "price": 999,
  "description": "商品描述",
  "category_id": 1,
  "stock": 100,
  "image": "图片链接"
}
```

### 更新商品
```http
PUT /api/products/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 商品 ID |

**请求体:** 同创建商品

### 删除商品
```http
DELETE /api/products/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 商品 ID |

---

## 上传接口

### 图片上传
```http
POST /api/upload
```
*需要认证*

**请求格式:** `multipart/form-data`

**表单字段:**
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 图片文件 |

**响应:**
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:3000/uploads/xxx.jpg",
    "filename": "xxx.jpg"
  }
}
```

---

## 错误响应

所有错误响应格式统一为：

```json
{
  "success": false,
  "message": "错误描述"
}
```

**常见错误状态码:**

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权或 Token 无效 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 标签接口

### 获取标签列表
```http
GET /api/tags
```
*无需认证*

**Query参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 标签类型筛选 |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "热销",
      "code": "hot",
      "type": "custom",
      "color": "#ff4d4f",
      "icon": "fire",
      "description": "热销商品",
      "sort_order": 1,
      "status": 1,
      "product_count": 5,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**失败响应 (500):**
```json
{
  "success": false,
  "message": "服务器内部错误"
}
```

---

### 获取单个标签
```http
GET /api/tags/:id
```
*无需认证*

**Path参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 标签 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "热销",
    "code": "hot",
    "type": "custom",
    "color": "#ff4d4f",
    "icon": "fire",
    "description": "热销商品",
    "sort_order": 1,
    "status": 1,
    "product_count": 5,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "标签不存在"
}
```

---

### 创建标签
```http
POST /api/tags
```
*需要认证*

**请求体:**
```json
{
  "name": "新品",
  "code": "new",
  "type": "custom",
  "color": "#52c41a",
  "icon": "star",
  "description": "新品上市",
  "sort_order": 1,
  "status": 1
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 标签名称 |
| code | string | 否 | 标签编码（唯一） |
| type | string | 否 | 标签类型，默认 custom |
| color | string | 否 | 标签颜色，默认 #1890ff |
| icon | string | 否 | 标签图标 |
| description | string | 否 | 标签描述 |
| sort_order | integer | 否 | 排序序号 |
| status | integer | 否 | 状态，1=启用，0=禁用 |

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "新品",
    "code": "new",
    "type": "custom",
    "color": "#52c41a",
    "icon": "star",
    "description": "新品上市",
    "sort_order": 1,
    "status": 1,
    "product_count": 0,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**失败响应 (400):**
```json
{
  "success": false,
  "message": "标签名称不能为空"
}
```

---

### 更新标签
```http
PUT /api/tags/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 标签 ID |

**请求体:** 同创建标签（所有字段可选）

**成功响应 (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "标签不存在"
}
```

---

### 删除标签
```http
DELETE /api/tags/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 标签 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "message": "删除成功"
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "标签不存在"
}
```

---

### 获取商品的所有标签
```http
GET /api/products/:productId/tags
```
*无需认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "热销",
      "code": "hot",
      "type": "custom",
      "color": "#ff4d4f",
      "icon": "fire",
      "description": "热销商品",
      "sort_order": 1,
      "status": 1,
      "product_count": 5,
      "created_at": "2024-01-01T00:00:00.000Z",
      "product_sort_order": 0,
      "bound_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 给商品绑定标签
```http
POST /api/products/:productId/tags
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |

**请求体:**
```json
{
  "tagIds": [1, 2, 3]
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tagIds | array | 是 | 标签 ID 数组 |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "热销", ... },
    { "id": 2, "name": "新品", ... },
    { "id": 3, "name": "推荐", ... }
  ]
}
```

**失败响应 (400):**
```json
{
  "success": false,
  "message": "tagIds 必须是非空数组"
}
```

---

### 解绑商品标签
```http
DELETE /api/products/:productId/tags/:tagId
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |
| tagId | integer | 是 | 标签 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "message": "解绑成功"
}
```

---

## 参数接口

### 获取参数组列表（带组内参数）
```http
GET /api/parameters/groups
```
*无需认证*

**Query参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | integer | 否 | 分类 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category_id": 1,
      "name": "基本信息",
      "code": "basic",
      "sort_order": 1,
      "description": "商品基本信息",
      "status": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "parameters": [
        {
          "id": 1,
          "group_id": 1,
          "name": "颜色",
          "code": "color",
          "type": "select",
          "input_type": "select",
          "options": [
            { "value": "black", "label": "黑色" },
            { "value": "white", "label": "白色" },
            { "value": "gold", "label": "金色" }
          ],
          "is_required": 1,
          "is_sku": 1,
          "is_filterable": 1,
          "is_searchable": 0,
          "is_visible": 1,
          "sort_order": 1
        }
      ]
    }
  ]
}
```

---

### 获取单个参数组
```http
GET /api/parameters/groups/:id
```
*无需认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 参数组 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "category_id": 1,
    "name": "基本信息",
    "code": "basic",
    "sort_order": 1,
    "description": "商品基本信息",
    "status": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "parameters": [ ... ]
  }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "参数组不存在"
}
```

---

### 创建参数组
```http
POST /api/parameters/groups
```
*需要认证*

**请求体:**
```json
{
  "category_id": 1,
  "name": "规格参数",
  "code": "specs",
  "sort_order": 2,
  "description": "商品规格参数",
  "status": 1
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | integer | 否 | 所属分类 ID |
| name | string | 是 | 参数组名称 |
| code | string | 否 | 参数组编码 |
| sort_order | integer | 否 | 排序序号 |
| description | string | 否 | 参数组描述 |
| status | integer | 否 | 状态，1=启用，0=禁用 |

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "category_id": 1,
    "name": "规格参数",
    "code": "specs",
    "sort_order": 2,
    "description": "商品规格参数",
    "status": 1,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**失败响应 (400):**
```json
{
  "success": false,
  "message": "参数组名称不能为空"
}
```

---

### 更新参数组
```http
PUT /api/parameters/groups/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 参数组 ID |

**请求体:** 同创建参数组（所有字段可选）

**成功响应 (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "参数组不存在"
}
```

---

### 删除参数组（级联删参数）
```http
DELETE /api/parameters/groups/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 参数组 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "message": "删除成功（已级联删除关联参数）"
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "参数组不存在"
}
```

---

### 获取参数项列表
```http
GET /api/parameters
```
*无需认证*

**Query参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| group_id | integer | 否 | 参数组 ID |
| category_id | integer | 否 | 分类 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "group_id": 1,
      "category_id": 1,
      "name": "颜色",
      "code": "color",
      "type": "select",
      "input_type": "select",
      "options": [
        { "value": "black", "label": "黑色" },
        { "value": "white", "label": "白色" }
      ],
      "unit": null,
      "default_value": null,
      "placeholder": "请选择颜色",
      "is_required": 1,
      "is_sku": 1,
      "is_filterable": 1,
      "is_searchable": 0,
      "is_visible": 1,
      "sort_order": 1,
      "description": null,
      "status": 1
    }
  ]
}
```

---

### 获取单个参数项
```http
GET /api/parameters/:id
```
*无需认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 参数项 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "参数项不存在"
}
```

---

### 创建参数项
```http
POST /api/parameters
```
*需要认证*

**请求体:**
```json
{
  "group_id": 1,
  "category_id": 1,
  "name": "内存",
  "code": "memory",
  "type": "select",
  "input_type": "select",
  "options": [
    { "value": "8gb", "label": "8GB" },
    { "value": "16gb", "label": "16GB" },
    { "value": "32gb", "label": "32GB" }
  ],
  "unit": "GB",
  "default_value": "8gb",
  "placeholder": "请选择内存",
  "is_required": 1,
  "is_sku": 1,
  "is_filterable": 1,
  "is_searchable": 1,
  "is_visible": 1,
  "sort_order": 2,
  "description": "手机运行内存",
  "status": 1
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| group_id | integer | 否 | 所属参数组 ID |
| category_id | integer | 否 | 所属分类 ID |
| name | string | 是 | 参数名称 |
| code | string | 否 | 参数编码 |
| type | string | 否 | 类型：text/number/select/multiselect/boolean/date，默认 text |
| input_type | string | 否 | 输入类型：text/select/radio/checkbox，默认 text |
| options | array | 否 | 选项列表（用于 select 类型） |
| unit | string | 否 | 单位 |
| default_value | string | 否 | 默认值 |
| placeholder | string | 否 | 占位提示 |
| is_required | boolean | 否 | 是否必填，默认 false |
| is_sku | boolean | 否 | 是否参与 SKU 生成，默认 false |
| is_filterable | boolean | 否 | 是否可筛选，默认 false |
| is_searchable | boolean | 否 | 是否可搜索，默认 false |
| is_visible | boolean | 否 | 是否可见，默认 true |
| sort_order | integer | 否 | 排序序号 |
| description | string | 否 | 参数描述 |
| status | integer | 否 | 状态，1=启用，0=禁用 |

**成功响应 (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应 (400):**
```json
{
  "success": false,
  "message": "参数名称不能为空"
}
```

---

### 更新参数项
```http
PUT /api/parameters/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 参数项 ID |

**请求体:** 同创建参数项（所有字段可选）

**成功响应 (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "参数项不存在"
}
```

---

### 删除参数项
```http
DELETE /api/parameters/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 参数项 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "message": "删除成功"
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "参数项不存在"
}
```

---

### 获取商品的所有参数值
```http
GET /api/products/:productId/parameters
```
*无需认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": "1",
      "parameter_id": 1,
      "value": "black",
      "numeric_value": null,
      "sort_order": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": null,
      "parameter_name": "颜色",
      "parameter_code": "color",
      "parameter_type": "select",
      "input_type": "select",
      "options": [
        { "value": "black", "label": "黑色" },
        { "value": "white", "label": "白色" }
      ],
      "unit": null,
      "is_sku": 1
    }
  ]
}
```

---

### 批量设置商品参数值
```http
POST /api/products/:productId/parameters
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |

**请求体:**
```json
{
  "values": [
    { "parameter_id": 1, "value": "black" },
    { "parameter_id": 2, "value": "256gb", "numeric_value": 256 }
  ]
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| values | array | 是 | 参数值数组 |
| values[].parameter_id | integer | 是 | 参数项 ID |
| values[].value | string | 是 | 参数值 |
| values[].numeric_value | number | 否 | 数值（用于 number 类型） |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    { "parameter_id": 1, "value": "black", ... },
    { "parameter_id": 2, "value": "256gb", "numeric_value": 256, ... }
  ]
}
```

**失败响应 (400):**
```json
{
  "success": false,
  "message": "values 必须是非空数组"
}
```

---

### 删除商品参数值
```http
DELETE /api/products/:productId/parameters/:parameterId
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |
| parameterId | integer | 是 | 参数项 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## SKU接口

### 获取商品的所有SKU
```http
GET /api/products/:productId/skus
```
*无需认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "product_id": "1",
      "sku_code": "IPHONE15-BLACK-256GB",
      "barcode": "1234567890123",
      "name": "iPhone 15 Pro 黑色 256GB",
      "image": "http://localhost:3000/uploads/xxx.jpg",
      "images": [],
      "price": 9999,
      "original_price": 10999,
      "cost_price": 8000,
      "stock": 100,
      "stock_warning": 10,
      "stock_locked": 0,
      "weight": 0.2,
      "volume": null,
      "sales_count": 50,
      "status": 1,
      "sort_order": 0,
      "combination_key": "1:black:2:256gb",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "parameter_values": [
        {
          "id": 1,
          "sku_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "parameter_id": 1,
          "value": "black",
          "value_code": "black",
          "parameter_name": "颜色",
          "parameter_code": "color",
          "parameter_type": "select"
        },
        {
          "id": 2,
          "sku_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "parameter_id": 2,
          "value": "256gb",
          "value_code": "256gb",
          "parameter_name": "内存",
          "parameter_code": "memory",
          "parameter_type": "select"
        }
      ]
    }
  ]
}
```

---

### 获取单个SKU
```http
GET /api/skus/:id
```
*无需认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | SKU ID (UUID) |

**成功响应 (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "SKU不存在"
}
```

---

### 创建单个SKU
```http
POST /api/products/:productId/skus
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |

**请求体:**
```json
{
  "sku_code": "IPHONE15-BLACK-256GB",
  "barcode": "1234567890123",
  "name": "iPhone 15 Pro 黑色 256GB",
  "image": "http://localhost:3000/uploads/xxx.jpg",
  "images": [],
  "price": 9999,
  "original_price": 10999,
  "cost_price": 8000,
  "stock": 100,
  "stock_warning": 10,
  "weight": 0.2,
  "volume": null,
  "status": 1,
  "sort_order": 0,
  "parameter_values": [
    { "parameter_id": 1, "value": "black", "value_code": "black" },
    { "parameter_id": 2, "value": "256gb", "value_code": "256gb" }
  ]
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sku_code | string | 否 | SKU编码（唯一） |
| barcode | string | 否 | 条形码 |
| name | string | 否 | SKU名称 |
| image | string | 否 | 主图 |
| images | array | 否 | 图片列表 |
| price | number | 否 | 售价 |
| original_price | number | 否 | 原价 |
| cost_price | number | 否 | 成本价 |
| stock | integer | 否 | 库存 |
| stock_warning | integer | 否 | 库存预警值 |
| weight | number | 否 | 重量(kg) |
| volume | number | 否 | 体积(m³) |
| status | integer | 否 | 状态，1=启用，0=禁用 |
| sort_order | integer | 否 | 排序序号 |
| parameter_values | array | 否 | 参数值列表 |

**成功响应 (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "商品不存在"
}
```

---

### 批量生成SKU（笛卡尔积）
```http
POST /api/products/:productId/skus/batch
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |

**请求体:**
```json
{
  "attributes": [
    {
      "parameter_id": 1,
      "values": [
        { "value": "黑色", "value_code": "black" },
        { "value": "白色", "value_code": "white" }
      ]
    },
    {
      "parameter_id": 2,
      "values": [
        { "value": "128GB", "value_code": "128gb" },
        { "value": "256GB", "value_code": "256gb" },
        { "value": "512GB", "value_code": "512gb" }
      ]
    }
  ],
  "default_price": 9999,
  "default_stock": 100
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| attributes | array | 是 | 属性列表 |
| attributes[].parameter_id | integer | 是 | 参数项 ID |
| attributes[].values | array | 是 | 参数值列表 |
| attributes[].values[].value | string | 是 | 显示值 |
| attributes[].values[].value_code | string | 是 | 编码值 |
| default_price | number | 否 | 默认售价 |
| default_stock | integer | 否 | 默认库存 |

**成功响应 (200):**
```json
{
  "success": true,
  "data": [
    { "id": "...", "combination_key": "1:black:2:128gb", "price": 9999, "stock": 100, ... },
    { "id": "...", "combination_key": "1:black:2:256gb", "price": 9999, "stock": 100, ... },
    { "id": "...", "combination_key": "1:black:2:512gb", "price": 9999, "stock": 100, ... },
    { "id": "...", "combination_key": "1:white:2:128gb", "price": 9999, "stock": 100, ... },
    { "id": "...", "combination_key": "1:white:2:256gb", "price": 9999, "stock": 100, ... },
    { "id": "...", "combination_key": "1:white:2:512gb", "price": 9999, "stock": 100, ... }
  ],
  "count": 6
}
```

**笛卡尔积计算说明:**
```
输入:
  colors = [黑色, 白色]
  sizes = [128GB, 256GB, 512GB]

笛卡尔积结果:
  黑色 × 128GB
  黑色 × 256GB
  黑色 × 512GB
  白色 × 128GB
  白色 × 256GB
  白色 × 512GB

总计: 2 × 3 = 6 个 SKU
```

---

### 更新SKU
```http
PUT /api/skus/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | SKU ID (UUID) |

**请求体:** 同创建SKU（所有字段可选）

**成功响应 (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "SKU不存在"
}
```

---

### 删除SKU
```http
DELETE /api/skus/:id
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | SKU ID (UUID) |

**成功响应 (200):**
```json
{
  "success": true,
  "message": "删除成功"
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "SKU不存在"
}
```

---

### 调整库存
```http
POST /api/skus/:id/stock
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | SKU ID (UUID) |

**请求体:**
```json
{
  "delta": -1,
  "reason": "sale"
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| delta | integer | 是 | 库存变化量，正数增加，负数减少 |
| reason | string | 否 | 变更原因：sale(销售)/return(退货)/adjust(调整)/replenish(补货) |

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "stock": 99,
    "sales_count": 51,
    ...
  }
}
```

**失败响应 (400):**
```json
{
  "success": false,
  "message": "delta 不能为空"
}
```

---

### 同步SKU
```http
POST /api/products/:productId/skus/sync
```
*需要认证*

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | string | 是 | 商品 ID |

**说明:** 重新生成SKU，基于当前商品已设置的 is_sku=1 的参数值，自动计算笛卡尔积，删除旧SKU并创建新的。

**成功响应 (200):**
```json
{
  "success": true,
  "data": [...],
  "count": 6
}
```

**失败响应 (404):**
```json
{
  "success": false,
  "message": "商品不存在"
}
```

---

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"  // 可选
}
```

### 失败响应
```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"  // 可选
}
```

---

## 错误码表

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| INVALID_PARAMS | 400 | 请求参数错误 |
| UNAUTHORIZED | 401 | 未登录或token无效 |
| FORBIDDEN | 403 | 无权限访问 |
| NOT_FOUND | 404 | 资源不存在 |
| DUPLICATE_ENTRY | 409 | 数据重复（如code唯一约束） |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 数据库迁移SQL

以下SQL脚本可用于创建所有新表，可直接在 sqlite3 中执行：

```sql
-- ========== 标签表 ==========
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  type TEXT DEFAULT 'custom',
  color TEXT DEFAULT '#1890ff',
  icon TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status INTEGER DEFAULT 1,
  product_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by INTEGER,
  updated_by INTEGER
);

-- 商品-标签关联表
CREATE TABLE IF NOT EXISTS product_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(product_id, tag_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ========== 参数组表 ==========
CREATE TABLE IF NOT EXISTS parameter_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  name TEXT NOT NULL,
  code TEXT,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  status INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- ========== 参数项表 ==========
CREATE TABLE IF NOT EXISTS parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER,
  category_id INTEGER,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT DEFAULT 'text',
  input_type TEXT DEFAULT 'text',
  options TEXT DEFAULT '[]',
  unit TEXT,
  default_value TEXT,
  placeholder TEXT,
  is_required INTEGER DEFAULT 0,
  is_sku INTEGER DEFAULT 0,
  is_filterable INTEGER DEFAULT 0,
  is_searchable INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  status INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- 商品参数值表
CREATE TABLE IF NOT EXISTS product_parameter_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  parameter_id INTEGER NOT NULL,
  value TEXT,
  numeric_value REAL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE(product_id, parameter_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE
);

-- ========== SKU表 ==========
CREATE TABLE IF NOT EXISTS product_skus (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku_code TEXT UNIQUE,
  barcode TEXT,
  name TEXT,
  image TEXT,
  images TEXT DEFAULT '[]',
  price REAL DEFAULT 0,
  original_price REAL,
  cost_price REAL,
  stock INTEGER DEFAULT 0,
  stock_warning INTEGER DEFAULT 10,
  stock_locked INTEGER DEFAULT 0,
  weight REAL,
  volume REAL,
  sales_count INTEGER DEFAULT 0,
  status INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  combination_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE(product_id, combination_key),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- SKU参数值表
CREATE TABLE IF NOT EXISTS sku_parameter_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_id TEXT NOT NULL,
  parameter_id INTEGER NOT NULL,
  value TEXT,
  value_code TEXT,
  UNIQUE(sku_id, parameter_id),
  FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE
);
```

---

## curl调用示例

### 1. 登录获取token
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2. 创建标签
```bash
curl -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"热销","code":"hot","color":"#ff4d4f"}'
```

### 3. 批量生成SKU
```bash
curl -X POST http://localhost:3000/api/products/1/skus/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "attributes": [
      {"parameter_id": 1, "values": [{"value": "黑色", "value_code": "black"}]},
      {"parameter_id": 2, "values": [{"value": "256GB", "value_code": "256gb"}]}
    ],
    "default_price": 9999,
    "default_stock": 100
  }'
```

### 4. 调整SKU库存
```bash
curl -X POST http://localhost:3000/api/skus/SKU_ID/stock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"delta": -1, "reason": "sale"}'
```

### 5. 给商品绑定标签
```bash
curl -X POST http://localhost:3000/api/products/1/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"tagIds": [1, 2, 3]}'
```

---

## 前端对接流程图

### 商品编辑页 → SKU生成完整流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           商品编辑页                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. 选择商品分类                                                             │
│    └─ 调用 GET /api/categories 获取分类列表                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. 加载该分类的参数组和参数项                                                │
│    └─ 调用 GET /api/parameters/groups?category_id=1                         │
│    └─ 返回参数组列表，每个组内包含参数项                                       │
│    └─ 参数项的 is_sku=1 表示该参数参与SKU生成                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. 用户勾选 is_sku=1 的参数，并填写/选择参数值                                │
│    └─ 例如：颜色=[黑色,白色]，内存=[128GB,256GB,512GB]                       │
│    └─ 前端计算笛卡尔积预览：2×3=6 个SKU组合                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. 调用批量生成SKU接口                                                      │
│    └─ POST /api/products/:productId/skus/batch                              │
│    └─ 请求体：attributes + default_price + default_stock                     │
│    └─ 后端计算笛卡尔积，生成SKU列表                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. 返回的SKU列表渲染到表格                                                  │
│    └─ 表格列：SKU编码 | 规格组合 | 价格 | 库存 | 操作                         │
│    └─ 用户可逐个编辑价格和库存                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. 调用PUT接口逐个保存SKU                                                   │
│    └─ PUT /api/skus/:skuId                                                  │
│    └─ 更新 price, stock, sku_code 等字段                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 完成！商品SKU配置完毕                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 时序图（简化版）

```
前端                    后端API                    数据库
 │                        │                        │
 │──GET /api/categories──>│                        │
 │<──────分类列表────────────│                        │
 │                        │                        │
 │──GET /parameters/groups──>│                        │
 │<──参数组+参数项列表──────│                        │
 │                        │                        │
 │──POST /products/:id/parameters──>│               │
 │<──────参数值设置完成────│                        │
 │                        │                        │
 │──POST /products/:id/skus/batch──>│                │
 │<──────SKU列表创建完成────│                        │
 │                        │                        │
 │──PUT /skus/:skuId───────>│                        │
 │<──────SKU更新完成────────│                        │
 │                        │                        │
```

---

## 参数类型说明

| type | input_type | 说明 | options示例 |
|------|------------|------|-------------|
| text | text | 文本输入 | - |
| number | text | 数字输入 | - |
| number | range | 数字范围 | - |
| select | select | 下拉选择 | [{value:"a",label:"选项A"}] |
| select | radio | 单选按钮 | [{value:"a",label:"选项A"}] |
| multiselect | checkbox | 多选 | [{value:"a",label:"选项A"}] |
| boolean | switch | 开关 | - |
| date | date | 日期选择 | - |

---

## 字段命名规范

| 字段 | 类型 | 说明 |
|------|------|------|
| created_at | ISO8601 | 创建时间 |
| updated_at | ISO8601 | 更新时间 |
| sort_order | integer | 排序序号（越小越靠前） |
| status | integer | 状态（1=启用，0=禁用） |
| is_xxx | integer | 布尔字段（1=是，0=否） |

