import { h } from '../dom.js';
import { api } from '../api.js';
import { pageHeader, timeAgo, fmtDate } from '../ui.js';

const KIND_LABEL = { message: 'Message', content: 'Content', gallery: 'Gallery', account: 'Account' };

function stat({ label, value, sub, href, tone }) {
  return h(href ? 'a' : 'div', { class: `stat ${tone || ''}`, href }, h('span', { class: 'stat-label' }, label), h('span', { class: 'stat-value' }, String(value)), sub ? h('span', { class: 'stat-sub' }, sub) : null);
}

export async function renderDashboard(main, ctx) {
  main.append(pageHeader('Dashboard', 'Here’s what’s happening on your site.'));
  const r = await api('GET', '/dashboard');
  if (!r.ok) { main.append(h('p', { class: 'err' }, r.data.error || 'Could not load the dashboard.')); return; }
  const { messages, frames, content, activity } = r.data;
  ctx.setUnread(messages.unread);

  const lastSaved = Math.max(0, ...content.map((c) => c.updatedAt || 0));
  main.append(
    messages.unread > 0
      ? h('a', { class: 'notice', href: '#inbox' }, h('strong', {}, `${messages.unread} unread message${messages.unread === 1 ? '' : 's'}`), ' waiting in your inbox. ', h('span', { class: 'go' }, 'Read them →'))
      : null,
    h('div', { class: 'stats' },
      stat({ label: 'Unread messages', value: messages.unread, sub: `${messages.total} in total`, href: '#inbox', tone: messages.unread ? 'hot' : '' }),
      stat({ label: 'Gallery frames', value: frames.total, sub: `${frames.photos} photo${frames.photos === 1 ? '' : 's'} · ${frames.illustrations} illustration${frames.illustrations === 1 ? '' : 's'}`, href: '#gallery' }),
      stat({ label: 'Pages you can edit', value: content.length - 1, sub: 'Home and About', href: '#home' }),
      stat({ label: 'Last content save', value: lastSaved ? timeAgo(lastSaved) : '—', sub: lastSaved ? fmtDate(lastSaved) : 'Nothing saved yet' })),
    h('div', { class: 'dash-grid' },
      h('section', { class: 'panel' },
        h('h3', {}, 'Recent messages'),
        messages.recent.length
          ? h('ul', { class: 'plain' }, messages.recent.map((m) => h('li', {},
            h('a', { class: 'row-link', href: '#inbox' },
              h('span', { class: 'row-main' }, h('strong', {}, m.name), m.read ? null : h('span', { class: 'pill' }, 'new')),
              h('span', { class: 'row-sub' }, m.message),
              h('span', { class: 'row-time' }, timeAgo(m.createdAt))))))
          : h('p', { class: 'muted' }, 'No messages yet. They appear here when someone uses your Contact page.'),
        h('div', { class: 'actions' }, h('a', { class: 'mini', href: '#inbox' }, 'Open inbox'))),
      h('section', { class: 'panel' },
        h('h3', {}, 'Recent activity'),
        activity.length
          ? h('ol', { class: 'timeline' }, activity.map((a) => h('li', { class: `kind-${a.kind}` }, h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { class: 'what' }, a.text), h('span', { class: 'when', title: fmtDate(a.at) }, `${KIND_LABEL[a.kind] || 'Update'} · ${timeAgo(a.at)}`))))
          : h('p', { class: 'muted' }, 'Nothing yet. Edits, uploads and new messages will be listed here.'))),
    h('div', { class: 'dash-grid' },
      h('section', { class: 'panel' },
        h('h3', {}, 'Content'),
        h('ul', { class: 'plain' }, content.map((c) => h('li', {},
          h('a', { class: 'row-link', href: `#${c.key === 'settings' ? 'settings' : c.key}` },
            h('span', { class: 'row-main' }, h('strong', {}, c.label)),
            h('span', { class: 'row-sub' }, c.updatedAt ? `Last saved ${timeAgo(c.updatedAt)}` : 'Never saved'),
            h('span', { class: 'row-time' }, 'Edit →')))))),
      h('section', { class: 'panel' },
        h('h3', {}, 'Quick actions'),
        h('div', { class: 'quick' },
          h('a', { class: 'btn', href: '#gallery' }, 'Add a photo'),
          h('a', { class: 'btn alt', href: '#home' }, 'Edit home page'),
          h('a', { class: 'btn alt', href: '#about' }, 'Edit about page'),
          h('a', { class: 'btn alt', href: '#settings' }, 'Settings')))));
}
