import { NextResponse } from 'next/server';
import { COOKIE, checkLogin, makeToken, SESSION_SECONDS } from '@/lib/auth';

// Slow down guessing: 5 failed attempts per 15 minutes per address (per server instance).
const fails = new Map();
const WINDOW = 15 * 60 * 1000, MAX = 5;

export async function POST(req) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now();
  const rec = fails.get(ip);
  if (rec && now - rec.first < WINDOW && rec.count >= MAX) return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password || !(await checkLogin(email, password))) {
    const r = rec && now - rec.first < WINDOW ? rec : { first: now, count: 0 };
    r.count++; fails.set(ip, r);
    await new Promise((res) => setTimeout(res, 800));
    return NextResponse.json({ error: 'That email or password is not right.' }, { status: 401 });
  }
  fails.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeToken(), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_SECONDS });
  return res;
}
