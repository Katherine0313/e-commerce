// ==================== 富文本白名单过滤（防存储型 XSS） ====================
// 背景：商品详情 body 是富文本，前端用 v-html 渲染，若不过滤，攻击者可通过
// 直接调接口写 body 注入 <img onerror> / <script> 等（见 server/phish-demo/README.md）。
// 这里在入库前用 sanitize-html 做白名单过滤：只保留安全标签和属性，
// onerror/onload/<script>/<iframe> 等一律剥掉。
const sanitizeHtml = require('sanitize-html');

// 允许的标签白名单：覆盖 wangEditor 富文本会产出的常见标签
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'col', 'colgroup',
  'figure', 'figcaption', 'video', 'audio', 'source'
];

// 允许的属性白名单：每个标签只放行无害属性，事件属性(on*)一律不在列
const ALLOWED_ATTRS = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  video: ['src', 'controls', 'poster', 'width', 'height'],
  audio: ['src', 'controls'],
  source: ['src', 'type'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  col: ['span', 'width'],
  '*': ['style'] // style 的值 sanitize-html 会做二次净化，expression/behavior 会被清掉
};

// 只允许 http/https 等安全协议，禁掉 javascript: 这类伪协议
const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

/**
 * 清洗富文本：剥掉危险标签和属性
 * @param {string} html 原始 HTML
 * @returns {string} 清洗后的安全 HTML（非字符串原样返回）
 */
function cleanRichText(html) {
  if (typeof html !== 'string') return html;
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: { img: ['http', 'https', 'data'] } // 商品详情图可能是 base64
  });
}

module.exports = { cleanRichText };
