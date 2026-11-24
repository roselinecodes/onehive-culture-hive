import { NextResponse } from 'next/server';
import { getAnswers, getQuestions, getRoles, saveQuestions, upsertRole } from '@/lib/store';
import { blankRole } from '@/lib/defaults';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [roles, rows] = await Promise.all([getRoles(true), getAnswers()]);
    const counts = {};
    for (const r of rows) { const c = counts[r.role_id] || (counts[r.role_id] = { started: new Set(), done: new Set() }); c.started.add(r.session_id); if (r.challenge_id === 'c_done') c.done.add(r.session_id); }
    return NextResponse.json({ roles: roles.map((r) => ({ ...r, started: counts[r.id] ? counts[r.id].started.size : 0, completed: counts[r.id] ? counts[r.id].done.size : 0 })) });
  } catch (e) { return NextResponse.json({ error: String(e.message || e) }, { status: 500 }); }
}

// Create a role: { name, from: 'blank'|'copy'|'draft', copyFrom, draft: { role, questions } }
export async function POST(req) {
  const body = await req.json();
  try {
    let role = blankRole(body.name);
    let questions = [];
    if (body.from === 'copy' && body.copyFrom) {
      const src = (await getRoles(true)).find((r) => r.id === body.copyFrom);
      if (src) role = { ...JSON.parse(JSON.stringify(src)), id: role.id, slug: role.slug, name: role.name, status: 'draft' };
      const sq = await getQuestions(body.copyFrom);
      questions = sq.map((q) => ({ ...q, id: q.id + '-' + role.id.slice(-4) }));
    } else if (body.from === 'draft' && body.draft) {
      const d = body.draft;
      role = { ...role, description: d.role.description || '', intro: d.role.intro || role.intro, pillars: d.role.pillars && d.role.pillars.length >= 3 ? d.role.pillars : role.pillars };
      questions = d.questions || [];
    }
    const roles = await getRoles(true);
    let slug = role.slug, n = 2;
    while (roles.some((r) => r.slug === slug)) slug = role.slug + '-' + n++;
    role.slug = slug;
    await upsertRole(role);
    await saveQuestions(role.id, questions);
    return NextResponse.json({ ok: true, role });
  } catch (e) { return NextResponse.json({ error: String(e.message || e) }, { status: 500 }); }
}

export async function PUT(req) {
  const { role } = await req.json();
  if (!role || !role.id || !role.name || !/^[a-z0-9-]{2,60}$/.test(role.slug || '')) return NextResponse.json({ error: 'A role needs a name and a link name using lowercase letters, numbers and dashes.' }, { status: 400 });
  if (!Array.isArray(role.pillars) || role.pillars.length < 3) return NextResponse.json({ error: 'A role needs at least three culture areas.' }, { status: 400 });
  try { await upsertRole(role); return NextResponse.json({ ok: true, role }); }
  catch (e) { return NextResponse.json({ error: String(e.message || e) }, { status: 400 }); }
}
