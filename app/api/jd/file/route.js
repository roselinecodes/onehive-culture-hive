import { getRoles } from '@/lib/store';
import { loadJd } from '@/lib/jd';
export const dynamic = 'force-dynamic';

// Public: download the role's job description file.
export async function GET(req) {
  const slug = new URL(req.url).searchParams.get('role');
  const role = (await getRoles()).find((r) => r.slug === slug && r.status !== 'draft');
  if (!role) return new Response('Not found', { status: 404 });
  const f = await loadJd(role);
  if (!f) return new Response('Not found', { status: 404 });
  return new Response(f.buffer, { headers: { 'Content-Type': f.mime, 'Content-Disposition': `attachment; filename="${String(f.name).replace(/"/g, '')}"`, 'Cache-Control': 'public, max-age=300' } });
}
