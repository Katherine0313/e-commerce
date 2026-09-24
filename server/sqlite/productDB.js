// ==================== 商品 CRUD（增删改查） ====================
// 这个文件是 Model 层，只跟数据库打交道，不关心请求从哪来、结果往哪去
const { getDB, saveDatabase } = require('./connection');  // 获取数据库连接 + 保存到文件
const { getNow, nextIdInShop, formatDates, requireShopId } = require('./utils');  // 工具函数：当前时间、生成店铺号段内自增ID、时间格式化、店铺守卫
const { validateProduct } = require('../util/validator');   // 商品数据校验

const ProductDB = {

  // ==================== 查：获取商品列表（支持搜索 + 分类筛选） ====================
  getAll: (filters = {}, shopId) => {
    requireShopId(shopId);  // shopId 缺失直接抛错，不允许退化成全表查询
    const db = getDB();  // 拿到数据库连接

    // 1. 拼 SQL：销售字段已合并进 products，一次查出所有字段
    //    shop_id 是本店铺的硬性过滤条件，作为第一个占位符，params 里也必须排第一
    let sql = `SELECT p.*
    FROM products p
    WHERE p.shop_id = ?`;
    const params = [shopId];  // 存放 SQL 参数，防止注入

    // 2. 分类筛选：用递归 CTE 查出父分类下的所有子分类
    if (filters.categoryId) {
      // 递归部分也限定本店铺：分类 id 虽然全局唯一，显式带上 shop_id 更稳妥
      sql += ` AND p.category_id IN (
        WITH RECURSIVE subtree(id) AS (
          SELECT ?                          -- 起点：传进来的分类 ID
          UNION ALL
          SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id WHERE c.shop_id = ?  -- 递归找子分类
        )
        SELECT id FROM subtree
      )`;
      params.push(filters.categoryId, shopId);
    }

    // 3. 关键词搜索：在商品名、描述、分类三个字段里模糊匹配
    if (filters.search) {
      const searchTerm = '%' + filters.search + '%';
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND c.shop_id = p.shop_id AND c.name LIKE ?))';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 4. 先查出总数（在排序前，用相同条件查 COUNT）
    const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
    const countStmt = db.prepare(countSql);
    if (params.length > 0) countStmt.bind(params);
    const total = countStmt.step() ? countStmt.getAsObject().count : 0;
    countStmt.free();  // 用完释放，防止内存泄漏

    // 5. 排序：按 ID 升序
    sql += " ORDER BY p.id ASC, p.created_at ASC";

    // 6. 执行查询，逐行取出结果
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const data = [];
    while (stmt.step()) data.push(formatDates(stmt.getAsObject()));
    stmt.free();

    return { data, total };  // 返回列表 + 总数（分页用）
  },

  // ==================== 查：根据 ID 查单个商品 ====================
  findById: (id, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    // tag_name 只取「在网店显示」开着的标签：标签页关掉开关（status=0）后商城就不该再显示
    const stmt = db.prepare(`SELECT p.*,
      (SELECT t.name FROM tags t WHERE t.id = p.tag_id AND t.shop_id = p.shop_id AND t.status = 1) as tag_name
    FROM products p
    WHERE p.id = ? AND p.shop_id = ?`);  // ? 是占位符，后面的 bind 会把真实值填进去
    stmt.bind([id, shopId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();  // 有结果，转成 JS 对象
      stmt.free();
      return formatDates(row);
    }
    stmt.free();
    return null;  // 没找到，返回 null
  },

  // ==================== 查：获取所有品牌（去重） ====================
  getBrands: (shopId) => {
    requireShopId(shopId);
    const db = getDB();
    const result = db.exec('SELECT DISTINCT brand FROM products WHERE shop_id = ? AND brand IS NOT NULL AND brand != "" ORDER BY brand', [shopId]);
    if (!result[0]) return [];
    return result[0].values.map(row => row[0]);  // 每行只有一个值，取出来拼成数组
  },

  // ==================== 查：获取分类树（嵌套结构） ====================
  getCategories: (shopId) => {
    requireShopId(shopId);
    const db = getDB();

    // 1. 查出所有分类（product_count 实时子查询，不再依赖冗余列）
    //    内层统计要带上 shop_id，否则会把别的沙箱的商品算进本店分类的计数
    const result = db.exec('SELECT id, name, parent_id, sort_order, status, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND shop_id = c.shop_id) as product_count FROM categories c WHERE c.shop_id = ? ORDER BY sort_order ASC, id ASC', [shopId]);
    if (!result[0]) return [];

    const columns = result[0].columns;
    const allCategories = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);  // 列名 → 值 组装成对象
      return obj;
    });

    // 2. 递归拼成树形结构（父分类 → 子分类 → 子子分类...）
    const buildTree = (parentId) => {
      return allCategories
        .filter(c => c.parent_id === parentId)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        .map((c, index) => {
          // sort_index：同级里的第几位（1、2、3……），由当前顺序实时算出，不落库
          // 这样删掉同级某个分类后，剩下的序号自动接上，不会断号
          const node = { id: c.id, label: c.name, sort_index: index + 1, sort_order: c.sort_order, status: c.status, product_count: c.product_count || 0 };
          if (parentId === null) node.children = buildTree(c.id);  // 顶层分类继续递归找子分类
          return node;
        });
    };

    return buildTree(null);  // 从根节点开始构建
  },

  // ==================== 查：仪表盘汇总数据 ====================
  getDashboardData: (shopId) => {
    requireShopId(shopId);
    const db = getDB();

    // 三组聚合统计（全部限定本店铺，否则会把别家的商品数/成本价算进来）
    const totalResult = db.exec('SELECT COUNT(*) as count FROM products WHERE shop_id = ?', [shopId]);
    const stockResult = db.exec('SELECT SUM(stock) as sum FROM products WHERE shop_id = ?', [shopId]);
    const valueResult = db.exec('SELECT SUM(sales_price * stock) as sum FROM products WHERE shop_id = ?', [shopId]);  // 库存总价值

    // 同时查出所有商品的详情
    const productsResult = db.exec('SELECT p.* FROM products p WHERE p.shop_id = ?', [shopId]);

    const totalProducts = totalResult[0]?.values[0][0] || 0;  // 商品总数
    const totalStock = stockResult[0]?.values[0][0] || 0;      // 总库存
    const totalValue = valueResult[0]?.values[0][0] || 0;      // 总价值

    const products = productsResult[0]?.values.map(row => {
      const columns = productsResult[0].columns;
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return formatDates(obj);
    }) || [];

    return { totalProducts, totalStock, totalValue, products };
  },

  // ==================== 增：新增商品 ====================
  create: (productData, shopId) => {
    requireShopId(shopId);
    const db = getDB();
    validateProduct(productData);  // 先校验数据合法性

    // 1. 生成 ID 和时间（id 在本店铺号段内自增，不跟沙箱/模板店混着涨）
    const id = nextIdInShop('products', shopId);
    const now = getNow();

    // 2. 处理销售信息，把字符串转成数字
    const salesPrice = parseFloat(productData.sales_price) || 0;
    const stock = parseInt(productData.stock, 10) || 0;
    const salesMode = productData.sales_mode || 'spot';          // 销售模式，默认现货
    const listingStatus = productData.listing_status !== undefined ? (productData.listing_status ? 1 : 0) : 1;  // 默认上架
    const marketPrice = productData.market_price != null ? parseFloat(productData.market_price) : null;
    const costPrice = productData.cost_price != null ? parseFloat(productData.cost_price) : null;
    const productCode = productData.product_code || null;
    const weight = productData.weight != null ? parseFloat(productData.weight) : null;
    const volume = productData.volume != null ? parseFloat(productData.volume) : null;

    // 3. 组装商品数据（基本 + 销售信息一体），没传的给默认值
    const newProduct = {
      id,
      name: (productData.name ?? '').trim() || '未命名商品',
      category_id: productData.category_id ?? null,
      description: (productData.description ?? '').trim(),
      image: productData.image ?? '',
      body: productData.body ?? '',
      created_at: now,
      brand: productData.brand ?? '',
      sub_title: (productData.sub_title ?? '').trim(),
      sales_mode: salesMode,
      listing_status: listingStatus,
      sales_price: salesPrice,
      market_price: marketPrice,
      cost_price: costPrice,
      product_code: productCode,
      stock: stock,
      weight: weight,
      volume: volume
    };

    // 4. 插入商品表（基本 + 销售信息一体）
    db.run(`INSERT INTO products (id, shop_id, name, description, category_id, image, body, created_at, brand, sub_title, sales_mode, listing_status, sales_price, market_price, cost_price, product_code, stock, weight, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newProduct.id, shopId, newProduct.name, newProduct.description,
       newProduct.category_id, newProduct.image, newProduct.body,
       newProduct.created_at, newProduct.brand, newProduct.sub_title,
       newProduct.sales_mode, newProduct.listing_status, newProduct.sales_price,
       newProduct.market_price, newProduct.cost_price, newProduct.product_code,
       newProduct.stock, newProduct.weight, newProduct.volume]);

    // 5. 刷新所属分类的 product_count
    if (newProduct.category_id) {
      db.run(`UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = categories.id AND shop_id = categories.shop_id) WHERE shop_id = ?`, [shopId]);
    }

    // 6. 保存数据库，返回刚插入的商品
    saveDatabase();
    return ProductDB.findById(id, shopId);
  },

  // ==================== 改：更新商品 ====================
  update: (id, productData, shopId) => {
    requireShopId(shopId);
    const db = getDB();

    // 1. 先查出旧数据，不存在直接返回 null（不属于本店铺的商品同样查不到）
    const existing = ProductDB.findById(id, shopId);
    if (!existing) return null;

    validateProduct(productData, true);  // true 表示更新模式，校验规则略有不同

    const now = getNow();

    // 2. 解析销售信息：传了就用新值，没传就保留旧值
    const salesPrice = productData.sales_price !== undefined ? parseFloat(productData.sales_price) : (existing.sales_price ?? 0);
    const stock = productData.stock !== undefined ? parseInt(productData.stock, 10) : (existing.stock ?? 0);
    const salesMode = productData.sales_mode !== undefined ? productData.sales_mode : (existing.sales_mode ?? 'spot');
    const listingStatus = productData.listing_status !== undefined ? (productData.listing_status ? 1 : 0) : (existing.listing_status ?? 1);
    const marketPrice = productData.market_price !== undefined ? (productData.market_price != null ? parseFloat(productData.market_price) : null) : (existing.market_price ?? null);
    const costPrice = productData.cost_price !== undefined ? (productData.cost_price != null ? parseFloat(productData.cost_price) : null) : (existing.cost_price ?? null);
    const productCode = productData.product_code !== undefined ? productData.product_code : (existing.product_code ?? null);
    const weight = productData.weight !== undefined ? (productData.weight != null ? parseFloat(productData.weight) : null) : (existing.weight ?? null);
    const volume = productData.volume !== undefined ? (productData.volume != null ? parseFloat(productData.volume) : null) : (existing.volume ?? null);

    // 3. 更新商品表（基本 + 销售信息一体）：传了就用新值，没传就保留旧值
    db.run(`UPDATE products SET name = ?, description = ?, category_id = ?, image = ?, body = ?, updated_at = ?, brand = ?, sub_title = ?, sales_mode = ?, listing_status = ?, sales_price = ?, market_price = ?, cost_price = ?, product_code = ?, stock = ?, weight = ?, volume = ? WHERE id = ? AND shop_id = ?`, [
      productData.name !== undefined ? productData.name.trim() : existing.name,
      productData.description !== undefined ? (productData.description?.trim() || '') : existing.description,
      productData.category_id !== undefined ? productData.category_id : existing.category_id,
      productData.image !== undefined ? productData.image : existing.image,
      productData.body !== undefined ? productData.body : existing.body,
      now,
      productData.brand !== undefined ? productData.brand : existing.brand,
      productData.sub_title !== undefined ? productData.sub_title.trim() : existing.sub_title,
      salesMode, listingStatus, salesPrice, marketPrice, costPrice, productCode, stock, weight, volume,
      id, shopId
    ]);

    // 4. category_id 变更时刷新分类的 product_count
    if (productData.category_id !== undefined && productData.category_id !== existing.category_id) {
      db.run(`UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = categories.id AND shop_id = categories.shop_id) WHERE shop_id = ?`, [shopId]);
    }

    // 5. 保存，返回最新数据
    saveDatabase();
    return ProductDB.findById(id, shopId);
  },

  // ==================== 删：删除商品 ====================
  delete: (id, shopId) => {
    const db = getDB();

    // 删前查出商品的 category_id，以便后续刷新计数
    // 不属于本店铺的商品 findById 返回 null，下面的数量对比也就不可能变化
    const target = ProductDB.findById(id, shopId);

    // 先记下删除前的总数（只数本店铺的）
    const beforeResult = db.exec('SELECT COUNT(*) as count FROM products WHERE shop_id = ?', [shopId]);
    const beforeCount = beforeResult[0]?.values[0][0] || 0;

    // 执行删除（stock 预警配置的外键指向 products.id，CASCADE 自动级联删除）
    db.run('DELETE FROM products WHERE id = ? AND shop_id = ?', [id, shopId]);

    // 再查出删除后的总数
    const afterResult = db.exec('SELECT COUNT(*) as count FROM products WHERE shop_id = ?', [shopId]);
    const afterCount = afterResult[0]?.values[0][0] || 0;

    // 前后数量对比：变少了说明删除成功
    if (beforeCount > afterCount) {
      // 刷新被删产品所属分类的 product_count
      if (target?.category_id) {
        db.run(`UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = categories.id AND shop_id = categories.shop_id) WHERE shop_id = ?`, [shopId]);
      }
      saveDatabase();
      return true;
    }
    return false;  // 数量没变，说明要删的数据根本不存在
  },
};

module.exports = { ProductDB };
