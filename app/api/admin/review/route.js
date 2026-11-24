import { NextResponse } from 'next/server';
import { saveReview } from '@/lib/store';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { session_id, review } = await req.json();
  if (!session_id || typeof review !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  try { await saveReview(session_id, review); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: String(e.message || e) }, { status: 500 }); }
}
