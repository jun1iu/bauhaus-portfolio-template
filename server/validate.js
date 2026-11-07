// Strict input checks. Every value an admin or visitor sends is checked here before it is stored:
// unknown fields are dropped, text is trimmed and length-limited, and links must be http(s) or mailto.

/** Collects problems as it goes: ctx.str(...) returns the cleaned value and records any error by path. */
export function makeCtx() {
  const errors = {};
  const fail = (path, msg) => { if (!errors[path]) errors[path] = msg; };
  return {
    errors,
    fail,
    ok: () => Object.keys(errors).length === 0,
    str(v, path, { max = 200, required = false, multiline = false } = {}) {
      if (v == null || v === '') { if (required) fail(path, 'Required.'); return ''; }
      if (typeof v !== 'string') { fail(path, 'Must be text.'); return ''; }
      let s = v.replace(/\r\n/g, '\n');
      s = multiline ? s.replace(/[^\S\n]+$/gm, '').trim() : s.replace(/\s+/g, ' ').trim();
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s)) fail(path, 'Contains invalid characters.');
      if (required && !s) fail(path, 'Required.');
      if (s.length > max) { fail(path, `Keep it under ${max} characters.`); return s.slice(0, max); }
      return s;
    },
    url(v, path) {
      const s = this.str(v, path, { max: 300 });
      if (!s) return '';
      try {
        const u = new URL(s);
        if (!['http:', 'https:', 'mailto:'].includes(u.protocol)) throw new Error('protocol');
        return u.href;
      } catch { fail(path, 'Enter a full link starting with https://'); return ''; }
    },
    int(v, path, { min, max, required = true } = {}) {
      if (v == null || v === '') { if (required) fail(path, 'Required.'); return null; }
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) { fail(path, `Must be a whole number from ${min} to ${max}.`); return null; }
      return n;
    },
    list(v, path, { max = 20 } = {}, each) {
      if (v == null) return [];
      if (!Array.isArray(v)) { fail(path, 'Must be a list.'); return []; }
      if (v.length > max) { fail(path, `No more than ${max} items.`); }
      return v.slice(0, max).map((item, i) => each(item, `${path}.${i}`));
    },
  };
}

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

const SCHEMAS = {
  settings(v, c) {
    v = obj(v);
    const social = obj(v.social);
    return {
      base: c.str(v.base, 'base', { max: 80, required: true }),
      from: c.str(v.from, 'from', { max: 80, required: true }),
      openTo: c.str(v.openTo, 'openTo', { max: 200, required: true }),
      availability: c.str(v.availability, 'availability', { max: 300 }),
      social: Object.fromEntries(['linkedin', 'github', 'instagram', 'x'].map((k) => [k, c.url(social[k], `social.${k}`)])),
    };
  },
  home(v, c) {
    v = obj(v);
    return {
      role: c.str(v.role, 'role', { max: 200, required: true }),
      statement: c.str(v.statement, 'statement', { max: 600, required: true }),
      hot: c.str(v.hot, 'hot', { max: 200 }),
    };
  },
  about(v, c) {
    v = obj(v);
    return {
      lede: c.str(v.lede, 'lede', { max: 500, required: true }),
      specs: c.list(v.specs, 'specs', { max: 12 }, (s, p) => ({ key: c.str(obj(s).key, `${p}.key`, { max: 40, required: true }), value: c.str(obj(s).value, `${p}.value`, { max: 300, required: true }) })),
      experience: c.list(v.experience, 'experience', { max: 12 }, (e, p) => {
        e = obj(e);
        return {
          title: c.str(e.title, `${p}.title`, { max: 100, required: true }),
          company: c.str(e.company, `${p}.company`, { max: 120, required: true }),
          period: c.str(e.period, `${p}.period`, { max: 40 }),
          length: c.str(e.length, `${p}.length`, { max: 30 }),
          place: c.str(e.place, `${p}.place`, { max: 60 }),
          bullets: c.list(e.bullets, `${p}.bullets`, { max: 12 }, (b, bp) => c.str(b, bp, { max: 400, required: true })),
        };
      }),
      skills: c.list(v.skills, 'skills', { max: 12 }, (s, p) => ({
        name: c.str(obj(s).name, `${p}.name`, { max: 40, required: true }),
        items: c.list(obj(s).items, `${p}.items`, { max: 20 }, (i, ip) => c.str(i, ip, { max: 80, required: true })),
      })),
      education: c.list(v.education, 'education', { max: 8 }, (e, p) => ({
        years: c.str(obj(e).years, `${p}.years`, { max: 40 }),
        school: c.str(obj(e).school, `${p}.school`, { max: 120, required: true }),
        degree: c.str(obj(e).degree, `${p}.degree`, { max: 160 }),
      })),
    };
  },
};

export const CONTENT_KEYS = Object.keys(SCHEMAS);

/** Check one content block. Returns { ok: true, value } or { ok: false, errors }. */
export function validateContent(key, input) {
  const c = makeCtx();
  const value = SCHEMAS[key](input, c);
  return c.ok() ? { ok: true, value } : { ok: false, errors: c.errors };
}

/** Check a gallery frame's text fields (the photo itself is checked in uploads.js). */
export function validateFrame(input, { partial = false, artKeys = [] } = {}) {
  const c = makeCtx();
  const v = obj(input);
  const has = (k) => !partial || k in v;
  const out = {};
  if (has('title')) out.title = c.str(v.title, 'title', { max: 80, required: true });
  if (has('place')) out.place = c.str(v.place, 'place', { max: 80 });
  if (has('time')) out.time = c.str(v.time, 'time', { max: 60 });
  if (has('tag')) out.tag = c.str(v.tag, 'tag', { max: 30 }) || 'Photos';
  if (has('alt')) out.alt = c.str(v.alt, 'alt', { max: 200 });
  if (has('ratioW') || has('ratioH')) {
    out.ratioW = c.int(v.ratioW, 'ratioW', { min: 1, max: 50, required: !partial });
    out.ratioH = c.int(v.ratioH, 'ratioH', { min: 1, max: 50, required: !partial });
  }
  if ('art' in v && v.art != null && v.art !== '') {
    if (!artKeys.includes(v.art)) c.fail('art', 'Unknown illustration.');
    else out.art = v.art;
  }
  return c.ok() ? { ok: true, value: out } : { ok: false, errors: c.errors };
}

// No "?", "&", "=", commas, quotes or angle brackets: they can't be part of an address we'd want, and in a
// mailto: link they could add hidden recipients or text (x@y.com?bcc=...).
const EMAIL_RE = /^[^\s@,;<>"?&=]+@[^\s@,;<>"?&=]+\.[^\s@,;<>"?&=]{2,}$/;

/** Check a contact-form submission. */
export function validateMessage(input) {
  const c = makeCtx();
  const v = obj(input);
  const name = c.str(v.name, 'name', { max: 100, required: true });
  const email = c.str(v.email, 'email', { max: 254, required: true });
  if (email && !EMAIL_RE.test(email)) c.fail('email', 'That email address doesn’t look right.');
  const message = c.str(v.message, 'message', { max: 5000, required: true, multiline: true });
  if (message && message.length < 10) c.fail('message', 'Could you write a little more?');
  return c.ok() ? { ok: true, value: { name, email, message } } : { ok: false, errors: c.errors };
}
