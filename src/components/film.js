// Film strip of every frame that slides sideways as you scroll past it.
import { FRAMES } from '../data/frames.js';
import { draw } from '../scenes/bauhaus.js';
import { onScroll } from '../core/scroll.js';
import { h, asset, viewportProgress } from '../core/index.js';

const W = 200, H = 132;

function cell(frame) {
  if (!frame.src) { const cv = h('canvas'); draw(cv, frame, W, H); return cv; }
  const img = h('img', { src: asset(frame.src), alt: '', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => { const cv = h('canvas'); draw(cv, frame, W, H); img.replaceWith(cv); });
  return img;
}

export function mount(wrap) {
  const track = wrap.querySelector('.film-track');
  for (let r = 0; r < 2; r++) FRAMES.forEach((f) => track.append(cell(f)));
  onScroll(({ vh }) => {
    const rect = wrap.getBoundingClientRect();
    if (rect.top > vh || rect.bottom < 0) return;
    const max = track.scrollWidth - wrap.clientWidth;
    track.style.transform = `translate3d(${-viewportProgress(rect, vh) * max}px,0,0)`;
  });
}
