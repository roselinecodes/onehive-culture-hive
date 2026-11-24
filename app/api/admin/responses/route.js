import { NextResponse } from 'next/server';
import { getAnswers, getQuestions, getReviews, getRoles, storageMode } from '@/lib/store';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const roleId = new URL(req.url).searchParams.get('role');
  try {
    const roles = await getRoles(true);
    const role = roles.find((r) => r.id === roleId) || roles[0];
    const [rows, questions, reviews] = await Promise.all([getAnswers(role.id), getQuestions(role.id), getReviews()]);
    const sids = new Set(rows.map((r) => r.session_id));
    const myReviews = Object.fromEntries(Object.entries(reviews).filter(([k]) => sids.has(k)));
    return NextResponse.json({ role, rows, questions, reviews: myReviews, storage: storageMode, sheetId: storageMode === 'sheets' ? process.env.SHEET_ID : null, ai: !!process.env.ANTHROPIC_API_KEY, loadedAt: new Date().toISOString() });
  } catch (e) { return NextResponse.json({ error: String(e.message || e) }, { status: 500 }); }
}
