import { h } from '../dom.js';
import { api } from '../api.js';
import { toast, field, showErrors, pageHeader } from '../ui.js';

const COMMON = [[1, 1], [5, 4], [4, 3], [3, 2], [16, 9], [21, 9], [4, 5], [3, 4], [2, 3], [9, 16]];
/** The standard photo shape closest to a width and height. */
export function nearestRatio(w, hgt) {
  const target = Math.log(w / hgt);
  return COMMON.reduce((best, r) => (Math.abs(Math.log(r[0] / r[1]) - target) < Math.abs(Math.log(best[0] / best[1]) - target) ? r : best));
}

function readShape(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ url, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ url, w: 0, h: 0 });
    img.src = url;
  });
}

export async function renderGallery(main) {
  main.append(pageHeader('Gallery', 'The photos on your Frames page. They appear in this order.'));
  const body = h('div', {});
  main.append(body);
  let frames = [];

  async function load() {
    const r = await api('GET', '/frames');
    if (!r.ok) { body.replaceChildren(h('p', { class: 'err' }, r.data.error || 'Could not load the gallery.')); return; }
    frames = r.data.frames;
    draw();
  }

  function draw() {
    const tags = [...new Set(frames.map((f) => f.tag).filter(Boolean))];
    body.replaceChildren(
      addPanel(tags),
      h('datalist', { id: 'tags' }, tags.map((t) => h('option', { value: t }))),
      h('div', { class: 'frames' }, frames.length ? frames.map((f, i) => frameCard(f, i)) : h('div', { class: 'empty' }, 'No frames yet. Add your first photo above.')));
  }

  const reorder = async (i, d) => {
    const ids = frames.map((f) => f.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    const r = await api('POST', '/frames/order', { ids });
    if (!r.ok) return toast(r.data.error || 'Could not reorder.', 'error');
    await load();
  };

  function addPanel(tags) {
    let shape = null;
    const fields = {
      title: field({ label: 'Title', path: 'title', required: true, max: 80 }),
      place: field({ label: 'Place', path: 'place', max: 80, placeholder: 'Lorem Ipsum' }),
      time: field({ label: 'When', path: 'time', max: 60, placeholder: 'Dolor sit amet' }),
      tag: field({ label: 'Filter tag', path: 'tag', max: 30, hint: 'Photos with the same tag appear together under one filter button.' }),
      alt: field({ label: 'Description for screen readers', path: 'alt', max: 200, hint: 'A short sentence describing the photo.' }),
    };
    fields.tag.querySelector('input').setAttribute('list', 'tags');
    const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif', required: true, dataset: { path: 'photo' }, id: 'add-photo' });
    const fileField = h('div', { class: 'field' }, h('label', { for: 'add-photo' }, 'Photo', h('span', { class: 'req' }, ' *')), file, h('p', { class: 'hint' }, 'JPEG, PNG, WebP or AVIF, up to 8 MB. Resize big photos to about 2000 pixels on the long side first.'), h('p', { class: 'err', role: 'alert' }));
    const preview = h('div', {});
    file.addEventListener('change', async () => {
      preview.replaceChildren();
      shape = null;
      const f = file.files[0];
      if (!f) return;
      const s = await readShape(f);
      if (!s.w) { toast('That file couldn’t be read as an image.', 'error'); file.value = ''; return; }
      shape = nearestRatio(s.w, s.h);
      preview.append(h('img', { class: 'preview-img', src: s.url, alt: 'Preview of the chosen photo' }), h('p', { class: 'hint' }, `Shape: ${shape[0]} : ${shape[1]}`));
      if (!fields.title.querySelector('input').value) fields.title.querySelector('input').value = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    });
    const submit = h('button', { class: 'btn', type: 'submit' }, 'Add photo');
    const form = h('form', { class: 'panel', onsubmit: async (e) => {
      e.preventDefault();
      if (!file.files[0] || !shape) return showErrors(form, { photo: 'Choose a photo.' });
      const data = new FormData();
      for (const [k, f] of Object.entries(fields)) data.set(k, f.querySelector('input').value);
      data.set('ratioW', shape[0]); data.set('ratioH', shape[1]);
      data.set('photo', file.files[0]);
      submit.disabled = true; submit.textContent = 'Uploading…';
      const r = await api('POST', '/frames', data);
      submit.disabled = false; submit.textContent = 'Add photo';
      if (!r.ok) { if (!showErrors(form, r.data.errors)) toast(r.data.error || 'Could not add the photo.', 'error'); return; }
      toast('Photo added. It’s live on your Frames page.');
      await load();
    } },
    h('h3', {}, 'Add a photo'), h('br'), fileField, preview, h('div', { class: 'grid2' }, fields.title, fields.place, fields.time, fields.tag), fields.alt, h('div', { class: 'actions' }, submit));
    return form;
  }

  function frameCard(f, i) {
    const edit = h('div', { class: 'edit', hidden: true });
    const thumb = h('div', { class: 'thumb' }, f.src ? h('img', { src: f.src, alt: f.alt || f.title }) : 'Illustration');
    const editBtn = h('button', { class: 'mini', type: 'button', 'aria-expanded': 'false', onclick: () => {
      edit.hidden = !edit.hidden;
      editBtn.setAttribute('aria-expanded', String(!edit.hidden));
      if (!edit.hidden && !edit.childElementCount) buildEdit(f, edit);
    } }, 'Edit');
    return h('article', { class: 'frame' }, thumb,
      h('div', {},
        h('h3', {}, f.title, h('span', { class: 'tag' }, f.tag || 'No tag')),
        h('p', { class: 'sub' }, [f.place, f.time].filter(Boolean).join(' · ') || ' '),
        h('div', { class: 'tools' },
          h('button', { class: 'mini', type: 'button', 'aria-label': `Move ${f.title} earlier`, disabled: i === 0, onclick: () => reorder(i, -1) }, '↑'),
          h('button', { class: 'mini', type: 'button', 'aria-label': `Move ${f.title} later`, disabled: i === frames.length - 1, onclick: () => reorder(i, 1) }, '↓'),
          editBtn,
          h('button', { class: 'mini danger', type: 'button', onclick: async () => {
            if (!confirm(`Delete “${f.title}”? The photo is removed from your site and can’t be recovered.`)) return;
            const r = await api('DELETE', `/frames/${f.id}`);
            if (!r.ok) return toast(r.data.error || 'Could not delete.', 'error');
            toast('Frame deleted.');
            await load();
          } }, 'Delete'))),
      edit);
  }

  function buildEdit(f, edit) {
    const fl = {
      title: field({ label: 'Title', path: 'title', value: f.title, required: true, max: 80 }),
      place: field({ label: 'Place', path: 'place', value: f.place, max: 80 }),
      time: field({ label: 'When', path: 'time', value: f.time, max: 60 }),
      tag: field({ label: 'Filter tag', path: 'tag', value: f.tag, max: 30 }),
      alt: field({ label: 'Description for screen readers', path: 'alt', value: f.alt, max: 200 }),
      ratioW: field({ label: 'Shape: width', path: 'ratioW', type: 'number', value: String(f.ratio[0]) }),
      ratioH: field({ label: 'Shape: height', path: 'ratioH', type: 'number', value: String(f.ratio[1]) }),
    };
    fl.tag.querySelector('input').setAttribute('list', 'tags');
    const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif', id: `rep-${f.id}`, dataset: { path: 'photo' } });
    const remove = f.art && f.src ? h('label', { class: 'hint' }, h('input', { type: 'checkbox', id: `rm-${f.id}` }), ' Remove the photo and go back to the illustration') : null;
    const save = h('button', { class: 'btn', type: 'submit' }, 'Save changes');
    const form = h('form', { onsubmit: async (e) => {
      e.preventDefault();
      const data = new FormData();
      for (const [k, x] of Object.entries(fl)) data.set(k, x.querySelector('input').value);
      if (file.files[0]) data.set('photo', file.files[0]);
      if (remove && remove.querySelector('input').checked) data.set('removePhoto', '1');
      save.disabled = true;
      const r = await api('PUT', `/frames/${f.id}`, data);
      save.disabled = false;
      if (!r.ok) { if (!showErrors(form, r.data.errors)) toast(r.data.error || 'Could not save.', 'error'); return; }
      toast('Saved.');
      await load();
    } },
    h('div', { class: 'grid2' }, fl.title, fl.place, fl.time, fl.tag), fl.alt, h('div', { class: 'grid2' }, fl.ratioW, fl.ratioH),
    h('div', { class: 'field' }, h('label', { for: file.id }, f.src ? 'Replace the photo' : 'Add a photo instead of the illustration'), file, h('p', { class: 'err', role: 'alert' })), remove,
    h('div', { class: 'actions' }, save));
    edit.append(form);
  }

  await load();
}
