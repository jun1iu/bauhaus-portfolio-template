import { describe, it, expect } from 'vitest';
import { validateMessage, isConfigured, buildRequest, readResponse, LIMITS } from '../src/core/forms.js';
import { CONTACT_FORM } from '../src/config.js';

const good = { name: 'Ana', email: 'ana@example.com', message: 'Hello, I love the photos!' };

describe('validateMessage', () => {
  it('accepts a complete message', () => expect(validateMessage(good)).toEqual({}));
  it('requires every field', () => {
    expect(Object.keys(validateMessage({}))).toEqual(['name', 'email', 'message']);
    expect(Object.keys(validateMessage({ name: '  ', email: ' ', message: '   ' }))).toEqual(['name', 'email', 'message']);
  });
  it('rejects bad email addresses', () => {
    for (const email of ['ana', 'ana@', 'ana@site', 'a b@site.com', '@site.com']) {
      expect(validateMessage({ ...good, email }).email, email).toBeTruthy();
    }
  });
  it('rejects messages that are too short or too long', () => {
    expect(validateMessage({ ...good, message: 'hi' }).message).toBeTruthy();
    expect(validateMessage({ ...good, message: 'x'.repeat(LIMITS.message + 1) }).message).toBeTruthy();
  });
});

describe('form service requests', () => {
  it('knows when a key is missing', () => {
    expect(isConfigured({ provider: 'web3forms', key: '' })).toBe(false);
    expect(isConfigured({ provider: 'nope', key: 'abc' })).toBe(false);
    expect(isConfigured({ provider: 'formspree', key: 'xyz' })).toBe(true);
  });
  it('builds a Web3Forms request with trimmed fields', () => {
    const { url, init } = buildRequest({ provider: 'web3forms', key: ' k1 ', subject: 'S' }, { ...good, name: ' Ana ', honeypot: '' });
    expect(url).toBe('https://api.web3forms.com/submit');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ access_key: 'k1', subject: 'S', name: 'Ana', email: good.email, message: good.message, botcheck: '' });
  });
  it('builds a Formspree request', () => {
    const { url, init } = buildRequest({ provider: 'formspree', key: 'abc123', subject: 'S' }, { ...good, honeypot: '' });
    expect(url).toBe('https://formspree.io/f/abc123');
    expect(init.headers.Accept).toBe('application/json');
    expect(JSON.parse(init.body)).toMatchObject({ _subject: 'S', email: good.email, _gotcha: '' });
  });
  it('reads success and error replies', () => {
    const w = { provider: 'web3forms' }, f = { provider: 'formspree' };
    expect(readResponse(w, 200, { success: true })).toEqual({ ok: true });
    expect(readResponse(w, 200, { success: false, message: 'Invalid key' })).toEqual({ ok: false, error: 'Invalid key' });
    expect(readResponse(f, 200, { ok: true })).toEqual({ ok: true });
    expect(readResponse(f, 422, { errors: [{ message: 'Bad email' }] })).toEqual({ ok: false, error: 'Bad email' });
    expect(readResponse(f, 500, null).ok).toBe(false);
  });
});

describe('site config', () => {
  it('uses a supported provider', () => expect(['web3forms', 'formspree']).toContain(CONTACT_FORM.provider));
  it('never contains an email address', () => expect(JSON.stringify(CONTACT_FORM)).not.toMatch(/@/));
});

describe('this site\'s own server as the form service', () => {
  const cfg = { provider: 'server', base: 'https://api.example.com' };
  it('needs no key', () => expect(isConfigured({ provider: 'server' })).toBe(true));
  it('posts the message to /api/contact with the honeypot as "website"', () => {
    const { url, init } = buildRequest(cfg, { name: ' Ana ', email: 'ana@example.com ', message: ' hi there friend ', honeypot: 'bot' });
    expect(url).toBe('https://api.example.com/api/contact');
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana', email: 'ana@example.com', message: 'hi there friend', website: 'bot' });
  });
  it('posts to the same address when no base is set', () => {
    expect(buildRequest({ provider: 'server' }, { name: 'a', email: 'a@b.co', message: 'hello there' }).url).toBe('/api/contact');
  });
  it('reads the server\'s replies', () => {
    expect(readResponse(cfg, 200, { ok: true })).toEqual({ ok: true });
    expect(readResponse(cfg, 429, { error: 'Too many messages' })).toEqual({ ok: false, error: 'Too many messages' });
    expect(readResponse(cfg, 422, { errors: { email: 'Bad email.', message: 'Too short.' } }).error).toBe('Bad email. Too short.');
    expect(readResponse(cfg, 500, null).ok).toBe(false);
  });
});
