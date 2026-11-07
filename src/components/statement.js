// Lights up a paragraph word by word as it scrolls into view.
// Words listed in data-hot are highlighted in the accent colour.
import { onScroll } from '../core/scroll.js';
import { clamp, escapeHtml } from '../core/index.js';

export function mount(p) {
  const hot = (p.dataset.hot || '').split(',').map((s) => s.trim());
  p.innerHTML = p.textContent.trim().split(/\s+/)
    .map((w) => `<span class="w${hot.includes(w.replace(/[^\w]/g, '')) ? ' hot' : ''}">${escapeHtml(w)}</span>`)
    .join(' ');
  const words = Array.from(p.querySelectorAll('.w'));
  let lastLit = -1;
  onScroll(({ vh }) => {
    const r = p.getBoundingClientRect();
    const lit = Math.round(clamp((vh * 0.85 - r.top) / (r.height + vh * 0.4), 0, 1) * words.length);
    if (lit === lastLit) return;
    lastLit = lit;
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  });
}
