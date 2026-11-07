// Bauhaus artwork for the nine illustrated placeholder frames, keyed by frame title.
// Each drawing is { bg, shapes }, drawn by src/scenes/bauhaus.js: colours are one-letter
// keys (r red, y yellow, b blue, k ink, p paper), positions are fractions of the canvas
// width and height, and radii are fractions of the shorter side.
export const ART = {
  'Lorem Ipsum': {
    bg: 'p',
    shapes: [
      { t: 'circle', c: 'r', x: 0.5, y: 0.38, r: 0.3 },
      { t: 'rect', c: 'k', x: 0, y: 0.72, w: 1, h: 0.28 },
      { t: 'tri', c: 'y', x: 0.12, y: 0.5, w: 0.4, h: 0.22 },
      { t: 'tri', c: 'b', x: 0.45, y: 0.42, w: 0.5, h: 0.3, mul: true },
    ],
  },
  'Dolor Sit Amet': {
    bg: 'b',
    shapes: [
      { t: 'stars', c: 'p', x: 0, y: 0, w: 1, h: 0.6, n: 60 },
      { t: 'circle', c: 'y', x: 0.75, y: 0.3, r: 0.18 },
      { t: 'circle', c: 'b', x: 0.82, y: 0.25, r: 0.15 },
      { t: 'rect', c: 'k', x: 0, y: 0.7, w: 1, h: 0.3 },
      { t: 'cactus', c: 'k', x: 0.28, base: 0.72, h: 0.55 },
    ],
  },
  'Consectetur Elit': {
    bg: 'y',
    shapes: [
      { t: 'rect', c: 'k', x: 0.1, y: 0.08, w: 0.08, h: 0.84 },
      { t: 'circle', c: 'r', x: 0.58, y: 0.32, r: 0.32 },
      { t: 'rect', c: 'b', x: 0.3, y: 0.58, w: 0.6, h: 0.3, mul: true },
      { t: 'lines', c: 'k', x: 0.3, y: 0.92, w: 0.6, n: 3, gap: 0.02, th: 0.006 },
    ],
  },
  'Sed Eiusmod': {
    bg: 'k',
    shapes: [
      { t: 'ring', c: 'y', x: 0.5, y: 0.42, r: 0.32, lw: 0.05 },
      { t: 'circle', c: 'r', x: 0.5, y: 0.42, r: 0.16 },
      { t: 'band', c: 'p', x: 0.5, y: 0.82, bw: 1.4, bh: 0.05, rot: -0.2 },
    ],
  },
  'Tempor Incididunt': {
    bg: 'p',
    shapes: [
      { t: 'rect', c: 'b', x: 0, y: 0, w: 0.4, h: 1 },
      { t: 'circle', c: 'y', x: 0.4, y: 0.5, r: 0.28 },
      { t: 'bolt', c: 'r', pts: [[0.62, 0.08], [0.82, 0.08], [0.72, 0.42], [0.88, 0.42], [0.6, 0.92], [0.68, 0.52], [0.54, 0.52]] },
    ],
  },
  'Ut Enim Minim': {
    bg: 'r',
    shapes: [
      { t: 'circle', c: 'y', x: 0.22, y: 0.5, r: 0.3 },
      { t: 'rect', c: 'k', x: 0.45, y: 0.2, w: 0.48, h: 0.12 },
      { t: 'rect', c: 'p', x: 0.45, y: 0.44, w: 0.32, h: 0.12 },
      { t: 'rect', c: 'b', x: 0.45, y: 0.68, w: 0.4, h: 0.12 },
    ],
  },
  'Exercitation Ullamco': {
    bg: 'p',
    shapes: [
      { t: 'rect', c: 'r', x: 0, y: 0, w: 0.5, h: 0.5 },
      { t: 'rect', c: 'b', x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      { t: 'circle', c: 'y', x: 0.5, y: 0.5, r: 0.22 },
      { t: 'ring', c: 'k', x: 0.5, y: 0.5, r: 0.36, lw: 0.02 },
    ],
  },
  'Commodo Consequat': {
    bg: 'y',
    shapes: [
      { t: 'band', c: 'k', x: 0.5, y: 0.5, bw: 1.5, bh: 0.1, rot: 0.6 },
      { t: 'circle', c: 'b', x: 0.3, y: 0.32, r: 0.2 },
      { t: 'tri', c: 'r', x: 0.52, y: 0.5, w: 0.38, h: 0.4 },
    ],
  },
  'Reprehenderit Velit': {
    bg: 'b',
    shapes: [
      { t: 'circle', c: 'p', x: 0.5, y: 0.28, r: 0.2 },
      { t: 'rect', c: 'r', x: 0.2, y: 0.5, w: 0.6, h: 0.08 },
      { t: 'rect', c: 'y', x: 0.2, y: 0.62, w: 0.6, h: 0.08 },
      { t: 'rect', c: 'k', x: 0.2, y: 0.74, w: 0.6, h: 0.08 },
    ],
  },
};
