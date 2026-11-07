// Top navigation: shows reading progress and marks the link for the current page
// (the build already writes that mark into the HTML; this keeps it right if the URL differs).
import { onScroll } from '../core/scroll.js';
import { clamp } from '../core/math.js';
import { qsa } from '../core/dom.js';

/** Normalise a path so "/x/about", "/x/about.html" and "/x/about/" compare equal, and "/x/index.html" equals "/x/". */
export const normPath = (p) => p.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/+$/, '');

export function mount(nav) {
  const progress = nav.querySelector('.progress');
  const current = normPath(location.pathname);
  qsa('a[data-page]', nav).forEach((a) => {
    const here = normPath(new URL(a.href, location.href).pathname) === current;
    a.classList.toggle('on', here);
    if (here) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });

  onScroll(({ vh, y, docH }) => {
    if (progress) progress.style.transform = `scaleX(${clamp(y / Math.max(1, docH - vh), 0, 1)})`;
  });
}
