// Checks the gallery data, so a typo in src/data/frames.js fails the build
// instead of breaking the live site.
import { describe, it, expect } from 'vitest';
import { FRAMES, filterTags, visibleIndices } from '../src/data/frames.js';
import { COLOURS, SHAPES } from '../src/scenes/bauhaus.js';

describe('gallery frames', () => {
  it('has frames', () => expect(FRAMES.length).toBeGreaterThan(0));
  it.each(FRAMES.map((f, i) => [f.title || `#${i}`, f]))('%s is complete', (_, f) => {
    for (const key of ['title', 'place', 'time', 'tag']) expect(typeof f[key], key).toBe('string');
    expect(f.ratio).toHaveLength(2);
    f.ratio.forEach((n) => expect(n).toBeGreaterThan(0));
    if (f.src) expect(typeof f.alt, 'photos need alt text').toBe('string');
    if (!f.src) {
      expect(Number.isInteger(f.seed), 'illustrations need a seed').toBe(true);
    }
  });
  it.each(FRAMES.filter((f) => !f.src).map((f) => [f.title, f]))('%s has Bauhaus art in the palette', (_, f) => {
    expect(f.art, 'art').toBeTruthy();
    expect(Object.keys(COLOURS)).toContain(f.art.bg);
    expect(f.art.shapes.length).toBeGreaterThan(0);
    f.art.shapes.forEach((s) => { expect(SHAPES).toContain(s.t); expect(Object.keys(COLOURS)).toContain(s.c); });
  });
  it('has unique titles', () => expect(new Set(FRAMES.map((f) => f.title)).size).toBe(FRAMES.length));
  it('builds filters starting with All', () => {
    const tags = filterTags();
    expect(tags[0]).toBe('All');
    expect(new Set(tags).size).toBe(tags.length);
  });
  it('filters frames by tag', () => {
    expect(visibleIndices('All')).toHaveLength(FRAMES.length);
    const total = filterTags().slice(1).reduce((n, t) => n + visibleIndices(t).length, 0);
    expect(total).toBe(FRAMES.length);
    visibleIndices('Storms').forEach((i) => expect(FRAMES[i].tag).toBe('Storms'));
  });
});
