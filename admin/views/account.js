import { h } from '../dom.js';
import { api } from '../api.js';
import { toast, field, showErrors, pageHeader } from '../ui.js';

export async function renderAccount(main, ctx) {
  main.append(pageHeader('Account', 'Your admin password and session.'));
  const current = field({ label: 'Current password', path: 'current', type: 'password', required: true, autocomplete: 'current-password' });
  const next = field({ label: 'New password', path: 'next', type: 'password', required: true, autocomplete: 'new-password', hint: 'At least 10 characters. A few random words work well.' });
  const again = field({ label: 'New password again', path: 'again', type: 'password', required: true, autocomplete: 'new-password' });
  const save = h('button', { class: 'btn', type: 'submit' }, 'Change password');
  const form = h('form', { class: 'panel', onsubmit: async (e) => {
    e.preventDefault();
    const v = (x) => x.querySelector('input').value;
    if (v(next) !== v(again)) return showErrors(form, { again: 'The two passwords don’t match.' });
    save.disabled = true;
    const r = await api('POST', '/password', { current: v(current), next: v(next) });
    save.disabled = false;
    if (!r.ok) { showErrors(form, { [r.status === 401 ? 'current' : 'next']: r.data.error || 'Could not change the password.' }); return; }
    form.reset();
    showErrors(form, {});
    toast('Password changed. Other browsers have been signed out.');
  } }, h('h3', {}, 'Change password'), h('br'), current, next, again, h('div', { class: 'actions' }, save));
  main.append(form, h('div', { class: 'panel' }, h('h3', {}, 'Sign out'), h('p', { class: 'muted' }, 'Ends your session in this browser.'), h('button', { class: 'btn alt', type: 'button', onclick: ctx.signOut }, 'Sign out')));
}
