// Contact form: validates in the browser, sends to the form service set in
// src/config.js, and shows progress, success or errors in place.
import { CONTACT_FORM } from '../config.js';
import { validateMessage, isConfigured, buildRequest, readResponse, LIMITS } from '../core/forms.js';
import { server, API_BASE } from '../core/site.js';

const FIELDS = ['name', 'email', 'message'];

export function mount(form) {
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;
  const counter = form.querySelector('[data-form-count]');
  const message = form.elements.message;
  let sending = false;

  message.maxLength = LIMITS.message;
  const updateCount = () => {
    if (!counter) return;
    const n = message.value.length;
    counter.textContent = `${n.toLocaleString()} / ${LIMITS.message.toLocaleString()}`;
    counter.classList.toggle('warn', n > LIMITS.message * 0.9);
  };
  message.addEventListener('input', updateCount);
  updateCount();

  // Messages go to this site's own server when it answered; otherwise to the form service in src/config.js.
  const target = server.online ? { provider: 'server', base: API_BASE } : CONTACT_FORM;
  const configured = isConfigured(target);
  if (!configured) {
    console.warn('Contact form: add your key in src/config.js to start receiving messages.');
    setStatus('info', 'The contact form isn’t connected yet. Check back soon.');
  }

  function setStatus(kind, text) {
    status.dataset.kind = kind;
    status.textContent = text;
    status.hidden = !text;
  }

  function setFieldError(name, msg) {
    form.elements[name].setAttribute('aria-invalid', msg ? 'true' : 'false');
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (slot) slot.textContent = msg || '';
  }
  const showErrors = (errors) => FIELDS.forEach((name) => setFieldError(name, errors[name]));

  // Once a field has been flagged, re-check it as the visitor types.
  FIELDS.forEach((name) => {
    form.elements[name].addEventListener('input', () => {
      if (form.elements[name].getAttribute('aria-invalid') === 'true') setFieldError(name, validateMessage(values())[name]);
    });
  });

  function values() {
    return {
      name: form.elements.name.value,
      email: form.elements.email.value,
      message: form.elements.message.value,
      honeypot: form.elements.website ? form.elements.website.value : '',
    };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const fields = values();
    const errors = validateMessage(fields);
    showErrors(errors);
    const first = FIELDS.find((f) => errors[f]);
    if (first) { form.elements[first].focus(); if (configured) setStatus('', ''); return; }
    if (!configured) { setStatus('error', 'Sorry, the contact form isn’t connected yet.'); return; }
    if (fields.honeypot) { form.reset(); updateCount(); setStatus('success', 'Thanks! Your message is on its way.'); return; }

    sending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    setStatus('', '');
    try {
      const { url, init } = buildRequest(target, fields);
      const res = await fetch(url, init);
      let data = null;
      try { data = await res.json(); } catch { /* non-JSON reply */ }
      const result = readResponse(target, res.status, data);
      if (!result.ok) throw Object.assign(new Error(result.error), { friendly: target.provider === 'server' && res.status < 500 });
      form.reset();
      updateCount();
      showErrors({});
      setStatus('success', `Thanks, ${fields.name.trim().split(/\s+/)[0]}! Your message is on its way. I usually reply within a couple of days.`);
    } catch (err) {
      console.error('Contact form:', err);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setStatus('error', offline
        ? 'You seem to be offline. Your message is still here, so try again once you’re connected.'
        : (err.friendly && err.message) || 'Sorry, your message didn’t send. Please try again in a moment.');
    } finally {
      sending = false;
      button.disabled = false;
      button.textContent = label;
      form.removeAttribute('aria-busy');
    }
  });
}
