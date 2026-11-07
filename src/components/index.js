// Component registry: data-component="name" in HTML → module here.
// Each module exports mount(element). To add one, create the file and list it below.

export const registry = {
  nav: () => import('./nav.js'),
  statement: () => import('./statement.js'),
  compose: () => import('./compose.js'),
  gallery: () => import('./gallery.js'),
  lightbox: () => import('./lightbox.js'),
  film: () => import('./film.js'),
  clock: () => import('./clock.js'),
  year: () => import('./year.js'),
  'contact-form': () => import('./contact-form.js'),
};
