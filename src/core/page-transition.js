// Animated page changes. Browsers with cross-document View Transitions
// (see styles/transition.css) animate navigation on their own. Elsewhere this
// fades the page out before following an internal link and fades the next one in.
import { REDUCED } from './env.js';

// Browsers that run cross-document view transitions also fire "pagereveal".
const native = typeof window !== 'undefined' && 'onpagereveal' in window;
const OUT_MS = 320;
const GIVE_UP_MS = 3000;

/** True for a plain left-click on a link that stays on this site and leaves this page. */
export function isInternalNav(a, e, here = location) {
  if (!a || !a.href || e.defaultPrevented || e.button !== 0) return false;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (a.target && a.target !== '_self') return false;
  if (a.hasAttribute('download')) return false;
  const url = new URL(a.href, here.href);
  if (url.origin !== here.origin) return false;
  if (url.pathname === here.pathname && url.search === here.search) return false; // same page / #hash
  return true;
}

export function pageTransitions() {
  if (native || REDUCED) return;
  const root = document.documentElement;
  const reset = () => root.classList.remove('pt-out');
  root.classList.add('pt-in');
  addEventListener('pageshow', (e) => { if (e.persisted) reset(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') reset(); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!isInternalNav(a, e)) return;
    e.preventDefault();
    if (root.classList.contains('pt-out')) return; // already leaving
    root.classList.add('pt-out');
    setTimeout(() => { location.href = a.href; }, OUT_MS);
    setTimeout(reset, OUT_MS + GIVE_UP_MS); // navigation blocked or cancelled: show the page again
  });
}
