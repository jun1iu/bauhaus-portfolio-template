import { describe, it, expect } from 'vitest';
import { whenReady } from '../src/core/ready.js';

const doc = (over = {}) => ({ images: [], fonts: { ready: Promise.resolve() }, ...over });

describe('whenReady', () => {
  it('waits for the components to mount', async () => {
    let done = false;
    const mounted = new Promise((r) => setTimeout(() => { done = true; r(); }, 20));
    await whenReady(mounted, doc());
    expect(done).toBe(true);
  });
  it('waits for fonts', async () => {
    let loaded = false;
    const fonts = { ready: new Promise((r) => setTimeout(() => { loaded = true; r(); }, 20)) };
    await whenReady(Promise.resolve(), doc({ fonts }));
    expect(loaded).toBe(true);
  });
  it('checks fonts after the components are built, not before', async () => {
    const order = [];
    const fonts = { get ready() { order.push('fonts'); return Promise.resolve(); } };
    const mounted = new Promise((r) => setTimeout(() => { order.push('mounted'); r(); }, 20));
    await whenReady(mounted, doc({ fonts }));
    expect(order).toEqual(['mounted', 'fonts']);
  });
  it('waits for eager images but not lazy ones', async () => {
    let decoded = false, lazyDecoded = false;
    const eager = { loading: 'eager', decode: () => new Promise((r) => setTimeout(() => { decoded = true; r(); }, 20)) };
    const lazy = { loading: 'lazy', decode: () => new Promise((r) => setTimeout(() => { lazyDecoded = true; r(); }, 200)) };
    await whenReady(Promise.resolve(), doc({ images: [eager, lazy] }));
    expect(decoded).toBe(true);
    expect(lazyDecoded).toBe(false);
  });
  it('is not blocked by a failing image or font', async () => {
    const bad = { loading: 'eager', decode: () => Promise.reject(new Error('broken')) };
    await expect(whenReady(Promise.reject(new Error('x')), doc({ images: [bad], fonts: { ready: Promise.reject(new Error('f')) } }))).resolves.toBeUndefined();
  });
  it('copes with a browser that has no fonts API', async () => {
    await expect(whenReady(Promise.resolve(), { images: [] })).resolves.toBeUndefined();
  });
});
