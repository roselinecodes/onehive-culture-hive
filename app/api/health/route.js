import { NextResponse } from 'next/server';
import { getRoles, storageMode } from '@/lib/store';
export const dynamic = 'force-dynamic';

// Safe status check: shows which storage is in use and whether it works. No secrets.
export async function GET() {
  const out = { storage: storageMode, ok: false };
  try { const roles = await getRoles(true); out.ok = true; out.roles = roles.map((r) => ({ name: r.name, link: '/c/' + r.slug, status: r.status })); }
  catch (e) { out.error = String(e.message || e).replace(/postgres(ql)?:\/\/[^\s]+/g, '[hidden]').slice(0, 300); }
  return NextResponse.json(out, { status: out.ok ? 200 : 500 });
}
