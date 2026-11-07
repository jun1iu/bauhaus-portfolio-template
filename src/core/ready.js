// Resolves when the page is fully built: components mounted, images decoded and fonts loaded.
// main.js waits on this before recording the page-ready performance mark.

/** Images that load immediately (lazy ones are left to load when scrolled near). */
const eager = (root) => Array.from(root.images).filter((img) => img.loading !== 'lazy');

/** Wait for every promise to settle, so one failure (a missing font or image) never blocks the page. */
export async function whenReady(mounted, root = document) {
  await Promise.allSettled([mounted, ...eager(root).map((img) => (img.decode ? img.decode() : null))]);
  // Fonts only start downloading once text that uses them is laid out, so build first, force a layout, then wait.
  if (root.body) void root.body.offsetHeight;
  await Promise.allSettled([root.fonts ? root.fonts.ready : null]);
}
