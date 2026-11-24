import { NextResponse } from 'next/server';
import { getRoles } from '@/lib/store';
import { jdHtml } from '@/lib/jd';
export const dynamic = 'force-dynamic';

// Public: the role's job description as HTML for the pop-up.
export async function GET(req) {
  const slug = new URL(req.url).searchParams.get('role');
  const role = (await getRoles()).find((r) => r.slug === slug && r.status !== 'draft');
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const jd = await jdHtml(role);
    if (!jd) return NextResponse.json({ error: 'No job description yet' }, { status: 404 });
    return NextResponse.json(jd);
  } catch (e) { return NextResponse.json({ error: 'Could not open the job description' }, { status: 500 }); }
}
