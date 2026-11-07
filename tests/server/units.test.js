import { describe, it, expect } from 'vitest';
import { sniffImage } from '../../server/uploads.js';
import { validateContent, validateFrame, validateMessage } from '../../server/validate.js';
import { hashPassword, verifyPassword, createLimiter } from '../../server/auth.js';
import { PNG } from './helpers.js';
import { isSameOrigin } from '../../server/security.js';

describe('same-origin checks', () => {
  const check = (origin, proto, trustProxy = false) => isSameOrigin({
    req: {
      url: 'http://example.com/api/admin/login',
      header: (name) => ({ origin, 'x-forwarded-proto': proto })[name],
    },
  }, { trustProxy });

  it('compares the scheme and ignores forwarded protocol by default', () => {
    expect(check('http://example.com')).toBe(true);
    expect(check('https://example.com', 'https')).toBe(false);
  });

  it('uses the public scheme when the proxy is trusted', () => {
    expect(check('https://example.com', 'https', true)).toBe(true);
    expect(check('http://example.com', 'https', true)).toBe(false);
  });
});

describe('image sniffing', () => {
  it('recognises real images by their first bytes', () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toMatchObject({ ext: 'jpg' });
    expect(sniffImage(new Uint8Array(PNG))).toMatchObject({ ext: 'png' });
    const webp = new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')]);
    expect(sniffImage(webp)).toMatchObject({ ext: 'webp' });
    const avif = new Uint8Array([0, 0, 0, 0x1c, ...Buffer.from('ftypavif')]);
    expect(sniffImage(avif)).toMatchObject({ ext: 'avif' });
  });
  it('refuses everything else', () => {
    for (const text of ['<svg></svg>', '<script>', 'GIF89a', 'MZ', '']) expect(sniffImage(new Uint8Array(Buffer.from(text)))).toBeNull();
  });
});

describe('validation', () => {
  it('only allows http, https and mailto links', () => {
    const ok = (u) => validateContent('settings', { base: 'a', from: 'b', openTo: 'c', social: { linkedin: u } }).ok;
    expect(ok('https://example.com/in/x')).toBe(true);
    expect(ok('mailto:me@example.com')).toBe(true);
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.y', 'example.com', '//evil.com', 'vbscript:x']) expect(ok(bad), bad).toBe(false);
  });
  it('trims and collapses whitespace, and rejects control characters', () => {
    const r = validateContent('home', { role: '  Hello   there  ', statement: 'x', hot: '' });
    expect(r.value.role).toBe('Hello there');
    expect(validateContent('home', { role: 'bad\u0000text', statement: 'x' }).ok).toBe(false);
  });
  it('limits list sizes', () => {
    const many = Array.from({ length: 30 }, () => ({ key: 'k', value: 'v' }));
    expect(validateContent('about', { lede: 'l', specs: many, experience: [], skills: [], education: [] }).ok).toBe(false);
  });
  it('validates frames with a ratio and rejects unknown art', () => {
    expect(validateFrame({ title: 'T', ratioW: 4, ratioH: 3 }).ok).toBe(true);
    expect(validateFrame({ title: 'T', ratioW: 0, ratioH: 3 }).ok).toBe(false);
    expect(validateFrame({ title: 'T', ratioW: 4, ratioH: 3, art: 'Made Up' }, { artKeys: ['Real'] }).ok).toBe(false);
    expect(validateFrame({ place: 'only this' }, { partial: true }).value).toEqual({ place: 'only this' });
  });
  it('checks contact messages', () => {
    expect(validateMessage({ name: 'A', email: 'a@b.co', message: 'long enough message' }).ok).toBe(true);
    expect(validateMessage({ name: 'A', email: 'a@b', message: 'long enough message' }).ok).toBe(false);
    expect(validateMessage('nope').ok).toBe(false);
  });
  it('refuses emails that could add hidden recipients to a reply link', () => {
    for (const email of ['x@y.com?bcc=a@b.co', 'x@y.com&cc=a@b.co', 'a@b.co,c@d.co', 'a@b.co;c@d.co', '<a@b.co>', '"a"@b.co', 'a=b@c.co']) {
      expect(validateMessage({ name: 'A', email, message: 'long enough message' }).ok, email).toBe(false);
    }
    expect(validateMessage({ name: 'A', email: 'first.last+tag@sub.example.co.uk', message: 'long enough message' }).ok).toBe(true);
  });
});

describe('passwords and limits', () => {
  it('salts every hash and verifies correctly', async () => {
    const a = await hashPassword('same'), b = await hashPassword('same');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same', a)).toBe(true);
    expect(await verifyPassword('different', a)).toBe(false);
    expect(await verifyPassword('same', 'not-a-hash')).toBe(false);
  });
  it('limiter counts per key and can be reset', () => {
    const l = createLimiter({ max: 2, windowMs: 1000 });
    expect([l.hit('a'), l.hit('a'), l.hit('a'), l.hit('b')]).toEqual([true, true, false, true]);
    l.reset('a');
    expect(l.hit('a')).toBe(true);
  });
});
