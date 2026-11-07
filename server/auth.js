// Admin password, sessions and rate limiting.
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { getConnInfo } from '@hono/node-server/conninfo';
import { getKv, setKv, now } from './db.js';

const scryptAsync = promisify(scrypt);
const N = 16384, R = 8, P = 1;
export const SESSION_DAYS = 7;
export const MIN_PASSWORD = 10;

/** scrypt$N$r$p$salt$hash, with a random salt per password. */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [scheme, n, r, p, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return timingSafeEqual(actual, expected);
}

/**
 * Make sure an admin password exists. The first run uses ADMIN_PASSWORD, or invents a random one.
 * Returns the password only when it was just generated, so the server can print it once.
 */
export async function ensureAdmin(db, config) {
  if (getKv(db, 'admin')) return { created: false };
  const generated = !config.adminPassword;
  const password = config.adminPassword || randomBytes(12).toString('base64url');
  setKv(db, 'admin', { hash: await hashPassword(password) });
  return { created: true, generated, password: generated ? password : undefined };
}

export const checkAdminPassword = (db, password) => verifyPassword(password, getKv(db, 'admin')?.hash);

export async function setAdminPassword(db, password) {
  setKv(db, 'admin', { hash: await hashPassword(password) });
}

// Sessions: the browser holds a random token; only its SHA-256 hash is stored, so a copy of the database can't be replayed.
const sha = (s) => createHash('sha256').update(s).digest('hex');

export function createSession(db) {
  const token = randomBytes(32).toString('base64url');
  const t = now();
  db.prepare('delete from sessions where expires_at < ?').run(t);
  db.prepare('insert into sessions (token_hash, created_at, expires_at) values (?, ?, ?)').run(sha(token), t, t + SESSION_DAYS * 864e5);
  return token;
}

export function hasSession(db, token) {
  if (!token) return false;
  const row = db.prepare('select expires_at from sessions where token_hash = ?').get(sha(token));
  return Boolean(row && row.expires_at > now());
}

export const endSession = (db, token) => { if (token) db.prepare('delete from sessions where token_hash = ?').run(sha(token)); };
export const endAllSessions = (db) => db.prepare('delete from sessions').run();

/** Allow `max` hits per `windowMs` for each key. In memory, which is plenty for one small server. */
export function createLimiter({ max, windowMs }) {
  const hits = new Map();
  return {
    /** Records a hit; returns false once the key is over its limit. */
    hit(key) {
      const t = Date.now();
      const recent = (hits.get(key) || []).filter((x) => t - x < windowMs);
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
      return recent.length <= max;
    },
    reset(key) { hits.delete(key); },
  };
}

/** The visitor's address. X-Forwarded-For is only believed when TRUST_PROXY=1 (a proxy you control sets it). */
export function clientIp(c, config) {
  if (config.trustProxy) {
    const fwd = c.req.header('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
  }
  try { return getConnInfo(c).remote.address || 'unknown'; } catch { return 'unknown'; }
}
