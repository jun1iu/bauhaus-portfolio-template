// Puts server content into the page. Text goes in as text (never as HTML), links are checked,
// and the markup built here matches what the pages already contain.
import { h } from './dom.js';
import { safeHref, toFrame, API_BASE } from './site.js';
import { setFrames } from '../data/frames.js';
import { ART } from '../data/art.js';

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const contactHref = () => `${import.meta.env.BASE_URL}contact.html`;

const RENDERERS = {
  'about.specs': (about, settings) => [
    ...about.specs.map((s) => h('div', {}, h('dt', {}, s.key), h('dd', {}, s.value))),
    settings.availability
      ? h('div', { class: 'status' }, h('dt', {}, 'status'),
        h('dd', {}, h('span', {}, h('span', { class: 'dot', 'aria-hidden': 'true' }), settings.availability), ' ', h('a', { class: 'btn', href: contactHref() }, 'Write to me')))
      : null,
  ],
  'about.experience': (about) => about.experience.map((e) => h('article', { class: 'log' },
    h('header', {},
      h('p', { class: 'meta' }, [e.period, e.length, e.place].filter(Boolean).map((t) => h('span', {}, t))),
      h('h3', {}, e.title),
      h('p', { class: 'where' }, e.company)),
    h('ul', {}, e.bullets.map((b) => h('li', {}, b))))),
  'about.skills': (about) => about.skills.map((g) => h('div', {}, h('h3', {}, g.name), h('ul', {}, g.items.map((i) => h('li', {}, i))))),
  'about.education': (about) => about.education.map((e) => h('div', {}, h('dt', {}, e.years), h('dd', {}, h('b', {}, e.school), e.degree ? ` ${e.degree}` : ''))),
};

export function applySite(data, root = document) {
  root.querySelectorAll('[data-bind]').forEach((el) => {
    const v = get(data, el.dataset.bind);
    if (typeof v === 'string' && v) el.textContent = v;
  });

  const statement = root.querySelector('[data-hot-from]');
  if (statement) {
    const hot = get(data, statement.dataset.hotFrom);
    if (typeof hot === 'string') statement.dataset.hot = hot;
  }

  const social = data.settings.social || {};
  root.querySelectorAll('[data-social]').forEach((a) => {
    const url = safeHref(social[a.dataset.social]);
    const item = a.closest('li') || a;
    item.hidden = !url;
    if (url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
  const list = root.querySelector('.social');
  if (list) list.hidden = ![...list.children].some((li) => !li.hidden);

  root.querySelectorAll('[data-render]').forEach((el) => {
    const render = RENDERERS[el.dataset.render];
    if (render) el.replaceChildren(...render(data.about, data.settings).filter(Boolean));
  });

  setFrames(data.frames.map((f) => toFrame(f, { base: API_BASE, art: ART })).filter(Boolean));
}
