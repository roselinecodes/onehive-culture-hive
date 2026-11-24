// Job description per role: an uploaded file (admin) or, for the first role, the bundled Word doc.
import fs from 'fs';
import path from 'path';
import { getFile } from './store';

const cache = new Map();

export async function loadJd(role) {
  if (role.jdFileId) {
    const f = await getFile(role.jdFileId);
    if (f) return { name: role.jdName || f.name, mime: f.mime, buffer: f.buffer };
  }
  if (role.id === 'ea-ops') {
    const p = path.join(process.cwd(), 'public', 'jd', 'ea-ops-job-description.docx');
    if (fs.existsSync(p)) return { name: 'OneHive Job Description - ' + role.name + '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: fs.readFileSync(p) };
  }
  return null;
}

export async function jdHtml(role) {
  const key = role.id + ':' + (role.jdFileId || 'bundled');
  if (cache.has(key)) return cache.get(key);
  const f = await loadJd(role);
  if (!f) return null;
  let html = '';
  if (/wordprocessingml/.test(f.mime) || /\.docx$/i.test(f.name)) {
    const mammoth = (await import('mammoth')).default || (await import('mammoth'));
    const out = await mammoth.convertToHtml({ buffer: f.buffer });
    html = out.value.replace(/<img[^>]*>/g, '').replace(/<p>\s*<\/p>/g, '');
  }
  const res = { name: f.name, html, isPdf: /pdf/.test(f.mime) };
  cache.set(key, res);
  return res;
}
