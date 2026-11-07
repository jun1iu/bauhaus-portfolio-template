import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '../src/components/lightbox.js';
import { ui } from '../src/state.js';
import { FRAMES } from '../src/data/frames.js';

vi.mock('../src/core/scroll.js', () => ({ onResize: () => {} }));
vi.mock('../src/scenes/bauhaus.js', () => ({ draw: () => {} }));

afterEach(() => vi.unstubAllGlobals());

it('cycles focus within the lightbox and restores the opener on Escape', () => {
  const doc = new EventTarget();
  const node = () => Object.assign(new EventTarget(), {
    style: {},
    focus() { doc.activeElement = this; },
  });
  const opener = node(), close = node(), prev = node(), next = node();
  const background = node(), alreadyInert = { inert: true };
  const nodes = {
    canvas: node(), img: node(), '[data-lb-caption]': node(), '[data-lb-count]': node(),
    '[data-lb-close]': close, '[data-lb-prev]': prev, '[data-lb-next]': next,
  };
  const lb = Object.assign(node(), {
    hidden: true,
    querySelector: (selector) => nodes[selector],
    contains: (el) => Object.values(nodes).includes(el),
  });
  doc.body = { children: [background, alreadyInert, lb], style: { overflow: 'auto' } };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('innerWidth', 800);
  vi.stubGlobal('innerHeight', 600);
  const key = (key, shiftKey = false) => doc.dispatchEvent(Object.assign(
    new Event('keydown', { cancelable: true }), { key, shiftKey },
  ));

  mount(lb);
  opener.focus();
  expect(FRAMES.length).toBeGreaterThan(0);
  ui.set({ viewing: 0 });
  expect(doc.activeElement).toBe(close);
  expect(background.inert).toBe(true);
  expect(key('Tab', true)).toBe(false);
  expect(doc.activeElement).toBe(next);
  expect(key('Tab')).toBe(false);
  expect(doc.activeElement).toBe(close);
  key('Escape');
  expect(lb.hidden).toBe(true);
  expect(doc.activeElement).toBe(opener);
  expect(background.inert).toBe(false);
  expect(alreadyInert.inert).toBe(true);
  expect(doc.body.style.overflow).toBe('auto');
});
