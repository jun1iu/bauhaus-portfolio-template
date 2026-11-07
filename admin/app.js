// The admin app: sign-in, the CMS shell (sidebar and top bar) and the screens.
import { h } from './dom.js';
import { api } from './api.js';
import { toast, field } from './ui.js';
import { renderDashboard } from './views/dashboard.js';
import { renderInbox } from './views/inbox.js';
import { renderGallery } from './views/gallery.js';
import { renderHome, renderAbout } from './views/pages.js';
import { renderSettings } from './views/settings.js';
import { renderAccount } from './views/account.js';

const root = document.getElementById('app');

// Sidebar structure: groups of [route, label, icon shape, screen]
const NAV = [
  { group: null, items: [['dashboard', 'Dashboard', 'grid', renderDashboard]] },
  { group: 'Content', items: [['home', 'Home page', 'triangle', renderHome], ['about', 'About page', 'circle', renderAbout], ['gallery', 'Gallery', 'square', renderGallery]] },
  { group: 'Messages', items: [['inbox', 'Inbox', 'circle', renderInbox]] },
  { group: 'Site', items: [['settings', 'Settings', 'triangle', renderSettings], ['account', 'Account', 'square', renderAccount]] },
];
const SCREENS = NAV.flatMap((g) => g.items);
const LEGACY = { pages: 'home' };

let badge = null;
const ctx = {
  setUnread(n) { if (badge) { badge.textContent = String(n); badge.hidden = n === 0; } },
  async refreshUnread() { const r = await api('GET', '/me'); if (r.ok) ctx.setUnread(r.data.unread); },
  signOut,
};

function loginScreen() {
  badge = null;
  document.title = 'Sign in · Admin';
  const pw = field({ label: 'Password', path: 'password', type: 'password', required: true, autocomplete: 'current-password' });
  const err = h('p', { class: 'err', role: 'alert' });
  const button = h('button', { class: 'btn', type: 'submit' }, 'Sign in');
  const form = h('form', { class: 'panel', onsubmit: async (e) => {
    e.preventDefault();
    button.disabled = true; err.textContent = '';
    const r = await api('POST', '/login', { password: pw.querySelector('input').value });
    button.disabled = false;
    if (r.ok) start(); else { err.textContent = r.data.error || 'Could not sign in.'; pw.querySelector('input').select(); }
  } },
  h('h1', {}, 'Admin'), h('p', {}, 'Sign in to manage your site.'), pw, err, h('div', { class: 'actions' }, button));
  root.replaceChildren(h('div', { class: 'login' }, form));
  pw.querySelector('input').focus();
}

async function signOut() {
  await api('POST', '/logout');
  loginScreen();
}

const brand = () => h('a', { class: 'brand', href: '#dashboard' }, h('span', { class: 'shapes', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), 'Site admin');

async function start() {
  const me = await api('GET', '/me');
  if (!me.ok) return loginScreen();
  badge = h('span', { class: 'badge', hidden: true });

  const links = SCREENS.map(([id, label, icon]) => h('a', { href: `#${id}`, dataset: { route: id } }, h('i', { class: `ico ${icon}`, 'aria-hidden': 'true' }), h('span', {}, label), id === 'inbox' ? badge : null));
  const byId = Object.fromEntries(links.map((a) => [a.dataset.route, a]));
  const side = h('aside', { class: 'side', id: 'side', 'aria-label': 'Admin' },
    brand(),
    h('nav', {}, NAV.map((g) => h('div', { class: 'group' }, g.group ? h('p', { class: 'group-name' }, g.group) : null, g.items.map(([id]) => byId[id])))),
    h('div', { class: 'side-foot' }, h('a', { href: '/', target: '_blank', rel: 'noopener' }, 'View site ↗'), h('button', { type: 'button', onclick: signOut }, 'Sign out')));
  const scrim = h('div', { class: 'scrim', hidden: true });
  const menu = h('button', { class: 'menu-btn', type: 'button', 'aria-label': 'Open the menu', 'aria-controls': 'side', 'aria-expanded': 'false' }, h('span', {}), h('span', {}), h('span', {}));
  const main = h('main', { id: 'main', tabindex: '-1' });

  const setMenu = (open) => {
    side.dataset.open = String(open);
    scrim.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
  };
  menu.addEventListener('click', () => setMenu(side.dataset.open !== 'true'));
  scrim.addEventListener('click', () => setMenu(false));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  root.replaceChildren(h('div', { class: 'cms' }, side, scrim,
    h('div', { class: 'content' }, h('header', { class: 'bar' }, menu, brand(), h('a', { class: 'mini', href: '/', target: '_blank', rel: 'noopener' }, 'View site ↗')), main)));
  ctx.setUnread(me.data.unread);

  let token = 0;
  async function route() {
    let name = location.hash.slice(1) || 'dashboard';
    name = LEGACY[name] || name;
    const screen = SCREENS.find((s) => s[0] === name) || SCREENS[0];
    Object.entries(byId).forEach(([id, a]) => (id === screen[0] ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    document.title = `${screen[1]} · Admin`;
    setMenu(false);
    const mine = ++token;
    main.replaceChildren();
    const holder = h('div', { class: 'screen' });
    main.append(holder);
    await screen[3](holder, ctx);
    if (mine !== token) holder.remove(); // moved on while this screen was loading
    else { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  }
  window.onhashchange = route;
  route();
}

window.addEventListener('admin:signed-out', () => { toast('You were signed out. Please sign in again.', 'error'); loginScreen(); });
start();
