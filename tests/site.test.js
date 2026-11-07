import { describe, it, expect } from 'vitest';
import { fetchSite, isSiteData, safeHref, toFrame, server } from '../src/core/site.js';

const data = { settings: {}, home: {}, about: {}, frames: [] };
const reply = (body, { ok = true, type = 'application/json' } = {}) => async () => ({ ok, headers: { get: () => type }, json: async () => body });

describe('fetchSite', () => {
  it('returns the content when the server answers', async () => {
    expect(await fetchSite(reply(data))).toEqual(data);
    expect(server.online).toBe(true);
  });
  it('returns null instead of throwing when the server is missing or wrong', async () => {
    expect(await fetchSite(async () => { throw new Error('offline'); })).toBeNull();
    expect(await fetchSite(reply(data, { ok: false }))).toBeNull();
    expect(await fetchSite(reply(data, { type: 'text/html' }))).toBeNull(); // static hosting answers /api/site with a 404 page
    expect(await fetchSite(reply({ nope: true }))).toBeNull();
  });
  it('gives up after the timeout', async () => {
    const hang = (url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted'))));
    const t0 = Date.now();
    expect(await fetchSite(hang, { timeout: 30 })).toBeNull();
    expect(Date.now() - t0).toBeLessThan(500);
  });
  it('asks the configured address', async () => {
    let asked;
    await fetchSite(async (url) => { asked = url; return { ok: false }; }, { base: 'https://api.example.com' });
    expect(asked).toBe('https://api.example.com/api/site');
  });
});

describe('isSiteData', () => {
  it('needs all four parts', () => {
    expect(isSiteData(data)).toBe(true);
    expect(isSiteData({ ...data, frames: undefined })).toBe(false);
    expect(isSiteData(null)).toBe(false);
  });
});

describe('safeHref', () => {
  it('keeps web and mail links and refuses anything that could run code', () => {
    expect(safeHref('https://example.com/a')).toBe('https://example.com/a');
    expect(safeHref('mailto:a@b.co')).toBe('mailto:a@b.co');
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'vbscript:x', '//evil.com', 'not a url', '', null]) expect(safeHref(bad), String(bad)).toBeNull();
  });
});

describe('toFrame', () => {
  const art = { 'Lorem Ipsum': { bg: 'y', shapes: [] } };
  it('maps an illustrated frame to its drawing', () => {
    expect(toFrame({ title: 'Lorem Ipsum', place: 'a', time: 'b', tag: 'c', ratio: [4, 5], seed: 1, art: 'Lorem Ipsum', src: null, alt: '' }, { art })).toMatchObject({ art: art['Lorem Ipsum'], src: null, ratio: [4, 5] });
  });
  it('points photos at the server', () => {
    const f = toFrame({ title: 'T', ratio: [3, 2], seed: 1, art: null, src: '/uploads/a.png', alt: 'alt' }, { base: 'https://api.example.com', art });
    expect(f.src).toBe('https://api.example.com/uploads/a.png');
    expect(f.alt).toBe('alt');
  });
  it('falls back to the title for alt text and "Photos" for the tag', () => {
    const f = toFrame({ title: 'T', ratio: [1, 1], seed: 1, art: null, src: '/uploads/a.png', alt: '', tag: '' }, { base: '', art });
    expect(f).toMatchObject({ alt: 'T', tag: 'Photos' });
  });
  it('drops a frame with neither a photo nor a known drawing', () => {
    expect(toFrame({ title: 'T', ratio: [1, 1], seed: 1, art: 'Unknown', src: null }, { art })).toBeNull();
  });
});
