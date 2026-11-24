import { NextResponse } from 'next/server';
import { COOKIE, expectedToken } from '@/lib/auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  const pw = process.env.ADMIN_PASSWORD || 'onehive-local';
  if (!password || password !== pw) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await expectedToken(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 14 });
  return res;
}
