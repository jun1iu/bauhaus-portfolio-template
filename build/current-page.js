// Marks the nav link for the page being built, so the highlight is in the HTML from the very
// first frame. (nav.js also sets it at runtime; without this the highlight pops in after
// JavaScript loads, which shows up as a blink at the end of every page transition.)

/** "/about.html" -> "about", "/" or "/index.html" -> "" (matches data-page in partials/nav.html). */
export function pageName(path) {
  return path.replace(/^\/+/, '').replace(/\.html$/, '').replace(/^index$/, '').replace(/\/+$/, '');
}

/** Add class="on" and aria-current="page" to the nav link whose data-page matches this page. */
export function markCurrentPage(html, path) {
  const name = pageName(path);
  return html.replace(/<a ([^>]*?)data-page="([\w-]*)"([^>]*)>/g, (tag, before, page, after) =>
    page === name ? `<a ${before}data-page="${page}" class="on" aria-current="page"${after}>` : tag);
}
