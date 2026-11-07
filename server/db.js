// SQLite storage using Node's built-in node:sqlite (no native packages to install).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_CONTENT, DEFAULT_FRAMES } from './defaults.js';

const SCHEMA = `
  create table if not exists kv (
    key text primary key, value text not null, updated_at integer not null
  );
  create table if not exists frames (
    id integer primary key autoincrement,
    title text not null, place text not null default '', time text not null default '', tag text not null default '',
    ratio_w integer not null default 4, ratio_h integer not null default 3, seed integer not null default 1,
    art text, src text, alt text not null default '',
    sort integer not null, created_at integer not null
  );
  create table if not exists messages (
    id integer primary key autoincrement,
    name text not null, email text not null, message text not null,
    created_at integer not null, read integer not null default 0
  );
  create table if not exists activity (
    id integer primary key autoincrement,
    kind text not null, text text not null, created_at integer not null
  );
  create table if not exists sessions (
    token_hash text primary key, created_at integer not null, expires_at integer not null
  );
`;

/** Open (and create, if new) the database. Pass ':memory:' in tests. */
export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('pragma journal_mode = wal; pragma foreign_keys = on;');
  db.exec(SCHEMA);
  seed(db);
  return db;
}

export const now = () => Date.now();

const ACTIVITY_KEPT = 200;

/** Record something that happened (shown on the admin dashboard). Only the latest 200 are kept. */
export function logActivity(db, kind, text) {
  const info = db.prepare('insert into activity (kind, text, created_at) values (?, ?, ?)').run(kind, String(text).slice(0, 200), now());
  db.prepare('delete from activity where id <= ?').run(Number(info.lastInsertRowid) - ACTIVITY_KEPT);
}

export function getKv(db, key) {
  const row = db.prepare('select value from kv where key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

/** Store a value. `at` is the "last saved" time; the first-run defaults use 0, meaning nobody has saved them yet. */
export function setKv(db, key, value, at = now()) {
  db.prepare('insert into kv (key, value, updated_at) values (?, ?, ?) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at')
    .run(key, JSON.stringify(value), at);
}

/** First run only: fill in the content and gallery the site already has, so nothing is empty. */
function seed(db) {
  for (const [key, value] of Object.entries(DEFAULT_CONTENT)) if (getKv(db, key) === null) setKv(db, key, value, 0);
  if (getKv(db, 'seeded') === null) {
    const insert = db.prepare('insert into frames (title, place, time, tag, ratio_w, ratio_h, seed, art, alt, sort, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    DEFAULT_FRAMES.forEach((f, i) => insert.run(f.title, f.place, f.time, f.tag, f.ratio[0], f.ratio[1], f.seed, f.title, '', i + 1, now()));
    setKv(db, 'seeded', true);
  }
}
