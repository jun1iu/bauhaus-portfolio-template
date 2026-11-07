// Server settings, read from environment variables (see .env.example).
import { resolve } from 'node:path';

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

export function loadConfig(env = process.env) {
  const dataDir = resolve(env.DATA_DIR || 'data');
  return {
    port: Number(env.PORT) || 3001,
    // Stop accepting new contact messages beyond this many, so spam can't fill the disk.
    maxMessages: Number(env.MAX_MESSAGES) || 5000,
    host: env.HOST || '127.0.0.1',
    dataDir,
    dbFile: resolve(dataDir, 'site.db'),
    uploadsDir: resolve(dataDir, 'uploads'),
    publicDir: resolve(env.PUBLIC_DIR || 'dist'),
    adminDir: resolve(import.meta.dirname, '..', 'admin'),
    adminPassword: env.ADMIN_PASSWORD || '',
    // true behind HTTPS: marks the login cookie Secure
    secureCookies: env.COOKIE_SECURE === '1' || env.NODE_ENV === 'production',
    // true behind a reverse proxy that sets X-Forwarded-For
    trustProxy: env.TRUST_PROXY === '1',
    // Sites (origins) allowed to read /api/site and post to /api/contact from another domain,
    // for example your GitHub Pages address: https://you.github.io
    corsOrigins: list(env.CORS_ORIGINS),
  };
}
