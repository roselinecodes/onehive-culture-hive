import { NextResponse } from 'next/server';
import { getAnswers, getRoles, roleIsOpen } from '@/lib/store';
export const dynamic = 'force-dynamic';

// Checks the role is open and this email has not already finished it.
export async function POST(req) {
  const { role_id, email } = await req.json().catch(() => ({}));
  const role = (await getRoles()).find((r) => r.id === role_id);
  if (!roleIsOpen(role)) return NextResponse.json({ error: 'This challenge is now closed.' }, { status: 410 });
  const e = String(email || '').trim().toLowerCase();
  const done = (await getAnswers(role.id)).some((r) => r.challenge_id === 'c_done' && String(r.email).trim().toLowerCase() === e);
  if (done) return NextResponse.json({ error: 'You have already completed this challenge. Thank you, we will be in touch.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
