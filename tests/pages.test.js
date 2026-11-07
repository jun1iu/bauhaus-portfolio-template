import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { isInternalNav } from '../src/core/page-transition.js';
import { normPath } from '../src/components/nav.js';

const click = (o = {}) => ({ defaultPrevented: false, button: 0, ...o });
const here = new URL('https://x.test/');
const link = (href, extra = {}) => ({ href, hasAttribute: () => false, target: '', ...extra });

it('lets static content paint before the startup module finishes', () => {
  const head = readFileSync('partials/head.html', 'utf8');
  expect(head).not.toMatch(/blocking=["']render|html\.preload/);
});

describe('page transitions', () => {
  it('animates plain internal links', () => expect(isInternalNav(link('https://x.test/about.html'), click(), here)).toBe(true));
  it('ignores same-page hashes', () => expect(isInternalNav(link('https://x.test/#top'), click(), here)).toBe(false));
  it('ignores external links, new tabs and modified clicks', () => {
    expect(isInternalNav(link('https://other.test/'), click(), here)).toBe(false);
    expect(isInternalNav(link('https://x.test/a.html', { target: '_blank' }), click(), here)).toBe(false);
    expect(isInternalNav(link('https://x.test/a.html'), click({ metaKey: true }), here)).toBe(false);
  });
});

describe('nav', () => {
  it('treats /x, /x/ and /x/index.html as the same page', () => {
    expect(normPath('/')).toBe('');
    expect(normPath('/site')).toBe(normPath('/site/'));
    expect(normPath('/site/index.html')).toBe(normPath('/site'));
  });
  it('matches clean and .html URLs', () => expect(normPath('/site/about')).toBe(normPath('/site/about.html')));
  it('links every nav item to a page that exists', () => {
    const nav = readFileSync('partials/nav.html', 'utf8');
    const pages = readdirSync('.').filter((f) => f.endsWith('.html'));
    for (const [, f] of nav.matchAll(/%BASE_URL%([\w-]+\.html)/g)) expect(pages).toContain(f);
  });
});
