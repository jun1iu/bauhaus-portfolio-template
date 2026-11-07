// Small pure helpers. Covered by tests/math.test.js.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Seeded random number generator (mulberry32). Same seed, same sequence. */
export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Progress (0..1) of an element moving through the viewport, from entering at the bottom to leaving at the top. */
export function viewportProgress(rect, vh) {
  return clamp((vh - rect.top) / (vh + rect.height), 0, 1);
}
