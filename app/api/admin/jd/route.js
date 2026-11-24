import { NextResponse } from 'next/server';
import { getRoles, saveFile, upsertRole, MAX_FILE_BYTES } from '@/lib/store';
export const dynamic = 'force-dynamic';

// Admin: upload or replace a role's job description (Word or PDF).
export async function POST(req) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Upload failed' }, { status: 400 });
  const file = form.get('file'), roleId = String(form.get('role_id') || '');
  const role = (await getRoles(true)).find((r) => r.id === roleId);
  if (!role) return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Choose a file' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'The file must be 4 MB or smaller' }, { status: 413 });
  const ext = String(file.name).toLowerCase().split('.').pop();
  const mime = ext === 'pdf' ? 'application/pdf' : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : null;
  if (!mime) return NextResponse.json({ error: 'Upload a Word (.docx) or PDF file' }, { status: 415 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = String(file.name).replace(/[^\w.\- ()]/g, '_').slice(0, 120);
  const id = await saveFile({ session_id: 'JD', role_id: roleId, name, mime, buffer });
  const updated = { ...role, jdFileId: id, jdName: name };
  await upsertRole(updated);
  return NextResponse.json({ ok: true, role: updated });
}
