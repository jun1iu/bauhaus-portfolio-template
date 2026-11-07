import { h } from '../dom.js';
import { api } from '../api.js';
import { toast, field, showErrors, pageHeader } from '../ui.js';

export async function renderSettings(main) {
  const r = await api('GET', '/content');
  main.append(pageHeader('Settings', 'Details that appear across your site, and your social links.'));
  if (!r.ok) { main.append(h('p', { class: 'err' }, r.data.error || 'Could not load settings.')); return; }
  const s = r.data.settings;
  const f = {
    base: field({ label: 'Based in', path: 'base', value: s.base, max: 80, required: true }),
    from: field({ label: 'From', path: 'from', value: s.from, max: 80, required: true }),
    openTo: field({ label: 'Open to', path: 'openTo', value: s.openTo, max: 200, required: true, hint: 'Shown in the yellow box under the home page header.' }),
    availability: field({ label: 'Availability line', path: 'availability', type: 'textarea', rows: 2, value: s.availability, max: 300, hint: 'The status on your About page. Leave blank to hide it.' }),
  };
  const social = Object.fromEntries([['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['instagram', 'Instagram'], ['x', 'X']].map(([k, label]) => [k, field({ label, path: `social.${k}`, type: 'url', value: s.social[k], max: 300, placeholder: 'https://', hint: k === 'linkedin' ? 'Leave a link blank and its icon is hidden from your footer.' : undefined })]));
  const save = h('button', { class: 'btn', type: 'submit' }, 'Save settings');
  const form = h('form', { class: 'panel', onsubmit: async (e) => {
    e.preventDefault();
    save.disabled = true;
    const value = (x) => x.querySelector('input,textarea').value;
    const res = await api('PUT', '/content/settings', {
      base: value(f.base), from: value(f.from), openTo: value(f.openTo), availability: value(f.availability),
      social: Object.fromEntries(Object.entries(social).map(([k, x]) => [k, value(x)])),
    });
    save.disabled = false;
    if (!res.ok) { if (!showErrors(form, res.data.errors)) toast(res.data.error || 'Could not save.', 'error'); return; }
    showErrors(form, {});
    toast('Saved. Your site now shows the changes.');
  } },
  h('h3', {}, 'About you'), h('br'), h('div', { class: 'grid2' }, f.base, f.from), f.openTo, f.availability,
  h('h3', { class: 'sec' }, 'Social links'), h('div', { class: 'grid2' }, Object.values(social)),
  h('div', { class: 'actions' }, save));
  main.append(form);
}
