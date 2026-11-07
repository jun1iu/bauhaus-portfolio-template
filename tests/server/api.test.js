import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, login, as, jsonBody, photoForm, PASSWORD, PNG } from './helpers.js';

let s, req;
beforeAll(async () => {
  s = await startServer({ env: { CORS_ORIGINS: 'https://friend.example' }, limits: { login: { max: 20 }, contact: { max: 50 } } });
  req = as((await login(s.base)).cookie);
});
afterAll(() => s.close());

const get = (path, init) => fetch(s.base + path, init);

describe('public API', () => {
  it('serves all the site content in one call', async () => {
    const data = await (await get('/api/site')).json();
    expect(Object.keys(data).sort()).toEqual(['about', 'frames', 'home', 'settings']);
    expect(data.frames).toHaveLength(9);
    expect(data.frames[0]).toMatchObject({ title: 'Lorem Ipsum', art: 'Lorem Ipsum', ratio: [4, 5], src: null });
    expect(data.about.experience[0].bullets.length).toBeGreaterThan(0);
  });
  it('sets security headers', async () => {
    const res = await get('/api/site');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
  });
  it('answers unknown API paths with JSON 404', async () => {
    const res = await get('/api/nope');
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBeTruthy();
  });
});

describe('signing in', () => {
  it('keeps every admin route locked without a session', async () => {
    for (const [method, path] of [['GET', '/api/admin/me'], ['GET', '/api/admin/content'], ['PUT', '/api/admin/content/home'], ['GET', '/api/admin/frames'], ['POST', '/api/admin/frames'], ['DELETE', '/api/admin/frames/1'], ['GET', '/api/admin/messages'], ['GET', '/api/admin/dashboard'], ['POST', '/api/admin/password']]) {
      const res = await get(path, { method });
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });
  it('rejects a wrong password and accepts the right one with a locked-down cookie', async () => {
    expect((await login(s.base, 'wrong-password')).res.status).toBe(401);
    const { res, cookie } = await login(s.base);
    expect(res.status).toBe(200);
    const header = res.headers.get('set-cookie');
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Strict/i);
    expect((await as(cookie)(s.base + '/api/admin/me')).status).toBe(200);
  });
  it('ends the session on logout', async () => {
    const { cookie } = await login(s.base);
    await as(cookie)(s.base + '/api/admin/logout', { method: 'POST' });
    expect((await as(cookie)(s.base + '/api/admin/me')).status).toBe(401);
  });
  it('rejects a session token it did not issue', async () => {
    expect((await as('session=forged-token')(s.base + '/api/admin/me')).status).toBe(401);
  });
  it('refuses admin changes that come from another website', async () => {
    const res = await req(s.base + '/api/admin/content/home', { method: 'PUT', ...jsonBody({}), headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' } });
    expect(res.status).toBe(403);
    const res2 = await req(s.base + '/api/admin/content/home', { method: 'PUT', ...jsonBody({}), headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' } });
    expect(res2.status).toBe(403);
  });
});

describe('login rate limit', () => {
  it('locks out repeated wrong passwords', async () => {
    const t = await startServer({ limits: { login: { max: 3 } } });
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await login(t.base, 'nope')).res.status);
    expect(codes).toEqual([401, 401, 401, 429, 429]);
    expect((await login(t.base)).res.status).toBe(429); // even the right password waits
    await t.close();
  });
});

describe('content', () => {
  it('saves settings and shows them on the public site', async () => {
    const settings = { base: 'Tokyo', from: 'Amet Consectetur', openTo: 'Anything good', availability: 'Busy', social: { linkedin: 'https://linkedin.com/in/jun', github: '', instagram: '', x: '' } };
    const res = await req(s.base + '/api/admin/content/settings', { method: 'PUT', ...jsonBody(settings) });
    expect(res.status).toBe(200);
    expect((await (await get('/api/site')).json()).settings).toMatchObject({ base: 'Tokyo', social: { linkedin: 'https://linkedin.com/in/jun' } });
  });
  it('rejects dangerous links and reports which field', async () => {
    const res = await req(s.base + '/api/admin/content/settings', { method: 'PUT', ...jsonBody({ base: 'x', from: 'y', openTo: 'z', social: { linkedin: 'javascript:alert(1)', github: 'data:text/html,hi' } }) });
    expect(res.status).toBe(422);
    const { errors } = await res.json();
    expect(errors['social.linkedin']).toBeTruthy();
    expect(errors['social.github']).toBeTruthy();
  });
  it('checks nested lists and drops unknown fields', async () => {
    const about = (await (await req(s.base + '/api/admin/content')).json()).about;
    about.experience[0].bullets = ['ok', ''];
    about.sneaky = '<script>';
    const bad = await req(s.base + '/api/admin/content/about', { method: 'PUT', ...jsonBody(about) });
    expect(bad.status).toBe(422);
    expect(Object.keys((await bad.json()).errors)).toContain('experience.0.bullets.1');
    about.experience[0].bullets = ['ok'];
    const good = await req(s.base + '/api/admin/content/about', { method: 'PUT', ...jsonBody(about) });
    expect(good.status).toBe(200);
    expect((await good.json()).value.sneaky).toBeUndefined();
  });
  it('enforces length limits', async () => {
    const res = await req(s.base + '/api/admin/content/home', { method: 'PUT', ...jsonBody({ role: 'x'.repeat(500), statement: 's', hot: '' }) });
    expect(res.status).toBe(422);
    expect((await res.json()).errors.role).toMatch(/under 200/);
  });
  it('404s on an unknown section', async () => {
    expect((await req(s.base + '/api/admin/content/admin', { method: 'PUT', ...jsonBody({}) })).status).toBe(404);
  });
});

describe('gallery', () => {
  let created;
  it('uploads a photo, stores it under a random name and serves it safely', async () => {
    const res = await req(s.base + '/api/admin/frames', { method: 'POST', body: photoForm() });
    expect(res.status).toBe(201);
    created = (await res.json()).frame;
    expect(created.src).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/);
    expect(created.ratio).toEqual([3, 2]);
    expect(existsSync(join(s.dir, 'uploads', created.src.split('/').pop()))).toBe(true);
    const file = await get(created.src);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toBe('image/png');
    expect(file.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.from(await file.arrayBuffer()).equals(PNG)).toBe(true);
  });
  it('shows it last in the public gallery', async () => {
    const { frames } = await (await get('/api/site')).json();
    expect(frames.at(-1)).toMatchObject({ title: 'Test photo', src: created.src, art: null });
  });
  it('rejects a file that is not really an image, whatever its name or type says', async () => {
    const res = await req(s.base + '/api/admin/frames', { method: 'POST', body: photoForm({}, { bytes: Buffer.from('<script>alert(1)</script>'), type: 'image/jpeg', name: 'evil.jpg' }) });
    expect(res.status).toBe(422);
    expect((await res.json()).errors.photo).toMatch(/JPEG, PNG, WebP or AVIF/);
  });
  it('rejects SVG uploads (they can carry scripts)', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>');
    expect((await req(s.base + '/api/admin/frames', { method: 'POST', body: photoForm({}, { bytes: svg, type: 'image/svg+xml', name: 'a.svg' }) })).status).toBe(422);
  });
  it('rejects oversized uploads', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)]);
    const res = await req(s.base + '/api/admin/frames', { method: 'POST', body: photoForm({}, { bytes: big }) });
    expect([413, 422]).toContain(res.status);
  });
  it('requires a photo and a title', async () => {
    expect((await req(s.base + '/api/admin/frames', { method: 'POST', body: photoForm({}, { bytes: null }) })).status).toBe(422);
    const res = await req(s.base + '/api/admin/frames', { method: 'POST', body: photoForm({ title: '  ' }) });
    expect(res.status).toBe(422);
    expect((await res.json()).errors.title).toBeTruthy();
  });
  it('edits text, and replacing the photo deletes the old file', async () => {
    const oldFile = join(s.dir, 'uploads', created.src.split('/').pop());
    const f = new FormData();
    f.set('title', 'Renamed'); f.set('photo', new Blob([PNG], { type: 'image/png' }), 'new.png');
    const res = await req(s.base + `/api/admin/frames/${created.id}`, { method: 'PUT', body: f });
    expect(res.status).toBe(200);
    const next = (await res.json()).frame;
    expect(next.title).toBe('Renamed');
    expect(next.src).not.toBe(created.src);
    expect(next.place).toBe('Somewhere'); // untouched fields stay
    expect(existsSync(oldFile)).toBe(false);
    created = next;
  });
  it('reorders frames and refuses a bad order', async () => {
    const { frames } = await (await req(s.base + '/api/admin/frames')).json();
    const ids = frames.map((f) => f.id);
    const reversed = [...ids].reverse();
    expect((await req(s.base + '/api/admin/frames/order', { method: 'POST', ...jsonBody({ ids: reversed }) })).status).toBe(200);
    expect((await (await get('/api/site')).json()).frames[0].title).toBe('Renamed');
    expect((await req(s.base + '/api/admin/frames/order', { method: 'POST', ...jsonBody({ ids: ids.slice(1) }) })).status).toBe(422);
    expect((await req(s.base + '/api/admin/frames/order', { method: 'POST', ...jsonBody({ ids: [...ids.slice(1), ids[1]] }) })).status).toBe(422);
  });
  it('won’t strip the only image from a frame with no illustration', async () => {
    const f = new FormData(); f.set('removePhoto', '1');
    expect((await req(s.base + `/api/admin/frames/${created.id}`, { method: 'PUT', body: f })).status).toBe(422);
  });
  it('lets an illustrated frame drop its photo and fall back to the drawing', async () => {
    const { frames } = await (await req(s.base + '/api/admin/frames')).json();
    const art = frames.find((x) => x.art);
    const f1 = new FormData(); f1.set('photo', new Blob([PNG], { type: 'image/png' }), 'a.png');
    const withPhoto = (await (await req(s.base + `/api/admin/frames/${art.id}`, { method: 'PUT', body: f1 })).json()).frame;
    expect(withPhoto.src).toBeTruthy();
    const f2 = new FormData(); f2.set('removePhoto', '1');
    const back = (await (await req(s.base + `/api/admin/frames/${art.id}`, { method: 'PUT', body: f2 })).json()).frame;
    expect(back.src).toBeNull();
    expect(existsSync(join(s.dir, 'uploads', withPhoto.src.split('/').pop()))).toBe(false);
  });
  it('deletes a frame and its file', async () => {
    const file = join(s.dir, 'uploads', created.src.split('/').pop());
    expect((await req(s.base + `/api/admin/frames/${created.id}`, { method: 'DELETE' })).status).toBe(200);
    expect(existsSync(file)).toBe(false);
    expect((await req(s.base + `/api/admin/frames/${created.id}`, { method: 'DELETE' })).status).toBe(404);
  });
  it('doesn’t follow ../ out of the uploads folder', async () => {
    for (const p of ['/uploads/..%2f..%2fsite.db', '/uploads/%2e%2e/%2e%2e/etc/passwd', '/uploads/..%2fupload']) {
      expect([404, 400], p).toContain((await get(p)).status);
    }
  });
});

