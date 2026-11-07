import { serve } from '@hono/node-server';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../../server/db.js';
import { ensureAdmin } from '../../server/auth.js';
import { createApp } from '../../server/app.js';
import { loadConfig } from '../../server/config.js';

export const PASSWORD = 'test-password-123';

// A real 1x1 PNG.
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** Start the whole app on a random port with an in-memory database and temp folders. */
export async function startServer({ env = {}, limits } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jz-test-'));
  const publicDir = join(dir, 'public');
  mkdirSync(publicDir);
  writeFileSync(join(publicDir, 'index.html'), '<h1>home</h1>');
  writeFileSync(join(publicDir, '404.html'), '<h1>missing</h1>');
  const config = loadConfig({ DATA_DIR: dir, PUBLIC_DIR: publicDir, ADMIN_PASSWORD: PASSWORD, ...env });
  const db = openDb(':memory:');
  await ensureAdmin(db, config);
  const app = createApp({ db, config, limits });
  const server = await new Promise((resolve) => { const s = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, db, config, dir, close: () => new Promise((r) => { server.close(r); server.closeAllConnections?.(); }) };
}

export async function login(base, password = PASSWORD) {
  const res = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  return { res, cookie };
}

/** fetch with the admin cookie. */
export const as = (cookie) => (url, init = {}) => fetch(url, { ...init, headers: { ...(init.headers || {}), cookie } });

export const jsonBody = (obj) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

export function photoForm(fields = {}, { bytes = PNG, type = 'image/png', name = 'x.png' } = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ title: 'Test photo', place: 'Somewhere', time: 'Noon', tag: 'Test', alt: 'A test', ratioW: '3', ratioH: '2', ...fields })) f.set(k, v);
  if (bytes) f.set('photo', new Blob([bytes], { type }), name);
  return f;
}
