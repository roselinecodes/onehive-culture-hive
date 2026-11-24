import { NextResponse } from 'next/server';
import { getAnswers, getRoles, storageMode, rawCounts } from '@/lib/store';
export const dynamic = 'force-dynamic';

// Safe status check: shows which storage is in use and whether it works. No secrets.
export async function GET() {
  const out = { storage: storageMode, ok: false };
  try { const roles = await getRoles(true); out.ok = true; const rows = await getAnswers(); try { out.db_rows = await rawCounts(); } catch (e) { out.db_rows = 'n/a'; } out.answer_roles = [...new Set(rows.map((x) => typeof x.role_id + ':' + String(x.role_id).slice(0, 30)))].slice(0, 5); out.role_ids = roles.map((r) => typeof r.id + ':' + r.id);
    out.roles = roles.map((r) => {
      const mine = rows.filter((x) => x.role_id === r.id);
      return { name: r.name, link: '/c/' + r.slug, status: r.status, candidates_started: new Set(mine.map((x) => x.session_id)).size, candidates_completed: new Set(mine.filter((x) => x.challenge_id === 'c_done').map((x) => x.session_id)).size, answers_saved: mine.length, last_answer: mine.length ? mine[mine.length - 1].timestamp : null };
    }); }
  catch (e) { out.error = String(e.message || e).replace(/postgres(ql)?:\/\/[^\s]+/g, '[hidden]').slice(0, 300); }
  return NextResponse.json(out, { status: out.ok ? 200 : 500 });
}
