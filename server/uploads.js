// Photo uploads. A file is accepted only if its first bytes say it really is a JPEG, PNG, WebP or AVIF
// (the name and the type the browser claims are ignored), and it is stored under a random name.
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const NAME_RE = /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp|avif)$/;

/** Work out the real image type from the file's first bytes, or null if it isn't a supported image. */
export function sniffImage(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { ext: 'png', mime: 'image/png' };
  const tag = (from, to) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && tag(0, 4) === 'RIFF' && tag(8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (b.length >= 12 && tag(4, 8) === 'ftyp' && ['avif', 'avis'].includes(tag(8, 12))) return { ext: 'avif', mime: 'image/avif' };
  return null;
}

/** Store an uploaded image. Returns { src } (a site path like /uploads/abc.jpg) or { error }. */
export async function saveUpload(file, dir) {
  if (!file || typeof file.arrayBuffer !== 'function') return { error: 'No photo was sent.' };
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'That photo is over 8 MB. Please resize it first.' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { error: 'Only JPEG, PNG, WebP or AVIF photos are allowed.' };
  const name = `${randomBytes(16).toString('hex')}.${type.ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
  return { src: `/uploads/${name}` };
}

/** Delete a stored photo. Anything that isn't one of our own generated names is ignored. */
export async function removeUpload(src, dir) {
  if (!src || !NAME_RE.test(src)) return;
  try { await unlink(join(dir, src.slice('/uploads/'.length))); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
