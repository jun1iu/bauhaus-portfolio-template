// The web app: public API, admin API, admin pages, uploaded photos, and the built site.
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { bodyLimit } from 'hono/body-limit';
import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getKv, setKv, now, logActivity } from './db.js';
import { ART_KEYS } from './defaults.js';
import { validateContent, validateFrame, validateMessage, CONTENT_KEYS } from './validate.js';
import { checkAdminPassword, setAdminPassword, createSession, hasSession, endSession, endAllSessions, createLimiter, clientIp, SESSION_DAYS, MIN_PASSWORD } from './auth.js';
import { securityHeaders, isSameOrigin, isAllowedOrigin, publicCors } from './security.js';
import { saveUpload, removeUpload, MAX_UPLOAD_BYTES } from './uploads.js';
import { dirServer } from './static.js';

const COOKIE = 'session';
const CONTENT_LABELS = { home: 'Home page', about: 'About page', settings: 'Settings' };
const tooLarge = (c) => c.json({ error: 'That request is too large.' }, 413);
const json = (max) => bodyLimit({ maxSize: max, onError: tooLarge });
const readJson = async (c) => { try { return await c.req.json(); } catch { return null; } };

const frameOut = (r) => ({ id: r.id, title: r.title, place: r.place, time: r.time, tag: r.tag, ratio: [r.ratio_w, r.ratio_h], seed: r.seed, art: r.art, src: r.src, alt: r.alt });
const messageOut = (r) => ({ id: r.id, name: r.name, email: r.email, message: r.message, createdAt: r.created_at, read: Boolean(r.read) });

