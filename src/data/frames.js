// The gallery frames. These built-in placeholders show when the site runs without its
// server; when the server answers, src/core/apply-site.js swaps in the frames from the admin.
// A frame is { title, place, time, tag, ratio: [w, h] } plus either a photo (`src` and `alt`,
// with the file in public/photos/) or an illustration (`seed` and `art`, see src/data/art.js).
import { ART } from './art.js';

const PLACEHOLDERS = [
  { title: 'Lorem Ipsum', place: 'Dolor Sit', time: 'Amet', tag: 'Lorem', ratio: [4, 5], seed: 11 },
  { title: 'Dolor Sit Amet', place: 'Consectetur', time: 'Adipiscing', tag: 'Ipsum', ratio: [3, 2], seed: 23 },
  { title: 'Consectetur Elit', place: 'Sed Eiusmod', time: 'Tempor', tag: 'Dolor', ratio: [2, 3], seed: 37 },
  { title: 'Sed Eiusmod', place: 'Incididunt', time: 'Ut labore', tag: 'Amet', ratio: [3, 4], seed: 41 },
  { title: 'Tempor Incididunt', place: 'Dolore Magna', time: 'Aliqua', tag: 'Dolor', ratio: [4, 3], seed: 53 },
  { title: 'Ut Enim Minim', place: 'Veniam Quis', time: 'Nostrud', tag: 'Lorem', ratio: [16, 9], seed: 61 },
  { title: 'Exercitation Ullamco', place: 'Laboris Nisi', time: 'Aliquip', tag: 'Amet', ratio: [1, 1], seed: 71 },
  { title: 'Commodo Consequat', place: 'Duis Aute', time: 'Irure Dolor', tag: 'Lorem', ratio: [5, 4], seed: 83 },
  { title: 'Reprehenderit Velit', place: 'Esse Cillum', time: 'Fugiat Nulla', tag: 'Ipsum', ratio: [4, 5], seed: 97 },
];

/** Every frame, in display order. The array is updated in place, so imports stay current. */
export const FRAMES = PLACEHOLDERS.map((f) => ({ ...f, art: ART[f.title] }));

/** Replace the frames (with the ones from the server). An empty list keeps the placeholders. */
export function setFrames(list) {
  if (!Array.isArray(list) || !list.length) return;
  FRAMES.splice(0, FRAMES.length, ...list);
}

/** The filter chips: "All" first, then each tag once, in the order it first appears. */
export function filterTags() {
  return ['All', ...new Set(FRAMES.map((f) => f.tag))];
}

/** Indices of the frames shown under a filter tag. */
export function visibleIndices(tag) {
  return FRAMES.flatMap((f, i) => (tag === 'All' || f.tag === tag ? [i] : []));
}
