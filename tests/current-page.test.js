import { describe, it, expect } from 'vitest';
import { pageName, markCurrentPage } from '../build/current-page.js';

const nav = `<a href="%BASE_URL%" data-page="">Home</a><a href="%BASE_URL%about.html" data-page="about">About</a><a href="%BASE_URL%gallery.html" data-page="gallery">Frames</a>`;

describe('current page in the nav', () => {
  it('names pages from their path', () => {
    expect(pageName('/')).toBe('');
    expect(pageName('/index.html')).toBe('');
    expect(pageName('/about.html')).toBe('about');
    expect(pageName('/gallery')).toBe('gallery');
  });
  it('marks only the matching link', () => {
    const out = markCurrentPage(nav, '/about.html');
    expect(out.match(/class="on"/g)).toHaveLength(1);
    expect(out).toContain('data-page="about" class="on" aria-current="page"');
    expect(out).not.toContain('data-page="gallery" class="on"');
  });
  it('marks Home on the home page', () => {
    expect(markCurrentPage(nav, '/')).toContain('data-page="" class="on" aria-current="page"');
  });
  it('marks nothing on a page without a link, like the 404', () => {
    expect(markCurrentPage(nav, '/404.html')).toBe(nav);
  });
});
