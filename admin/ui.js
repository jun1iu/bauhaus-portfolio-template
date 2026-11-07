// Small shared pieces: messages, form fields, error display, and editable lists.
import { h } from './dom.js';

export function toast(text, kind = 'ok') {
  const box = document.getElementById('toasts');
  const t = h('p', { class: `toast ${kind}` }, text);
  box.append(t);
  setTimeout(() => t.remove(), kind === 'error' ? 7000 : 3500);
}

/** A labelled input or textarea. Returns the wrapper; the control carries data-path for error mapping. */
export function field({ label, path, type = 'text', value = '', hint, rows, max, required, placeholder, onInput, autocomplete }) {
  const id = `f-${path}-${Math.random().toString(36).slice(2, 7)}`;
  const common = { id, dataset: { path }, value, maxLength: max, required, placeholder, autocomplete, 'aria-describedby': `${id}-err` };
  const control = type === 'textarea'
    ? h('textarea', { ...common, rows: rows || 4 })
    : h('input', { ...common, type });
  if (onInput) control.addEventListener('input', () => onInput(control.value));
  return h('div', { class: 'field' },
    h('label', { for: id }, label, required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
    control,
    hint ? h('p', { class: 'hint' }, hint) : null,
    h('p', { class: 'err', id: `${id}-err`, role: 'alert' }));
}

/** Show server validation errors under the matching fields. Paths like "experience.0.bullets.2" fall back to "experience.0.bullets". */
export function showErrors(root, errors = {}) {
  root.querySelectorAll('.err').forEach((e) => { e.textContent = ''; });
  root.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  let first = null;
  for (const [path, message] of Object.entries(errors)) {
    let p = path, control = null;
    while (p && !control) {
      control = root.querySelector(`[data-path="${CSS.escape(p)}"]`);
      if (!control) { const next = p.replace(/\.\d+$/, '').replace(/\.[^.]+$/, ''); p = next === p ? '' : next; }
    }
    if (!control) continue;
    control.setAttribute('aria-invalid', 'true');
    const err = control.closest('.field')?.querySelector('.err');
    if (err && !err.textContent) err.textContent = message;
    first = first || control;
  }
  if (first) first.focus();
  return Boolean(first);
}

const toForm = (value, type) => (type === 'lines' ? (value || []).join('\n') : type === 'csv' ? (value || []).join(', ') : value ?? '');
const fromForm = (value, type) => (type === 'lines'
  ? String(value).split('\n').map((s) => s.trim()).filter(Boolean)
  : type === 'csv' ? String(value).split(',').map((s) => s.trim()).filter(Boolean) : value);

/**
 * An editable list of small forms: add, remove and reorder items.
 * `defs` = [{ key, label, type: 'text' | 'textarea' | 'lines' | 'csv', hint, max, required }]
 */
export function repeater({ name, noun, items, defs, blank }) {
  let state = items.map((it) => Object.fromEntries(defs.map((d) => [d.key, toForm(it[d.key], d.type)])));
  const root = h('div', { class: 'repeater' });
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= state.length) return; [state[i], state[j]] = [state[j], state[i]]; draw(); };
  function draw() {
    root.replaceChildren(
      ...state.map((item, i) => h('fieldset', { class: 'item' },
        h('legend', {}, `${noun} ${i + 1}`),
        h('div', { class: 'item-tools' },
          h('button', { type: 'button', class: 'mini', 'aria-label': `Move ${noun} ${i + 1} up`, disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
          h('button', { type: 'button', class: 'mini', 'aria-label': `Move ${noun} ${i + 1} down`, disabled: i === state.length - 1, onclick: () => move(i, 1) }, '↓'),
          h('button', { type: 'button', class: 'mini danger', onclick: () => { state.splice(i, 1); draw(); } }, 'Remove')),
        ...defs.map((d) => field({
          label: d.label, path: `${name}.${i}.${d.key}`, type: d.type === 'text' || d.type === 'csv' ? 'text' : 'textarea', value: item[d.key],
          hint: d.hint, max: d.max, rows: d.type === 'lines' ? 5 : 3, required: d.required, onInput: (v) => { item[d.key] = v; },
        })))),
      h('button', { type: 'button', class: 'btn alt', onclick: () => { state.push(Object.fromEntries(defs.map((d) => [d.key, toForm(blank?.[d.key], d.type)]))); draw(); } }, `Add ${noun.toLowerCase()}`));
  }
  draw();
  return { el: root, value: () => state.map((item) => Object.fromEntries(defs.map((d) => [d.key, fromForm(item[d.key], d.type)]))) };
}

export const fmtDate = (ms) => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** The title block at the top of every screen. */
export function pageHeader(title, description, actions) {
  return h('header', { class: 'page-head' },
    h('div', {}, h('h1', {}, title), description ? h('p', { class: 'page-desc' }, description) : null),
    actions ? h('div', { class: 'head-actions' }, actions) : null);
}

/** "just now", "5 minutes ago", "3 days ago"; older than a month falls back to the date. */
export function timeAgo(ms, nowMs = Date.now()) {
  const s = Math.max(0, Math.round((nowMs - ms) / 1000));
  if (s < 45) return 'just now';
  const units = [[60, 'minute', 60], [3600, 'hour', 24], [86400, 'day', 30]];
  for (const [size, name, limit] of units) {
    const n = Math.round(s / size);
    if (n < limit || name === 'day') {
      if (name === 'day' && n >= 30) return new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' });
      return `${n} ${name}${n === 1 ? '' : 's'} ago`;
    }
  }
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
