import { h } from '../dom.js';
import { api } from '../api.js';
import { toast, fmtDate, pageHeader } from '../ui.js';

export async function renderInbox(main, ctx) {
  const head = pageHeader('Inbox', 'Messages sent through your Contact page.');
  main.append(head, h('p', { class: 'muted' }, 'Loading…'));
  const r = await api('GET', '/messages');
  main.replaceChildren(head);
  if (!r.ok) { main.append(h('p', { class: 'err' }, r.data.error || 'Could not load messages.')); return; }
  const list = h('div', { class: 'msgs' });
  main.append(list);
  const draw = (messages) => {
    list.replaceChildren(...(messages.length ? messages.map(card) : [h('div', { class: 'empty' }, 'No messages yet. Messages sent through your Contact page will appear here.')]));
  };
  let messages = r.data.messages;

  const setRead = async (m, read, el) => {
    const res = await api('PATCH', `/messages/${m.id}`, { read });
    if (!res.ok) return toast(res.data.error || 'Could not update the message.', 'error');
    m.read = read;
    el.dataset.unread = String(!read);
    ctx.refreshUnread();
  };

  function card(m) {
    const el = h('details', { class: 'msg', dataset: { unread: String(!m.read) } });
    const toggle = h('button', { class: 'mini', type: 'button', onclick: () => setRead(m, !m.read, el).then(() => { toggle.textContent = m.read ? 'Mark unread' : 'Mark read'; }) }, m.read ? 'Mark unread' : 'Mark read');
    el.append(
      h('summary', {}, h('span', { class: 'who' }, m.name), h('span', { class: 'meta' }, `${m.email} · ${fmtDate(m.createdAt)}`), h('span', { class: 'preview' }, m.message)),
      h('div', { class: 'body' }, h('p', {}, m.message)),
      h('div', { class: 'tools' },
        h('a', { class: 'mini', href: `mailto:${encodeURIComponent(m.email).replace('%40', '@')}?subject=${encodeURIComponent('Re: your message')}` }, 'Reply by email'),
        toggle,
        h('button', { class: 'mini danger', type: 'button', onclick: async () => {
          if (!confirm(`Delete the message from ${m.name}? This can’t be undone.`)) return;
          const res = await api('DELETE', `/messages/${m.id}`);
          if (!res.ok) return toast(res.data.error || 'Could not delete the message.', 'error');
          messages = messages.filter((x) => x.id !== m.id);
          draw(messages);
          ctx.refreshUnread();
        } }, 'Delete')));
    el.addEventListener('toggle', () => { if (el.open && !m.read) setRead(m, true, el).then(() => { toggle.textContent = 'Mark unread'; }); });
    return el;
  }
  draw(messages);
}
