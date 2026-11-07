// Fade-and-rise elements into view as they're scrolled to. Add class "rv" in
// HTML, or call reveal(el) for elements created in JavaScript.
import { REDUCED } from './env.js';

let io = null;
function observer() {
  if (io || REDUCED || !('IntersectionObserver' in window)) return io;
  io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  return io;
}

export function reveal(els) {
  const o = observer();
  if (!o) return;
  [].concat(els).forEach((el) => {
    if (el.getBoundingClientRect().top > window.innerHeight * 0.95) { el.classList.add('pre'); o.observe(el); }
  });
}
