// A small, safe static file server for the built site, the admin app and uploaded photos.
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.map': 'application/json',
};

async function fileAt(root, rel) {
  const target = normalize(join(root, rel));
  if (target !== root && !target.startsWith(root + sep)) return null; // ../ tricks
  try {
    const s = await stat(target);
    if (s.isDirectory()) return fileAt(root, join(rel, 'index.html'));
    return { path: target, size: s.size };
  } catch { return null; }
}

/**
 * Returns a handler(rel) that answers with the file at rel inside root, or null if there is none.
 * `immutable` marks files as never changing (hashed assets and uploaded photos).
 */
export function dirServer(root, { immutable = () => false } = {}) {
  return async function serve(rel, { method = 'GET' } = {}) {
    let decoded;
    try { decoded = decodeURIComponent(rel); } catch { return null; }
    if (decoded.includes('\0')) return null;
    const file = await fileAt(root, decoded);
    if (!file) return null;
    const ext = extname(file.path).toLowerCase();
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': immutable(decoded) ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Length': String(file.size),
    };
    return new Response(method === 'HEAD' ? null : await readFile(file.path), { headers });
  };
}
