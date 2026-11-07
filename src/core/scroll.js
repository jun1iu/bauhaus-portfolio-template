// One shared animation loop for everything that reacts to scrolling or resizing.
// Components subscribe instead of adding their own listeners, so the page does
// at most one layout pass per frame.

const scrollSubs = new Set();
const resizeSubs = new Set();
let ticking = false;
let started = false;
let resizeTimer;

function metrics() {
  const de = document.documentElement;
  return { y: window.scrollY || de.scrollTop, vh: window.innerHeight, vw: window.innerWidth, docH: de.scrollHeight };
}

function run() {
  ticking = false;
  const m = metrics();
  scrollSubs.forEach((fn) => fn(m));
}

/** Ask for a scroll update on the next frame. */
function requestUpdate() {
  if (!ticking) { ticking = true; requestAnimationFrame(run); }
}

/** Re-run resize handlers (e.g. after fonts load or content changes size), then scroll handlers. */
function refreshLayout() {
  const m = metrics();
  resizeSubs.forEach((fn) => fn(m));
  requestUpdate();
}

function start() {
  if (started) return;
  started = true;
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(refreshLayout, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshLayout);
}

/** Call fn({y, vh, vw, docH}) on every scroll frame. Returns an unsubscribe function. */
export function onScroll(fn) {
  start(); scrollSubs.add(fn); requestUpdate();
  return () => scrollSubs.delete(fn);
}

/** Call fn({y, vh, vw, docH}) after the window is resized (debounced). Returns an unsubscribe function. */
export function onResize(fn) {
  start(); resizeSubs.add(fn);
  return () => resizeSubs.delete(fn);
}
