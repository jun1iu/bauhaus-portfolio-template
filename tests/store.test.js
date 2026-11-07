import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/core/store.js';

describe('createStore', () => {
  it('merges patches and notifies with new and previous state', () => {
    const s = createStore({ a: 1, b: 2 });
    const fn = vi.fn();
    s.subscribe(fn);
    s.set({ a: 5 });
    expect(s.get()).toEqual({ a: 5, b: 2 });
    expect(fn).toHaveBeenCalledWith({ a: 5, b: 2 }, { a: 1, b: 2 });
  });
  it('accepts an updater function', () => {
    const s = createStore({ n: 1 });
    s.set((st) => ({ n: st.n + 1 }));
    expect(s.get().n).toBe(2);
  });
  it('skips notifying when nothing changed', () => {
    const s = createStore({ a: 1 });
    const fn = vi.fn();
    s.subscribe(fn);
    s.set({ a: 1 });
    expect(fn).not.toHaveBeenCalled();
  });
  it('unsubscribes', () => {
    const s = createStore({ a: 1 });
    const fn = vi.fn();
    const off = s.subscribe(fn);
    off();
    s.set({ a: 2 });
    expect(fn).not.toHaveBeenCalled();
  });
});
