import { describe, it, expect } from 'vitest';
import { clamp, rng, viewportProgress } from '../src/core/math.js';

describe('math helpers', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-2, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
  it('rng is deterministic per seed and stays in [0,1)', () => {
    const a = rng(42), b = rng(42), c = rng(7);
    const seqA = Array.from({ length: 50 }, a);
    expect(seqA).toEqual(Array.from({ length: 50 }, b));
    expect(seqA).not.toEqual(Array.from({ length: 50 }, c));
    seqA.forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); });
  });
  it('measures progress through the viewport', () => {
    expect(viewportProgress({ top: 800, height: 200 }, 800)).toBe(0);
    expect(viewportProgress({ top: -200, height: 200 }, 800)).toBe(1);
    expect(viewportProgress({ top: 300, height: 200 }, 800)).toBe(0.5);
  });
});
