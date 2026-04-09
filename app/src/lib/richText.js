const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'u',
  'ul',
]);

const BLOCK_TAGS = new Set([
  'blockquote',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'p',
  'pre',
  'ul',
]);

const STYLE_SANITIZERS = {
  color: sanitizeColor,
  'background-color': sanitizeColor,
  'font-style': (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return ['italic', 'normal', 'oblique'].includes(normalized) ? normalized : '';
  },
  'font-weight': (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return /^(normal|bold|bolder|lighter|[1-9]00)$/.test(normalized) ? normalized : '';
  },
  'text-align': (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return ['left', 'center', 'right', 'justify'].includes(normalized) ? normalized : '';
  },
  'text-decoration': (value) => {
    const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return ['none', 'underline', 'line-through', 'underline line-through', 'line-through underline'].includes(normalized)
      ? normalized
      : '';
  },
};

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const COLOR_PATTERN = /^(#[0-9a-f]{3,8}|rgb(a)?\(([^()]+)\)|hsl(a)?\(([^()]+)\)|[a-z]+)$/i;

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && typeof DOMParser !== 'undefined';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeColor(value) {
  const normalized = String(value || '').trim();
  return COLOR_PATTERN.test(normalized) ? normalized : '';
}

function isSafeHref(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true;
  try {
    const base = canUseDom() ? window.location.origin : 'https://example.com';
    const parsed = new URL(trimmed, base);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function normalizeEditorUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatPlainTextAsHtml(value) {
  const normalized = String(value ?? '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function unwrapElement(element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function sanitizeStyles(element) {
  const rawStyle = element.getAttribute('style');
  if (!rawStyle) return;

  const nextStyles = rawStyle
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [property, ...rest] = entry.split(':');
      const propName = String(property || '').trim().toLowerCase();
      const sanitizer = STYLE_SANITIZERS[propName];
      if (!sanitizer) return '';
      const safeValue = sanitizer(rest.join(':'));
      return safeValue ? `${propName}: ${safeValue}` : '';
    })
    .filter(Boolean);

  if (nextStyles.length === 0) {
    element.removeAttribute('style');
    return;
  }

  element.setAttribute('style', nextStyles.join('; '));
}

function sanitizeNode(node, doc) {
  if (!node) return;

  if (node.nodeType === 8) {
    node.remove();
    return;
  }

  if (node.nodeType !== 1) return;

  Array.from(node.childNodes).forEach((child) => sanitizeNode(child, doc));

  const tagName = node.tagName.toLowerCase();
  if (tagName === 'font') {
    const span = doc.createElement('span');
    const safeColor = sanitizeColor(node.getAttribute('color'));
    const rawStyle = node.getAttribute('style');
    if (rawStyle) {
      span.setAttribute('style', rawStyle);
    }
    if (safeColor) {
      const nextStyle = span.getAttribute('style');
      span.setAttribute('style', `${nextStyle ? `${nextStyle}; ` : ''}color: ${safeColor}`);
    }
    while (node.firstChild) {
      span.appendChild(node.firstChild);
    }
    node.replaceWith(span);
    sanitizeNode(span, doc);
    return;
  }
  if (!ALLOWED_TAGS.has(tagName)) {
    unwrapElement(node);
    return;
  }

  Array.from(node.attributes).forEach((attribute) => {
    const attrName = attribute.name.toLowerCase();
    const isAllowedAnchorAttr = tagName === 'a' && ['href', 'target', 'rel'].includes(attrName);
    if (attrName !== 'style' && !isAllowedAnchorAttr) {
      node.removeAttribute(attribute.name);
    }
  });

  sanitizeStyles(node);

  if (tagName === 'a') {
    const href = node.getAttribute('href');
    const safeHref = normalizeEditorUrl(href);
    if (!isSafeHref(safeHref)) {
      node.removeAttribute('href');
      node.removeAttribute('target');
      node.removeAttribute('rel');
    } else {
      node.setAttribute('href', safeHref);
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }

  if ((tagName === 'span' || tagName === 'div') && !node.attributes.length && !node.textContent?.trim() && node.childNodes.length === 0) {
    node.remove();
  }
}

export function sanitizeRichTextHtml(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (!canUseDom()) {
    return raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${raw}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) return '';

  Array.from(container.childNodes).forEach((child) => sanitizeNode(child, doc));
  return container.innerHTML.trim();
}

export function normalizeRichTextHtml(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!HTML_TAG_PATTERN.test(raw)) {
    return formatPlainTextAsHtml(raw);
  }
  return sanitizeRichTextHtml(raw);
}

function plainTextFallback(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|blockquote|h[1-6]|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function nodeToPlainText(node) {
  if (!node) return '';
  if (node.nodeType === 3) {
    return node.textContent || '';
  }
  if (node.nodeType !== 1) {
    return '';
  }

  const tagName = node.tagName.toLowerCase();
  if (tagName === 'br') return '\n';

  const childText = Array.from(node.childNodes).map((child) => nodeToPlainText(child)).join('');
  if (BLOCK_TAGS.has(tagName) && childText.trim()) {
    return `${childText}\n`;
  }
  return childText;
}

export function richTextToPlainText(value) {
  const html = normalizeRichTextHtml(value);
  if (!html) return '';

  if (!canUseDom()) {
    return plainTextFallback(html);
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  return nodeToPlainText(container)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isRichTextEmpty(value) {
  return !richTextToPlainText(value).trim();
}

export { formatPlainTextAsHtml, normalizeEditorUrl };
