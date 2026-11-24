import { NextResponse } from 'next/server';
import { getRoles, roleIsOpen } from '@/lib/store';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const roles = (await getRoles()).filter(roleIsOpen).map((r) => ({ slug: r.slug, name: r.name, closesAt: r.closesAt || '' }));
    return NextResponse.json({ roles });
  } catch (e) { return NextResponse.json({ roles: [], error: 'Could not load roles' }, { status: 500 }); }
}
