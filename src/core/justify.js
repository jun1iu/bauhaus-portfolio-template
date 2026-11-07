// Justified rows: lay frames of different shapes out in rows that all reach
// both edges, each row as tall as it needs to be. Reading order is left to
// right, then down, so plate numbers run the way people expect.

/**
 * @param {number[]} ratios   width / height of each frame, in display order
 * @param {number} width      width of the container in px
 * @param {{target:number, gap:number, minRow?:number, lastMax?:number}} opts
 *   target  the row height to aim for
 *   gap     space between frames in a row
 *   minRow  below this container width every frame gets its own row
 *   lastMax how much taller than target an unfinished last row may grow
 * @returns {{i:number, w:number, h:number}[][]} rows of frame index, width and height in px
 */
export function justifyRows(ratios, width, { target, gap, minRow = 560, lastMax = 1.15 }) {
  if (!ratios.length || width <= 0) return [];
  const rows = [];
  const place = (items, h, fill) => {
    const widths = items.map(({ r }) => Math.floor(r * h));
    if (fill) widths[widths.length - 1] += width - gap * (items.length - 1) - widths.reduce((a, b) => a + b, 0);
    rows.push(items.map(({ i, r }, k) => ({ i, w: widths[k], h: widths[k] / r })));
  };

  if (width < minRow) { // narrow screens: one frame per row, full width
    ratios.forEach((r, i) => place([{ i, r }], width / r, true));
    return rows;
  }

  let cur = [], sum = 0;
  ratios.forEach((r, i) => {
    cur.push({ i, r }); sum += r;
    if (sum * target + gap * (cur.length - 1) >= width) {
      place(cur, (width - gap * (cur.length - 1)) / sum, true);
      cur = []; sum = 0;
    }
  });
  if (cur.length) {
    const natural = (width - gap * (cur.length - 1)) / sum;
    const h = Math.min(natural, target * lastMax);
    place(cur, h, h === natural);
  }
  return rows;
}
