// What the visitor's device supports or prefers. Read once at startup.
const mq = (q) => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false;

/** True when the visitor has asked for less motion. Skip big animations. */
export const REDUCED = mq('(prefers-reduced-motion: reduce)');
