import { NextResponse } from 'next/server';
import { getRoles, roleIsOpen, saveFile, MAX_FILE_BYTES } from '@/lib/store';
export const dynamic = 'force-dynamic';

const TYPES = {
  pdf: { mime: 'application/pdf', magic: (b) => b.slice(0, 4).toString('latin1') === '%PDF' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: (b) => b[0] === 0x50 && b[1] === 0x4b },
  doc: { mime: 'application/msword', magic: (b) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 },
};

// Candidate CV upload. PDF or Word, up to 4 MB.
export async function POST(req) {
  let form;
  try { form = await req.formData(); } catch (e) { return NextResponse.json({ error: 'The upload did not come through. Please try again.' }, { status: 400 }); }
  const file = form.get('file'), sid = String(form.get('session_id') || ''), roleId = String(form.get('role_id') || '');
  if (!/^[A-Z0-9]{6,30}$/.test(sid)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const role = (await getRoles()).find((r) => r.id === roleId);
  if (!roleIsOpen(role)) return NextResponse.json({ error: 'This challenge is now closed.' }, { status: 410 });
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Please attach your CV.' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Your CV must be 4 MB or smaller.' }, { status: 413 });
  const ext = String(file.name || '').toLowerCase().split('.').pop();
  const type = TYPES[ext];
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!type || !type.magic(buffer)) return NextResponse.json({ error: 'Please upload your CV as a PDF or Word document.' }, { status: 415 });
  try {
    const name = String(file.name).replace(/[^\w.\- ()]/g, '_').slice(0, 120);
    const id = await saveFile({ session_id: sid, role_id: roleId, name, mime: type.mime, buffer });
    return NextResponse.json({ ok: true, id, name, size: buffer.length });
  } catch (e) {
    return NextResponse.json({ error: 'We could not save your CV. Please try again.' }, { status: 500 });
  }
}
