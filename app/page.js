import { getRoles, roleIsOpen } from '@/lib/store';
export const dynamic = 'force-dynamic';

export default async function Home() {
  let roles = [], problem = '';
  try { roles = (await getRoles()).filter(roleIsOpen); } catch (e) { problem = 'The challenges are not available just now. Please try again later.'; console.error(e); }
  return (
    <div className="hive">
      <div className="top"><img className="logo" src="/logo.png" alt="OneHive" /></div>
      <div className="card hero">
        <img className="squiggle" src="/squiggle.png" alt="" />
        <span className="kicker">Join the hive</span>
        <h1>Open challenges</h1>
        <p className="lead">OneHive builds AI-powered tools that help charities, social enterprises and young people thrive. Pick the role you are applying for to start its challenge.</p>
        {roles.length ? roles.map((r) => (
          <a key={r.slug} href={`/c/${r.slug}`} className="opt" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <b>{r.name}</b>{r.closesAt && <span style={{ display: 'block', fontSize: 13, color: '#6f655d' }}>Closes {new Date(r.closesAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          </a>
        )) : <p className="lead">{problem || 'There are no open challenges right now.'}</p>}
      </div>
    </div>
  );
}
