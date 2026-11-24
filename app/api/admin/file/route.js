import { getFile } from '@/lib/store';
export const dynamic = 'force-dynamic';

// Admin-only (protected by middleware): download a candidate's CV.
export async function GET(req) {
  const id = new URL(req.url).searchParams.get('id');
  const f = await getFile(id);
  if (!f) return new Response('Not found', { status: 404 });
  return new Response(f.buffer, { headers: { 'Content-Type': f.mime || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${String(f.name).replace(/"/g, '')}"`, 'Cache-Control': 'private, no-store' } });
}
