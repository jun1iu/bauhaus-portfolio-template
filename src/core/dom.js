// DOM helpers.

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape text before putting it into innerHTML. */
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/**
 * Create an element: h('button', {class: 'chip', onclick: fn}, 'Label', childEl)
 * Attributes starting with "on" become event listeners.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

/** Resolve a path in public/ (e.g. 'photos/x.jpg') against the site's base URL. */
export function asset(path) {
  if (!path || /^(https?:|data:|\/)/.test(path)) return path;
  return import.meta.env.BASE_URL + path;
}
