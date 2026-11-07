// "Frames": builds the cards from src/data/frames.js, the filter
// chips, the tilt-on-hover effect, and opens the lightbox on click.
import { FRAMES, filterTags, visibleIndices } from '../data/frames.js';
import { draw } from '../scenes/bauhaus.js';
import { ui } from '../state.js';
import { onResize } from '../core/scroll.js';
import { reveal } from '../core/reveal.js';
import { justifyRows } from '../core/justify.js';
import { h, qs, asset, REDUCED } from '../core/index.js';

export function mount(root) {
  const grid = qs('[data-gallery-grid]', root);
  const filters = qs('[data-gallery-filters]', root);
  const note = qs('[data-gallery-note]', root);

  const items = FRAMES.map((frame, i) => createItem(frame, i, () => { renderItems(); updateNote(); }));
  grid.append(...items.map((it) => it.fig));
  reveal(items.map((it) => it.fig));

  const chips = filterTags().map((tag) =>
    h('button', { type: 'button', class: 'chip', 'aria-pressed': String(tag === ui.get().filter), onclick: () => ui.set({ filter: tag }) },
      tag, h('span', { class: 'n' }, String(visibleIndices(tag).length))));
  filters.append(...chips);

  ui.subscribe((s, prev) => {
    if (s.filter === prev.filter) return;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.firstChild.textContent === s.filter)));
    const shown = new Set(visibleIndices(s.filter));
    items.forEach((it, k) => {
      const show = shown.has(k);
      it.fig.hidden = !show;
      it.fig.classList.remove('pop', 'pre');
      if (show && !REDUCED) { void it.fig.offsetWidth; it.fig.style.animationDelay = `${(k % 3) * 60}ms`; it.fig.classList.add('pop'); }
    });
    renderItems();
  });

  // Lay the visible frames out in rows that fill the width, then draw them at their final size.
  function layout() {
    const width = Math.floor(grid.clientWidth) - 1; // 1px spare so rounding never wraps a row
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 12;
    const shown = items.filter((it) => !it.fig.hidden);
    const rows = justifyRows(shown.map((it) => it.frame.ratio[0] / it.frame.ratio[1]), width, { target: Math.round(Math.min(420, Math.max(240, width * 0.29))), gap });
    rows.flat().forEach(({ i, w }) => { const f = shown[i].fig; f.style.flex = '0 0 auto'; f.style.width = `${w}px`; });
  }

  function renderItems() {
    layout();
    items.forEach((it) => {
      if (it.fig.hidden || !it.canvas) return;
      const w = it.btn.clientWidth;
      if (Math.abs(w - it.w) > 1) { draw(it.canvas, it.frame, w, it.btn.clientHeight); it.w = w; }
    });
  }
  function updateNote() {
    if (!note) return;
    const real = FRAMES.filter((f) => f.src).length;
    note.hidden = real === FRAMES.length;
    note.textContent = real ? 'Some frames still illustrated · more photographs coming' : 'Illustrated placeholders · photographs coming soon';
  }

  renderItems();
  updateNote();
  onResize(renderItems);
  // The grid's own width also changes when a scrollbar appears or the nav/gutter changes.
  if ('ResizeObserver' in window) new ResizeObserver(() => renderItems()).observe(grid);
}

function createItem(frame, i, onFallback) {
  const media = frame.src
    ? h('img', { src: asset(frame.src), alt: frame.alt || frame.title, loading: 'lazy', decoding: 'async' })
    : h('canvas', { 'aria-hidden': 'true' });
  const btn = h('button', {
    class: 'shot', type: 'button', 'aria-label': `Open ${frame.title}`,
    style: { aspectRatio: `${frame.ratio[0]}/${frame.ratio[1]}` },
    onclick: () => ui.set({ viewing: i }),
  }, media, h('span', { class: 'view' }, 'View frame'));
  const fig = h('figure', { class: 'frame rv', style: { transitionDelay: `${(i % 3) * 90}ms` } },
    btn,
    h('figcaption', {},
      h('span', { class: 'pl' }, `Plate ${String(i + 1).padStart(2, '0')}`),
      h('strong', {}, frame.title),
      h('span', {}, `${frame.place} · ${frame.time}`)));
  const item = { fig, btn, frame, canvas: frame.src ? null : media, w: 0 };

  if (frame.src) {
    media.addEventListener('error', () => {
      const cv = h('canvas', { 'aria-hidden': 'true' });
      media.replaceWith(cv);
      item.canvas = cv; item.w = 0;
      frame.src = null; // the lightbox and film strip fall back to the illustration too
      onFallback();
    });
  }
  return item;
}
