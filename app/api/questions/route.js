import { NextResponse } from 'next/server';
import { getQuestions, getRoles, roleIsOpen } from '@/lib/store';
import { publicQuestions } from '@/lib/public';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const slug = new URL(req.url).searchParams.get('role');
  try {
    const roles = await getRoles();
    const role = roles.find((r) => r.slug === slug);
    if (!role || role.status === 'draft') return NextResponse.json({ error: 'This challenge does not exist.' }, { status: 404 });
    if (!roleIsOpen(role)) return NextResponse.json({ error: 'This challenge is now closed. Thank you for your interest in OneHive.', closed: true, roleName: role.name }, { status: 410 });
    const qs = await getQuestions(role.id);
    return NextResponse.json({ role: { id: role.id, slug: role.slug, name: role.name, closesAt: role.closesAt || '', contactName: role.contactName ?? 'Rosie', contactEmail: role.contactEmail ?? 'roseline@onehive.ai' }, intro: role.intro, questions: publicQuestions(qs) });
  } catch (e) {
    return NextResponse.json({ error: 'Could not load the challenge. Please try again shortly.' }, { status: 500 });
  }
}
