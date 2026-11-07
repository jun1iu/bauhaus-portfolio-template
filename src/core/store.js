// A tiny shared-state container. Components read and update it instead of
// calling each other directly. Covered by tests/store.test.js.

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    /** Merge a patch (object, or function of the current state) and notify subscribers if anything changed. */
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      const prev = state;
      const merged = { ...state, ...next };
      if (Object.keys(merged).every((k) => Object.is(merged[k], prev[k]))) return;
      state = merged;
      subs.forEach((fn) => fn(state, prev));
    },
    /** fn(state, prev) runs on every change. Returns an unsubscribe function. */
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
