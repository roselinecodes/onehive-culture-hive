import { NextResponse } from 'next/server';
import { getQuestions, saveQuestions } from '@/lib/store';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const role = new URL(req.url).searchParams.get('role');
  try { return NextResponse.json({ questions: await getQuestions(role) }); }
  catch (e) { return NextResponse.json({ error: String(e.message || e) }, { status: 500 }); }
}

export async function PUT(req) {
  const { roleId, questions } = await req.json();
  if (!roleId || !Array.isArray(questions)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const ids = new Set();
  for (const q of questions) {
    if (!q.id || ids.has(q.id) || ['c0_start', 'c_done'].includes(q.id)) return NextResponse.json({ error: `Duplicate or reserved id: ${q.id}` }, { status: 400 });
    ids.add(q.id);
    if (!q.title || !q.type) return NextResponse.json({ error: `Question ${q.id} needs a title and type` }, { status: 400 });
  }
  try { await saveQuestions(roleId, questions); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: String(e.message || e) }, { status: 500 }); }
}
