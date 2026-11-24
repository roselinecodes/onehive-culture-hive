import Challenge from '@/components/Challenge';
export const dynamic = 'force-dynamic';
export default function Page({ params }) { return <Challenge slug={params.slug} />; }
