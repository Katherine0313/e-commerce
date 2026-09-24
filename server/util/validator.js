/**
 * 验证商品数据
 * @param {Object} data - 商品数据
 * @param {boolean} isUpdate - 是否为更新操作（更新时部分字段可选）
 */
function validateProduct(data, isUpdate = false) {
    const errors = [];

    // 名称验证
    if (!isUpdate || data.name !== undefined) {
        if (!data.name || data.name.trim() === '') {
            errors.push('商品名称不能为空');
        }
    }

    // 分类验证
if(!isUpdate) {
    if(data.category_id === undefined || data.category_id === null) {
        errors.push('商品分类不能为空');
    }else if(typeof data.category_id !== 'number' || data.category_id < 1) {
        errors.push('商品分类不合法');
    }
}
    // 价格验证
    if (!isUpdate || data.sales_price !== undefined) {
        if (data.sales_price === null) {
            errors.push('商品价格不能为空');
        } else if (typeof data.sales_price !== 'number') {
            errors.push('商品价格不合法')
        } else if (data.sales_price < 0 || data.sales_price > 99999) {
            errors.push('商品价格必须在0~99999之间');
        }
    }

    // 库存验证
    if (!isUpdate || data.stock !== undefined) {
        if (data.stock === null) {
            errors.push('商品库存不能为空');
        } else if (typeof data.stock !== 'number') {
            errors.push('商品库存不合法')
        } else if (!Number.isInteger(data.stock)) {
            errors.push('商品库存必须为整数')
        } else if (data.stock < 0 || data.stock > 99999) {
            errors.push('商品库存必须在0~99999之间')
        }
    }

    // 品牌验证
    if (!isUpdate || data.brand !== undefined) {
        if (!data.brand || data.brand.trim() === '') {
            errors.push('商品品牌不能为空');
        }
    }

    // 副标题验证
    if (!isUpdate || data.sub_title !== undefined) {
        if (!data.sub_title || data.sub_title.trim() === '') {
            errors.push('商品副标题不能为空');
        }
    }

    // 市场价验证
    if (!isUpdate || data.market_price !== undefined) {
        if (data.market_price === null || data.market_price === '') {
            errors.push('市场价不能为空');
        } else if (typeof data.market_price !== 'number' || isNaN(data.market_price)) {
            errors.push('市场价不合法');
        } else if (data.market_price < 0 || data.market_price > 99999) {
            errors.push('市场价必须在0~99999之间');
        }
    }

    // 成本价验证
    if (!isUpdate || data.cost_price !== undefined) {
        if (data.cost_price === null || data.cost_price === '') {
            errors.push('成本价不能为空');
        } else if (typeof data.cost_price !== 'number' || isNaN(data.cost_price)) {
            errors.push('成本价不合法');
        } else if (data.cost_price < 0 || data.cost_price > 99999) {
            errors.push('成本价必须在0~99999之间');
        }
    }

    // 商品编码验证
    if (!isUpdate || data.product_code !== undefined) {
        if (!data.product_code || data.product_code.trim() === '') {
            errors.push('商品编码不能为空');
        }
    }

    // 如果有错误，抛出所有错误信息
    if (errors.length > 0) {
        const err = new Error(errors.join(';'));
        err.status = 400;
        throw err;
    }

    return true;
}

/**
 * 验证收货地址数据
 * @param {Object} data - 地址数据
 * @param {boolean} isUpdate - 是否为更新操作（更新时部分字段可选）
 */
function validateAddress(data, isUpdate = false) {
    const errors = [];

    // 收件人验证
    if (!isUpdate || data.consignee !== undefined) {
        if (!data.consignee || (typeof data.consignee === 'string' && data.consignee.trim() === '')) {
            errors.push('收件人姓名不能为空');
        } else if (typeof data.consignee === 'string' && data.consignee.trim().length > 50) {
            errors.push('收件人姓名不能超过50个字符');
        }
    }

    // 联系电话验证
    if (!isUpdate || data.phone !== undefined) {
        if (!data.phone || (typeof data.phone === 'string' && data.phone.trim() === '')) {
            errors.push('联系电话不能为空');
        } else if (typeof data.phone === 'string') {
            const phone = data.phone.trim();
            if (!/^1\d{10}$/.test(phone)) {
                errors.push('联系电话格式不正确，请输入11位手机号');
            }
        }
    }

    // 所在地区验证
    if (!isUpdate || data.region !== undefined) {
        if (!data.region || (typeof data.region === 'string' && data.region.trim() === '')) {
            errors.push('所在地区不能为空');
        }
    }

    // 详细地址验证
    if (!isUpdate || data.detail_address !== undefined) {
        if (!data.detail_address || (typeof data.detail_address === 'string' && data.detail_address.trim() === '')) {
            errors.push('详细地址不能为空');
        } else if (typeof data.detail_address === 'string' && data.detail_address.trim().length > 200) {
            errors.push('详细地址不能超过200个字符');
        }
    }

    // 如果有错误，抛出所有错误信息
    if (errors.length > 0) {
        const err = new Error(errors.join(';'));
        err.status = 400;
        throw err;
    }

    return true;
}

/**
 * 验证订单数据
 * @param {Object} data - 订单数据
 * @param {boolean} isUpdate - 是否为更新操作（更新时部分字段可选）
 */
function validateOrder(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    // 地址信息验证
    if (!data.consignee || (typeof data.consignee === 'string' && data.consignee.trim() === '')) {
      errors.push('收件人不能为空');
    }
    if (!data.phone || (typeof data.phone === 'string' && !/^1\d{10}$/.test(data.phone.trim()))) {
      errors.push('联系电话格式不正确，请输入11位手机号');
    }
    if (!data.region || (typeof data.region === 'string' && data.region.trim() === '')) {
      errors.push('所在地区不能为空');
    }
    if (!data.detail_address || (typeof data.detail_address === 'string' && data.detail_address.trim() === '')) {
      errors.push('详细地址不能为空');
    }

    // 商品明细验证
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push('订单商品不能为空');
    } else {
      data.items.forEach((item, i) => {
        if (!item.product_id) {
          errors.push('第' + (i + 1) + '个商品的产品ID不能为空');
        }
        if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1) {
          errors.push('第' + (i + 1) + '个商品的数量必须为正整数');
        }
      });
    }
  }

  if (errors.length > 0) {
    const err = new Error(errors.join(';'));
    err.status = 400;
    throw err;
  }
  return true;
}

// 导出校验函数
module.exports = {validateProduct, validateAddress, validateOrder};