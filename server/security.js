// Headers and request checks shared by every route.

/** Headers that stop browsers guessing file types, leaking referrers, or putting the site in a frame. */
export function securityHeaders() {
  return async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-Frame-Options', 'DENY');
    const p = c.req.path;
    if (p.startsWith('/admin') || p.startsWith('/api')) {
      // The admin app only loads its own scripts and styles (plus Google Fonts); nothing can inject others.
      c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    }
  };
}

/** Browsers always tell the server where a request came from; reject cross-site ones. */
export function isSameOrigin(c, config) {
  const site = c.req.header('sec-fetch-site');
  if (site && !['same-origin', 'none'].includes(site)) return false;
  const origin = c.req.header('origin');
  if (!origin) return true; // not a browser (curl, tests); a cross-site browser request always has one
  try {
    const request = new URL(c.req.url);
    const proto = config.trustProxy ? c.req.header('x-forwarded-proto') : undefined;
    if (proto && proto !== 'https' && proto !== 'http') return false;
    const expected = new URL(`${proto || request.protocol.slice(0, -1)}://${c.req.header('host') || request.host}`);
    return origin === expected.origin;
  } catch { return false; }
}

/** Same site, or one of the origins listed in CORS_ORIGINS (for a site hosted elsewhere). */
export function isAllowedOrigin(c, config) {
  if (isSameOrigin(c, config)) return true;
  const origin = c.req.header('origin');
  return Boolean(origin && config.corsOrigins.includes(origin));
}

/** Lets the sites in CORS_ORIGINS read the public endpoints; answers their preflight requests. */
export function publicCors(config) {
  return async (c, next) => {
    const origin = c.req.header('origin');
    const allowed = origin && config.corsOrigins.includes(origin);
    if (allowed) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
    }
    if (c.req.method === 'OPTIONS') {
      if (allowed) {
        c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        c.header('Access-Control-Allow-Headers', 'Content-Type');
        c.header('Access-Control-Max-Age', '86400');
      }
      return c.body(null, 204);
    }
    await next();
  };
}
