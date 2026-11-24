import { NextResponse } from 'next/server';
import { addAnswer, getRoles } from '@/lib/store';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let p;
  try { p = await req.json(); } catch (e) { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
  if (!p || !/^[A-Z0-9]{6,30}$/.test(String(p.session_id || '')) || !/^[\w-]{1,40}$/.test(String(p.challenge_id || ''))) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  if (JSON.stringify(p.answer || {}).length > 20000) return NextResponse.json({ error: 'Too large' }, { status: 413 });
  const role = (await getRoles()).find((r) => r.id === p.role_id);
  if (!role || role.status === 'draft') return NextResponse.json({ error: 'Unknown challenge' }, { status: 400 });
  try {
    await addAnswer({ ...p, name: String(p.name || '').slice(0, 120), email: String(p.email || '').slice(0, 160) });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: 'Could not save' }, { status: 500 }); }
}