describe('contact messages', () => {
  const send = (body, headers = {}) => get('/api/contact', { method: 'POST', ...jsonBody(body), headers: { 'Content-Type': 'application/json', ...headers } });
  const msg = { name: 'Ana', email: 'ana@example.com', message: 'Hello, I love the photos!' };

  it('rejects bad submissions with per-field errors', async () => {
    const res = await send({ name: '', email: 'nope', message: 'hi' });
    expect(res.status).toBe(422);
    expect(Object.keys((await res.json()).errors).sort()).toEqual(['email', 'message', 'name']);
  });
  it('ignores bots that fill the hidden field, without storing anything', async () => {
    const before = (await (await req(s.base + '/api/admin/messages')).json()).messages.length;
    const res = await send({ ...msg, website: 'http://spam.example' });
    expect((await res.json()).ok).toBe(true);
    expect((await (await req(s.base + '/api/admin/messages')).json()).messages.length).toBe(before);
  });
  it('stores a message and lets the admin read, mark and delete it', async () => {
    expect((await send(msg)).status).toBe(200);
    const list = (await (await req(s.base + '/api/admin/messages')).json()).messages;
    const m = list.find((x) => x.email === 'ana@example.com');
    expect(m).toMatchObject({ name: 'Ana', read: false });
    expect((await (await req(s.base + '/api/admin/me')).json()).unread).toBeGreaterThan(0);
    expect((await req(s.base + `/api/admin/messages/${m.id}`, { method: 'PATCH', ...jsonBody({ read: true }) })).status).toBe(200);
    expect((await (await req(s.base + '/api/admin/messages')).json()).messages.find((x) => x.id === m.id).read).toBe(true);
    expect((await req(s.base + `/api/admin/messages/${m.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await req(s.base + `/api/admin/messages/${m.id}`, { method: 'DELETE' })).status).toBe(404);
  });
  it('stores text as text, never as markup', async () => {
    await send({ ...msg, name: '<img src=x onerror=alert(1)>' });
    const list = (await (await req(s.base + '/api/admin/messages')).json()).messages;
    expect(list.some((x) => x.name === '<img src=x onerror=alert(1)>')).toBe(true); // stored verbatim; the admin app renders with textContent
  });
  it('rate limits one visitor sending many messages', async () => {
    const t = await startServer({ limits: { contact: { max: 2 } } });
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await fetch(t.base + '/api/contact', { method: 'POST', ...jsonBody(msg) })).status);
    expect(codes).toEqual([200, 200, 429, 429]);
    await t.close();
  });
  it('only accepts submissions from this site or an allowed one', async () => {
    expect((await send(msg, { Origin: 'https://evil.example' })).status).toBe(403);
    const ok = await send(msg, { Origin: 'https://friend.example' });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://friend.example');
  });
  it('answers an allowed site’s preflight request, and nobody else’s', async () => {
    const yes = await get('/api/contact', { method: 'OPTIONS', headers: { Origin: 'https://friend.example', 'Access-Control-Request-Method': 'POST' } });
    expect(yes.status).toBe(204);
    expect(yes.headers.get('access-control-allow-origin')).toBe('https://friend.example');
    const no = await get('/api/contact', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
    expect(no.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('stops accepting messages once the inbox is full', async () => {
    const t = await startServer({ env: { MAX_MESSAGES: '2' }, limits: { contact: { max: 50 } } });
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await fetch(t.base + '/api/contact', { method: 'POST', ...jsonBody(msg) })).status);
    expect(codes).toEqual([200, 200, 503]);
    await t.close();
  });
  it('rejects an oversized body', async () => {
    const res = await send({ ...msg, message: 'x'.repeat(40000) });
    expect(res.status).toBe(413);
  });
});

describe('pages and files', () => {
  it('serves the built site, the admin app and a 404 page', async () => {
    expect(await (await get('/')).text()).toBe('<h1>home</h1>');
    const admin = await get('/admin/');
    expect(admin.status).toBe(200);
    expect(admin.headers.get('content-type')).toContain('text/html');
    const missing = await get('/nope.html');
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe('<h1>missing</h1>');
  });
  it('doesn’t serve the database or other files outside the public folder', async () => {
    for (const p of ['/..%2fsite.db', '/%2e%2e/%2e%2e/etc/passwd', '/admin/..%2f..%2fpackage.json', '/admin/../server/auth.js']) {
      const res = await get(p);
      const body = await res.text();
      expect(body, p).not.toContain('scrypt');
      expect(body, p).not.toContain('"name":');
    }
  });
});

describe('changing the password', () => {
  it('checks the current password and length, then signs out old sessions', async () => {
    const t = await startServer();
    const { cookie } = await login(t.base);
    const call = (body) => as(cookie)(t.base + '/api/admin/password', { method: 'POST', ...jsonBody(body) });
    expect((await call({ current: 'wrong', next: 'a-long-new-password' })).status).toBe(401);
    expect((await call({ current: PASSWORD, next: 'short' })).status).toBe(422);
    const ok = await call({ current: PASSWORD, next: 'a-long-new-password' });
    expect(ok.status).toBe(200);
    expect((await as(cookie)(t.base + '/api/admin/me')).status).toBe(401); // the old cookie is dead
    const fresh = (ok.headers.get('set-cookie') || '').split(';')[0];
    expect((await as(fresh)(t.base + '/api/admin/me')).status).toBe(200); // the reissued one works
    expect((await login(t.base, PASSWORD)).res.status).toBe(401);
    expect((await login(t.base, 'a-long-new-password')).res.status).toBe(200);
    await t.close();
  });
});

describe('dashboard and activity', () => {
  it('is locked without a session', async () => {
    const t = await startServer();
    expect((await fetch(t.base + '/api/admin/dashboard')).status).toBe(401);
    await t.close();
  });

  it('starts with the nine seeded frames and nothing else', async () => {
    const t = await startServer();
    const d = await (await as((await login(t.base)).cookie)(t.base + '/api/admin/dashboard')).json();
    expect(d.messages).toMatchObject({ total: 0, unread: 0, recent: [] });
    expect(d.frames).toEqual({ total: 9, photos: 0, illustrations: 9 });
    expect(d.content.map((c) => c.key)).toEqual(['home', 'about', 'settings']);
    expect(d.activity).toEqual([]);
    expect(d.content.every((c) => c.updatedAt === null)).toBe(true); // the defaults haven't been saved by anyone yet
    await t.close();
  });

  it('counts messages and photos and lists what happened, newest first', async () => {
    const t = await startServer({ limits: { contact: { max: 50 } } });
    const me = as((await login(t.base)).cookie);
    await fetch(t.base + '/api/contact', { method: 'POST', ...jsonBody({ name: 'Ana', email: 'ana@example.com', message: 'Hello there, nice site!' }) });
    await fetch(t.base + '/api/contact', { method: 'POST', ...jsonBody({ name: 'Bo', email: 'bo@example.com', message: 'Another message for you.' }) });
    await me(t.base + '/api/admin/content/home', { method: 'PUT', ...jsonBody({ role: 'New role', statement: 'New statement', hot: '' }) });
    const added = await (await me(t.base + '/api/admin/frames', { method: 'POST', body: photoForm({ title: 'My <b>photo</b>' }) })).json();
    await me(t.base + `/api/admin/frames/${added.frame.id}`, { method: 'DELETE' });
    await me(t.base + '/api/admin/frames', { method: 'POST', body: photoForm({ title: 'Kept' }) });

    const d = await (await me(t.base + '/api/admin/dashboard')).json();
    expect(d.messages.total).toBe(2);
    expect(d.messages.unread).toBe(2);
    expect(d.messages.recent.map((m) => m.name)).toEqual(['Bo', 'Ana']);
    expect(d.frames).toEqual({ total: 10, photos: 1, illustrations: 9 });
    const home = d.content.find((c) => c.key === 'home');
    expect(home.updatedAt).toBeGreaterThan(0);
    expect(d.activity.map((a) => a.text)).toEqual([
      'Added the photo “Kept”',
      'Deleted “My <b>photo</b>”', // stored as plain text; the admin screen shows it with textContent
      'Added the photo “My <b>photo</b>”',
      'Saved the Home page',
      'New message from Bo',
      'New message from Ana',
    ]);
    expect(d.activity[0]).toMatchObject({ kind: 'gallery' });

    // reading a message drops the unread count
    await me(t.base + `/api/admin/messages/${d.messages.recent[0].id}`, { method: 'PATCH', ...jsonBody({ read: true }) });
    expect((await (await me(t.base + '/api/admin/dashboard')).json()).messages.unread).toBe(1);
    await t.close();
  });

  it('keeps only the latest 200 activity entries', async () => {
    const t = await startServer();
    const { logActivity } = await import('../../server/db.js');
    for (let i = 1; i <= 230; i++) logActivity(t.db, 'content', `Entry ${i}`);
    const rows = t.db.prepare('select text from activity order by id').all();
    expect(rows).toHaveLength(200);
    expect(rows[0].text).toBe('Entry 31');
    expect(rows.at(-1).text).toBe('Entry 230');
    await t.close();
  });

  it('records a password change without recording the password', async () => {
    const t = await startServer();
    const me = as((await login(t.base)).cookie);
    const res = await me(t.base + '/api/admin/password', { method: 'POST', ...jsonBody({ current: PASSWORD, next: 'a-long-new-password' }) });
    const fresh = as((res.headers.get('set-cookie') || '').split(';')[0]);
    const d = await (await fresh(t.base + '/api/admin/dashboard')).json();
    expect(d.activity[0].text).toBe('Changed the admin password');
    expect(JSON.stringify(d)).not.toContain('a-long-new-password');
    await t.close();
  });
});
