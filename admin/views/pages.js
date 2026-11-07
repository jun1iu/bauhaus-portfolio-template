// The Home and About page editors (one screen each).
import { h } from '../dom.js';
import { api } from '../api.js';
import { toast, field, showErrors, repeater, pageHeader } from '../ui.js';

async function load(main, title, description, build) {
  main.append(pageHeader(title, description, h('a', { class: 'btn alt', href: title.startsWith('Home') ? '/' : '/about.html', target: '_blank', rel: 'noopener' }, 'View page ↗')));
  const r = await api('GET', '/content');
  if (!r.ok) { main.append(h('p', { class: 'err' }, r.data.error || 'Could not load the content.')); return; }
  main.append(build(r.data));
}

export const renderHome = (main) => load(main, 'Home page', 'The tagline and intro on your front page.', (data) => homeForm(data.home));
export const renderAbout = (main) => load(main, 'About page', 'Your story, experience, skills and education.', (data) => aboutForm(data.about));

function saver(form, key, collect, button) {
  return async (e) => {
    e.preventDefault();
    button.disabled = true;
    const res = await api('PUT', `/content/${key}`, collect());
    button.disabled = false;
    if (!res.ok) { if (!showErrors(form, res.data.errors)) toast(res.data.error || 'Could not save.', 'error'); return; }
    showErrors(form, {});
    toast('Saved. Your site now shows the changes.');
  };
}

function homeForm(home) {
  const f = {
    role: field({ label: 'Tagline under your name', path: 'role', value: home.role, max: 200, required: true }),
    statement: field({ label: 'Intro statement', path: 'statement', type: 'textarea', rows: 5, value: home.statement, max: 600, required: true, hint: 'The large paragraph on the home page that lights up as visitors scroll.' }),
    hot: field({ label: 'Highlighted words', path: 'hot', value: home.hot, max: 200, hint: 'Single words from the statement to show in red, separated by commas.' }),
  };
  const save = h('button', { class: 'btn', type: 'submit' }, 'Save home page');
  const form = h('form', { class: 'panel' }, f.role, f.statement, f.hot, h('div', { class: 'actions' }, save));
  form.addEventListener('submit', saver(form, 'home', () => Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.querySelector('input,textarea').value])), save));
  return form;
}

function aboutForm(about) {
  const lede = field({ label: 'Opening paragraph', path: 'lede', type: 'textarea', rows: 4, value: about.lede, max: 500, required: true });
  const specs = repeater({ name: 'specs', noun: 'Detail', items: about.specs, blank: { key: '', value: '' },
    defs: [{ key: 'key', label: 'Label', type: 'text', max: 40, required: true, hint: 'For example: role, focus, languages.' }, { key: 'value', label: 'Value', type: 'textarea', max: 300, required: true }] });
  const experience = repeater({ name: 'experience', noun: 'Job', items: about.experience, blank: { title: '', company: '', period: '', length: '', place: '', bullets: [] },
    defs: [
      { key: 'title', label: 'Job title', type: 'text', max: 100, required: true },
      { key: 'company', label: 'Company', type: 'text', max: 120, required: true },
      { key: 'period', label: 'Dates', type: 'text', max: 40, hint: 'For example: 2020-02 → 2025-12' },
      { key: 'length', label: 'How long', type: 'text', max: 30, hint: 'For example: 5 yr 11 mo' },
      { key: 'place', label: 'Where', type: 'text', max: 60 },
      { key: 'bullets', label: 'What you did', type: 'lines', hint: 'One achievement per line.' },
    ] });
  const skills = repeater({ name: 'skills', noun: 'Skill group', items: about.skills, blank: { name: '', items: [] },
    defs: [{ key: 'name', label: 'Group name', type: 'text', max: 40, required: true }, { key: 'items', label: 'Skills', type: 'csv', hint: 'Separated by commas.' }] });
  const education = repeater({ name: 'education', noun: 'School', items: about.education, blank: { years: '', school: '', degree: '' },
    defs: [{ key: 'years', label: 'Years', type: 'text', max: 40 }, { key: 'school', label: 'School', type: 'text', max: 120, required: true }, { key: 'degree', label: 'Degree', type: 'text', max: 160 }] });
  const save = h('button', { class: 'btn', type: 'submit' }, 'Save about page');
  const form = h('form', { class: 'panel' },
    lede,
    h('h3', { class: 'sec' }, 'Details'), h('p', { class: 'hint' }, 'The “status” line at the end of this list comes from Settings.'), specs.el,
    h('h3', { class: 'sec' }, 'Experience'), experience.el,
    h('h3', { class: 'sec' }, 'Skills'), skills.el,
    h('h3', { class: 'sec' }, 'Education'), education.el,
    h('div', { class: 'actions' }, save));
  form.addEventListener('submit', saver(form, 'about', () => ({ lede: lede.querySelector('textarea').value, specs: specs.value(), experience: experience.value(), skills: skills.value(), education: education.value() }), save));
  return form;
}
