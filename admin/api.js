// Talks to the admin API. Sends the session cookie automatically; a 401 sends you back to the sign-in screen.
export async function api(method, path, body) {
  const init = { method, headers: {}, credentials: 'same-origin' };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  let res;
  try { res = await fetch('/api/admin' + path, init); }
  catch { return { ok: false, status: 0, data: { error: 'Can’t reach the server. Check your connection and try again.' } }; }
  let data = null;
  try { data = await res.json(); } catch { /* an empty or non-JSON reply */ }
  if (res.status === 401 && path !== '/login' && path !== '/me') window.dispatchEvent(new Event('admin:signed-out'));
  return { ok: res.ok, status: res.status, data: data || {} };
}
