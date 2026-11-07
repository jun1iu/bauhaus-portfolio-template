// Bauhaus hero: the shapes turn and rise as the page scrolls.
// CSS reads --p (0 at the top, 1 after one screen).
import { onScroll } from '../core/scroll.js';
import { clamp } from '../core/math.js';
import { REDUCED } from '../core/env.js';

export function mount(el) {
  if (REDUCED) return;
  onScroll(({ y, vh }) => el.style.setProperty('--p', clamp(y / vh, 0, 1).toFixed(3)));
}
