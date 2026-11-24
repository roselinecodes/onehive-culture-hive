import Report from '@/components/Report';
export const dynamic = 'force-dynamic';
export default function Page({ searchParams }) { return <Report roleId={searchParams.role} ids={String(searchParams.ids || '').split(',').filter(Boolean)} />; }
