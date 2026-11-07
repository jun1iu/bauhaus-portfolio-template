// Contact form logic with no DOM code, so it can be tested.
// Covered by tests/forms.test.js.

export const LIMITS = { name: 100, email: 254, message: 5000, minMessage: 10 };
const EMAIL_RE = /^[^\s@,;<>"?&=]+@[^\s@,;<>"?&=]+\.[^\s@,;<>"?&=]{2,}$/; // matches the server's check (server/validate.js)

/** Check the fields. Returns { field: 'error message' }; an empty object means valid. */
export function validateMessage({ name = '', email = '', message = '' }) {
  const errors = {};
  const n = name.trim(), e = email.trim(), m = message.trim();
  if (!n) errors.name = 'Please add your name.';
  else if (n.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;
  if (!e) errors.email = 'Please add your email so I can reply.';
  else if (e.length > LIMITS.email || !EMAIL_RE.test(e)) errors.email = 'That email address doesn’t look right.';
  if (!m) errors.message = 'Please write a message.';
  else if (m.length < LIMITS.minMessage) errors.message = 'Could you write a little more?';
  else if (m.length > LIMITS.message) errors.message = `Please keep it under ${LIMITS.message} characters.`;
  return errors;
}

const PROVIDERS = {
  // This site's own server (see server/). No key needed; cfg.base is where it lives (empty = same address).
  server: {
    url: (key, cfg) => `${cfg.base || ''}/api/contact`,
    body: (key, f) => ({ name: f.name, email: f.email, message: f.message, website: f.honeypot || '' }),
    ok: (status, data) => status >= 200 && status < 300 && data?.ok === true,
    error: (data) => (data?.errors ? Object.values(data.errors).join(' ') : data?.error),
  },
  web3forms: {
    url: () => 'https://api.web3forms.com/submit',
    body: (key, f, cfg) => ({
      access_key: key, subject: cfg.subject, from_name: f.name,
      name: f.name, email: f.email, message: f.message, botcheck: f.honeypot || '',
    }),
    ok: (status, data) => status >= 200 && status < 300 && data?.success !== false,
    error: (data) => data?.message,
  },
  formspree: {
    url: (key) => `https://formspree.io/f/${encodeURIComponent(key)}`,
    body: (key, f, cfg) => ({
      _subject: cfg.subject, name: f.name, email: f.email, message: f.message, _gotcha: f.honeypot || '',
    }),
    ok: (status, data) => status >= 200 && status < 300 && !data?.errors,
    error: (data) => data?.errors?.map((e) => e.message).join(' '),
  },
};

/** True when the config names a known provider and has a key. */
export function isConfigured(cfg) {
  if (cfg?.provider === 'server') return true;
  return Boolean(cfg && PROVIDERS[cfg.provider] && String(cfg.key || '').trim());
}

/** Build the fetch() arguments for a submission. */
export function buildRequest(cfg, fields) {
  const p = PROVIDERS[cfg.provider];
  if (!p) throw new Error(`Unknown form provider "${cfg.provider}"`);
  const key = String(cfg.key ?? '').trim();
  const clean = { name: fields.name.trim(), email: fields.email.trim(), message: fields.message.trim(), honeypot: fields.honeypot };
  return {
    url: p.url(key, cfg),
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(p.body(key, clean, cfg)),
    },
  };
}

/** Turn the service's reply into { ok, error }. */
export function readResponse(cfg, status, data) {
  const p = PROVIDERS[cfg.provider];
  if (p.ok(status, data)) return { ok: true };
  return { ok: false, error: p.error(data) || `The form service returned an error (${status}).` };
}
