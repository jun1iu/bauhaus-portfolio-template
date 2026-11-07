import { describe, it, expect } from 'vitest';
import { justifyRows } from '../src/core/justify.js';
import { FRAMES } from '../src/data/frames.js';

const ratios = FRAMES.map((f) => f.ratio[0] / f.ratio[1]);
const opts = { target: 360, gap: 12 };
const rowWidth = (row, gap) => row.reduce((s, c) => s + c.w, 0) + gap * (row.length - 1);

describe('justified rows', () => {
  it('shows every frame once, in order', () => {
    const rows = justifyRows(ratios, 1240, opts);
    expect(rows.flat().map((c) => c.i)).toEqual(ratios.map((_, i) => i));
  });
  it('makes every finished row exactly as wide as the container', () => {
    for (const width of [640, 900, 1240, 1600]) {
      const rows = justifyRows(ratios, width, opts);
      rows.slice(0, -1).forEach((row) => expect(rowWidth(row, 12)).toBe(width));
    }
  });
  it('never overflows, even on the last row', () => {
    const rows = justifyRows(ratios, 1240, opts);
    rows.forEach((row) => expect(rowWidth(row, 12)).toBeLessThanOrEqual(1240));
  });
  it('keeps each frame close to its own shape', () => {
    justifyRows(ratios, 1240, opts).flat().forEach((c) => expect(c.w / c.h).toBeCloseTo(ratios[c.i], 1));
  });
  it('gives each frame its own full-width row on narrow screens', () => {
    const rows = justifyRows(ratios, 390, opts);
    expect(rows).toHaveLength(ratios.length);
    rows.forEach((row) => expect(row[0].w).toBe(390));
  });
  it('handles no frames', () => expect(justifyRows([], 1240, opts)).toEqual([]));
});
