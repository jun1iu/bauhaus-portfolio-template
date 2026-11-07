// Full-screen frame viewer. Opens when ui.viewing is set (the gallery does
// this on click) and steps through the frames the current filter shows.
import { FRAMES, visibleIndices } from '../data/frames.js';
import { draw } from '../scenes/bauhaus.js';
import { ui } from '../state.js';
import { onResize } from '../core/scroll.js';
import { qs, asset, escapeHtml } from '../core/index.js';

export function mount(lb) {
  const canvas = qs('canvas', lb), img = qs('img', lb);
  const cap = qs('[data-lb-caption]', lb), count = qs('[data-lb-count]', lb), closeBtn = qs('[data-lb-close]', lb);
  const prevBtn = qs('[data-lb-prev]', lb), nextBtn = qs('[data-lb-next]', lb);
  let opener = null;
  let background = [];
  let previousOverflow = '';

  const close = () => ui.set({ viewing: null });
  const step = (d) => {
    const v = visibleIndices(ui.get().filter), p = v.indexOf(ui.get().viewing);
    ui.set({ viewing: v[(p + d + v.length) % v.length] });
  };

  function render() {
    const i = ui.get().viewing, f = FRAMES[i];
    const narrow = innerWidth <= 640;
    const maxW = innerWidth - (narrow ? 32 : 180), maxH = innerHeight - (narrow ? 230 : 190);
    const ratio = f.ratio[0] / f.ratio[1], w = Math.min(maxW, maxH * ratio), hgt = w / ratio;
    const el = f.src ? img : canvas;
    canvas.hidden = !!f.src; img.hidden = !f.src;
    if (f.src) { img.src = asset(f.src); img.alt = f.alt || f.title; } else draw(canvas, f, w, hgt);
    el.style.width = `${w}px`; el.style.height = `${hgt}px`;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    cap.innerHTML = `<strong>${escapeHtml(f.title)}</strong>${escapeHtml(f.place)} · ${escapeHtml(f.time)}`;
    const v = visibleIndices(ui.get().filter);
    count.textContent = `${String(v.indexOf(i) + 1).padStart(2, '0')} / ${String(v.length).padStart(2, '0')}`;
  }

  ui.subscribe((s, prev) => {
    if (s.viewing === prev.viewing) return;
    if (s.viewing === null) {
      lb.hidden = true;
      document.body.style.overflow = previousOverflow;
      background.forEach((el) => { el.inert = false; });
      background = [];
      if (opener) opener.focus();
      return;
    }
    if (prev.viewing === null) {
      opener = document.activeElement;
      previousOverflow = document.body.style.overflow;
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      render();
      closeBtn.focus();
      background = [...document.body.children].filter((el) => el !== lb && !el.inert);
      background.forEach((el) => { el.inert = true; });
      return;
    }
    render();
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Tab') {
      const active = document.activeElement;
      const edge = e.shiftKey ? closeBtn : nextBtn;
      if (active === edge || !lb.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? nextBtn : closeBtn).focus();
      }
    }
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  let tx = null;
  lb.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (tx == null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    tx = null;
  });
  onResize(() => { if (!lb.hidden) render(); });
}
