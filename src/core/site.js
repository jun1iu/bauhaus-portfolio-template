// Content from the site's own server (see server/ and admin/). Everything here is optional:
// if the server isn't reachable (for example on static hosting) the pages keep the content already in them.

/** Where the API lives. Empty means the same address as the site; set VITE_API_BASE when it's elsewhere. */
export const API_BASE = (import.meta.env?.VITE_API_BASE || '').replace(/\/+$/, '');

/** Set once we know whether the server answered, so the contact form knows where to send messages. */
export const server = { online: false };

export function isSiteData(d) {
  return Boolean(d && typeof d === 'object' && d.settings && d.home && d.about && Array.isArray(d.frames));
}

/** Fetch all the content in one request. Resolves to null on any problem; never throws. */
export async function fetchSite(fetchFn = globalThis.fetch, { timeout = 1500, base = API_BASE } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetchFn(`${base}/api/site`, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return null;
    const data = await res.json();
    if (!isSiteData(data)) return null;
    server.online = true;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** A link that is safe to put in href: http, https or mailto only. Returns null for anything else. */
export function safeHref(url) {
  try {
    const u = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.href : null;
  } catch { return null; }
}

/** Turn a frame from the API into the shape the gallery uses. Returns null if it has nothing to show. */
export function toFrame(f, { base = API_BASE, art = {} } = {}) {
  const drawing = f.art ? art[f.art] : undefined;
  const src = f.src ? (f.src.startsWith('/') ? base + f.src : f.src) : null;
  if (!drawing && !src) return null;
  return { title: f.title, place: f.place || '', time: f.time || '', tag: f.tag || 'Photos', ratio: f.ratio, seed: f.seed, art: drawing, src, alt: f.alt || f.title };
}