export function createApp({ db, config, limits = {} }) {
  const app = new Hono();
  const loginLimiter = createLimiter({ max: 8, windowMs: 15 * 60e3, ...limits.login });
  const contactLimiter = createLimiter({ max: 5, windowMs: 60 * 60e3, ...limits.contact });
  const frames = () => db.prepare('select * from frames order by sort, id').all();

  app.use('*', securityHeaders());
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Something went wrong on the server.' }, 500);
  });

  // ---------- public API ----------
  app.use('/api/site', publicCors(config));
  app.use('/api/contact', publicCors(config));

  app.get('/api/health', (c) => c.json({ ok: true }));

  app.get('/api/site', (c) => {
    c.header('Cache-Control', 'no-cache');
    return c.json({
      settings: getKv(db, 'settings'),
      home: getKv(db, 'home'),
      about: getKv(db, 'about'),
      frames: frames().map(frameOut),
    });
  });

  app.post('/api/contact', json(16 * 1024), async (c) => {
    if (!isAllowedOrigin(c, config)) return c.json({ error: 'Not allowed.' }, 403);
    const body = await readJson(c);
    if (!body || typeof body !== 'object') return c.json({ error: 'Send the message as JSON.' }, 400);
    if (body.website || body.honeypot) return c.json({ ok: true }); // a bot filled the hidden field: pretend it worked
    if (!contactLimiter.hit(clientIp(c, config))) return c.json({ error: 'You have sent a few messages already. Please try again later.' }, 429);
    const v = validateMessage(body);
    if (!v.ok) return c.json({ error: 'Please check the form.', errors: v.errors }, 422);
    if (db.prepare('select count(*) n from messages').get().n >= config.maxMessages) return c.json({ error: 'The inbox is full right now. Please try again later.' }, 503);
    db.prepare('insert into messages (name, email, message, created_at) values (?, ?, ?, ?)').run(v.value.name, v.value.email, v.value.message, now());
    logActivity(db, 'message', `New message from ${v.value.name}`);
    return c.json({ ok: true });
  });

  // ---------- admin API ----------
  const admin = new Hono();

  admin.use('*', async (c, next) => {
    if (!['GET', 'HEAD'].includes(c.req.method) && !isSameOrigin(c, config)) return c.json({ error: 'Not allowed.' }, 403);
    c.header('Cache-Control', 'no-store');
    await next();
  });

  admin.post('/login', json(2048), async (c) => {
    const ip = clientIp(c, config);
    if (!loginLimiter.hit(ip)) return c.json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
    const body = await readJson(c);
    const ok = typeof body?.password === 'string' && body.password.length <= 500 && await checkAdminPassword(db, body.password);
    if (!ok) return c.json({ error: 'That password isn’t right.' }, 401);
    loginLimiter.reset(ip);
    setCookie(c, COOKIE, createSession(db), { httpOnly: true, sameSite: 'Strict', secure: config.secureCookies, path: '/', maxAge: SESSION_DAYS * 86400 });
    return c.json({ ok: true });
  });

  admin.post('/logout', (c) => {
    endSession(db, getCookie(c, COOKIE));
    deleteCookie(c, COOKIE, { path: '/' });
    return c.json({ ok: true });
  });

  // everything below needs a signed-in admin
  admin.use('*', async (c, next) => {
    if (!hasSession(db, getCookie(c, COOKIE))) return c.json({ error: 'Please sign in.' }, 401);
    await next();
  });

  admin.get('/me', (c) => c.json({ ok: true, unread: db.prepare('select count(*) n from messages where read = 0').get().n }));

  admin.post('/password', json(2048), async (c) => {
    const body = await readJson(c);
    if (!body || typeof body.current !== 'string' || typeof body.next !== 'string') return c.json({ error: 'Send your current and new password.' }, 400);
    if (!await checkAdminPassword(db, body.current)) return c.json({ error: 'Your current password isn’t right.' }, 401);
    if (body.next.length < MIN_PASSWORD || body.next.length > 200) return c.json({ error: `Use at least ${MIN_PASSWORD} characters.` }, 422);
    await setAdminPassword(db, body.next);
    logActivity(db, 'account', 'Changed the admin password');
    endAllSessions(db); // signs out every browser, including this one's old session
    setCookie(c, COOKIE, createSession(db), { httpOnly: true, sameSite: 'Strict', secure: config.secureCookies, path: '/', maxAge: SESSION_DAYS * 86400 });
    return c.json({ ok: true });
  });

  // dashboard: everything the overview screen shows, in one request
  admin.get('/dashboard', (c) => {
    const msgs = db.prepare('select count(*) total, coalesce(sum(read = 0), 0) unread from messages').get();
    const fr = db.prepare('select count(*) total, coalesce(sum(src is not null), 0) photos from frames').get();
    const updated = Object.fromEntries(db.prepare("select key, updated_at from kv where key in ('home', 'about', 'settings')").all().map((r) => [r.key, r.updated_at]));
    return c.json({
      messages: { total: msgs.total, unread: msgs.unread, recent: db.prepare('select * from messages order by created_at desc, id desc limit 3').all().map(messageOut) },
      frames: { total: fr.total, photos: fr.photos, illustrations: fr.total - fr.photos },
      content: Object.keys(CONTENT_LABELS).map((key) => ({ key, label: CONTENT_LABELS[key], updatedAt: updated[key] || null })),
      activity: db.prepare('select id, kind, text, created_at from activity order by id desc limit 12').all().map((r) => ({ id: r.id, kind: r.kind, text: r.text, at: r.created_at })),
    });
  });

  // content: settings, home, about
  admin.get('/content', (c) => c.json(Object.fromEntries(CONTENT_KEYS.map((k) => [k, getKv(db, k)]))));
  admin.put('/content/:key', json(64 * 1024), async (c) => {
    const key = c.req.param('key');
    if (!CONTENT_KEYS.includes(key)) return c.json({ error: 'Unknown section.' }, 404);
    const body = await readJson(c);
    if (body === null) return c.json({ error: 'Send JSON.' }, 400);
    const v = validateContent(key, body);
    if (!v.ok) return c.json({ error: 'Please fix the highlighted fields.', errors: v.errors }, 422);
    setKv(db, key, v.value);
    logActivity(db, 'content', `Saved the ${CONTENT_LABELS[key]}`);
    return c.json({ ok: true, value: v.value });
  });

  // gallery
  const frameId = (c) => { const n = Number(c.req.param('id')); return Number.isInteger(n) ? n : null; };
  const formFields = async (c) => {
    const form = await c.req.formData().catch(() => null);
    if (!form) return null;
    const fields = {};
    for (const [k, v] of form.entries()) if (typeof v === 'string') fields[k] = v;
    const photo = form.get('photo');
    return { fields, photo: photo && typeof photo !== 'string' && photo.size > 0 ? photo : null };
  };

  admin.get('/frames', (c) => c.json({ frames: frames().map(frameOut), maxUploadBytes: MAX_UPLOAD_BYTES }));

  admin.post('/frames', json(MAX_UPLOAD_BYTES + 64 * 1024), async (c) => {
    const form = await formFields(c);
    if (!form) return c.json({ error: 'Send the photo as a form upload.' }, 400);
    const v = validateFrame(form.fields, { artKeys: ART_KEYS });
    if (!v.ok) return c.json({ error: 'Please fix the highlighted fields.', errors: v.errors }, 422);
    if (!form.photo) return c.json({ error: 'Choose a photo.', errors: { photo: 'Choose a photo.' } }, 422);
    const saved = await saveUpload(form.photo, config.uploadsDir);
    if (saved.error) return c.json({ error: saved.error, errors: { photo: saved.error } }, 422);
    const f = v.value;
    const sort = (db.prepare('select coalesce(max(sort), 0) m from frames').get().m) + 1;
    const info = db.prepare('insert into frames (title, place, time, tag, ratio_w, ratio_h, seed, src, alt, sort, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(f.title, f.place, f.time, f.tag, f.ratioW, f.ratioH, randomInt(1, 1000), saved.src, f.alt, sort, now());
    logActivity(db, 'gallery', `Added the photo “${f.title}”`);
    return c.json({ ok: true, frame: frameOut(db.prepare('select * from frames where id = ?').get(info.lastInsertRowid)) }, 201);
  });

  admin.put('/frames/:id', json(MAX_UPLOAD_BYTES + 64 * 1024), async (c) => {
    const id = frameId(c);
    const row = id === null ? null : db.prepare('select * from frames where id = ?').get(id);
    if (!row) return c.json({ error: 'That frame no longer exists.' }, 404);
    const form = await formFields(c);
    if (!form) return c.json({ error: 'Send the changes as a form.' }, 400);
    const v = validateFrame(form.fields, { partial: true });
    if (!v.ok) return c.json({ error: 'Please fix the highlighted fields.', errors: v.errors }, 422);
    const f = v.value;
    const removing = form.fields.removePhoto === '1';
    if (removing && !row.art) return c.json({ error: 'This frame has no illustration to fall back to, so delete it instead.', errors: { photo: 'Can’t remove the only image.' } }, 422);
    let src = row.src;
    if (form.photo) {
      const saved = await saveUpload(form.photo, config.uploadsDir);
      if (saved.error) return c.json({ error: saved.error, errors: { photo: saved.error } }, 422);
      src = saved.src;
    } else if (removing) src = null;
    db.prepare('update frames set title = ?, place = ?, time = ?, tag = ?, alt = ?, ratio_w = ?, ratio_h = ?, src = ? where id = ?').run(
      f.title ?? row.title, f.place ?? row.place, f.time ?? row.time, f.tag ?? row.tag, f.alt ?? row.alt,
      f.ratioW ?? row.ratio_w, f.ratioH ?? row.ratio_h, src, id);
    if (src !== row.src) await removeUpload(row.src, config.uploadsDir);
    logActivity(db, 'gallery', `Edited “${f.title ?? row.title}”`);
    return c.json({ ok: true, frame: frameOut(db.prepare('select * from frames where id = ?').get(id)) });
  });

  admin.delete('/frames/:id', async (c) => {
    const id = frameId(c);
    const row = id === null ? null : db.prepare('select * from frames where id = ?').get(id);
    if (!row) return c.json({ error: 'That frame no longer exists.' }, 404);
    db.prepare('delete from frames where id = ?').run(id);
    await removeUpload(row.src, config.uploadsDir);
    logActivity(db, 'gallery', `Deleted “${row.title}”`);
    return c.json({ ok: true });
  });

  admin.post('/frames/order', json(8 * 1024), async (c) => {
    const body = await readJson(c);
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : null;
    const existing = db.prepare('select id from frames').all().map((r) => r.id);
    if (!ids || ids.length !== existing.length || new Set(ids).size !== ids.length || !ids.every((i) => existing.includes(i))) {
      return c.json({ error: 'The order must list every frame exactly once.' }, 422);
    }
    const upd = db.prepare('update frames set sort = ? where id = ?');
    ids.forEach((id, i) => upd.run(i + 1, id));
    logActivity(db, 'gallery', 'Reordered the gallery');
    return c.json({ ok: true });
  });

  // messages
  admin.get('/messages', (c) => c.json({ messages: db.prepare('select * from messages order by created_at desc, id desc limit 500').all().map(messageOut) }));
  admin.patch('/messages/:id', json(1024), async (c) => {
    const id = Number(c.req.param('id'));
    const body = await readJson(c);
    if (!Number.isInteger(id) || typeof body?.read !== 'boolean') return c.json({ error: 'Send { "read": true or false }.' }, 400);
    const r = db.prepare('update messages set read = ? where id = ?').run(body.read ? 1 : 0, id);
    return r.changes ? c.json({ ok: true }) : c.json({ error: 'That message no longer exists.' }, 404);
  });
  admin.delete('/messages/:id', (c) => {
    const r = db.prepare('delete from messages where id = ?').run(Number(c.req.param('id')));
    return r.changes ? c.json({ ok: true }) : c.json({ error: 'That message no longer exists.' }, 404);
  });

  app.route('/api/admin', admin);
  app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));

  // ---------- pages and files ----------
  const serveAdmin = dirServer(config.adminDir);
  const serveUploads = dirServer(config.uploadsDir, { immutable: () => true });
  const servePublic = dirServer(config.publicDir, { immutable: (p) => p.startsWith('assets/') });
  const readOnly = (c) => ['GET', 'HEAD'].includes(c.req.method);

  app.get('/admin', (c) => c.redirect('/admin/'));
  app.get('/admin/*', async (c) => (await serveAdmin(c.req.path.slice('/admin/'.length) || 'index.html', { method: c.req.method })) || c.notFound());
  app.get('/uploads/*', async (c) => (await serveUploads(c.req.path.slice('/uploads/'.length), { method: c.req.method })) || c.notFound());

  app.get('*', async (c) => {
    if (!existsSync(config.publicDir)) return c.text('The site has not been built yet. Run "npm run build", or use "npm run dev" for the site.', 404);
    const hit = await servePublic(c.req.path.slice(1) || 'index.html', { method: c.req.method });
    if (hit) return hit;
    const missing = await servePublic('404.html');
    return missing ? new Response(missing.body, { status: 404, headers: missing.headers }) : c.text('Not found.', 404);
  });

  app.notFound((c) => (readOnly(c) ? c.text('Not found.', 404) : c.json({ error: 'Not found.' }, 404)));
  return app;
}
