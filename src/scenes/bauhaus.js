// Flat geometric artwork for gallery frames, drawn in the site palette.
// A frame's `art` is { bg, shapes }: colours are one-letter keys (r y b k p),
// positions are fractions of the canvas width and height, radii fractions of
// the shorter side. See src/data/art.js.
import { rng } from '../core/math.js';

export const COLOURS = { r: ['--red', '#DB2A1B'], y: ['--yellow', '#F7C01D'], b: ['--blue', '#1D3FA8'], k: ['--ink', '#121212'], p: ['--paper', '#F2ECDD'] };
export const SHAPES = ['circle', 'rect', 'tri', 'cactus', 'bolt', 'stars', 'lines', 'ring', 'band'];

function palette() {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(Object.entries(COLOURS).map(([k, [v, fb]]) => [k, cs.getPropertyValue(v).trim() || fb]));
}

// A blocky saguaro: trunk with a cap, and two square-elbowed arms.
function cactus(c, s, w, h) {
  const x = s.x * w, by = s.base * h, ch = s.h * h, tw = ch * 0.11, arm = ch * 0.2, t = tw * 0.85;
  c.fillRect(x - tw / 2, by - ch, tw, ch);
  c.beginPath(); c.arc(x, by - ch, tw / 2, 0, 6.283); c.fill();
  const yl = by - ch * 0.42, yr = by - ch * 0.6;
  c.fillRect(x - tw / 2 - arm, yl, arm + tw / 2, t);
  c.fillRect(x - tw / 2 - arm, yl - ch * 0.22, t, ch * 0.22 + t);
  c.fillRect(x, yr, arm + tw / 2 + 0, t);
  c.fillRect(x + tw / 2 + arm - t, yr - ch * 0.2, t, ch * 0.2 + t);
}

function drawArt(c, a, w, h, seed = 1) {
  const P = palette(), m = Math.min(w, h), L = Math.max(w, h), R = rng(seed);
  c.fillStyle = P[a.bg]; c.fillRect(0, 0, w, h);
  for (const s of a.shapes) {
    c.save();
    if (s.mul) c.globalCompositeOperation = 'multiply';
    if (s.a != null) c.globalAlpha = s.a;
    c.fillStyle = c.strokeStyle = P[s.c];
    switch (s.t) {
      case 'circle': c.beginPath(); c.arc(s.x * w, s.y * h, s.r * m, 0, 6.283); c.fill(); break;
      case 'rect': c.fillRect(s.x * w, s.y * h, s.w * w, s.h * h); break;
      case 'tri': c.beginPath(); c.moveTo(s.x * w, (s.y + s.h) * h); c.lineTo((s.x + s.w / 2) * w, s.y * h); c.lineTo((s.x + s.w) * w, (s.y + s.h) * h); c.closePath(); c.fill(); break;
      case 'cactus': cactus(c, s, w, h); break;
      case 'bolt': c.beginPath(); s.pts.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h))); c.closePath(); c.fill(); break;
      case 'stars': for (let i = 0; i < s.n; i++) { c.beginPath(); c.arc((s.x + R() * s.w) * w, (s.y + R() * s.h) * h, (0.003 + R() * 0.005) * m, 0, 6.283); c.fill(); } break;
      case 'lines': for (let i = 0; i < s.n; i++) c.fillRect(s.x * w, (s.y + i * s.gap) * h, s.w * w, s.th * h); break;
      case 'ring': c.lineWidth = s.lw * m; c.beginPath(); c.arc(s.x * w, s.y * h, s.r * m, 0, 6.283); c.stroke(); break;
      case 'band': c.translate(s.x * w, s.y * h); c.rotate(s.rot); c.fillRect(-s.bw * L / 2, -s.bh * L / 2, s.bw * L, s.bh * L); break;
    }
    c.restore();
  }
}

/** Draw a frame's artwork onto a canvas at w by h CSS pixels, sharp on high-density screens. */
export function draw(canvas, frame, w, h) {
  if (!w || !h || !frame.art) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawArt(c, frame.art, w, h, frame.seed);
}
