'use client';
import { useEffect, useState } from 'react';
import { band, computeCandidate, groupCandidates } from '@/lib/scoring';
import { Radar, Ring, STATUSES } from './Admin';

export default function Report({ roleId, ids }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetch('/api/admin/responses?role=' + encodeURIComponent(roleId || ''), { cache: 'no-store' })
      .then((r) => { if (r.status === 401) { window.location.href = '/admin/login'; } return r.json(); })
      .then((j) => (j.error ? setErr(j.error) : setData(j))).catch(() => setErr('Could not load.'));
  }, [roleId]);
  if (err) return <div className="rep">{err}</div>;
  if (!data) return <div className="rep">Loading…</div>;
  const role = data.role;
  const all = groupCandidates(data.rows).map((s) => computeCandidate(s, data.questions, role, data.reviews[s.sid]));
  const ranked = all.slice().sort((a, b) => (b.done - a.done) || (b.fit - a.fit));
  const list = ranked.filter((s) => ids.includes(s.sid));
  const colours = ['#FCB040', '#2BA7A0', '#D77F5A', '#1A2196', '#7a5000', '#17605b'];
  const written = data.questions.filter((q) => q.type === 'written');
  const st = (id) => (STATUSES.find((x) => x.id === id) || STATUSES[0]).t;
  return (
    <div className="rep">
      <div className="noprint"><button className="btn amber" onClick={() => window.print()}>Print or save as PDF</button><button className="btn" onClick={() => window.close()}>Close</button></div>
      <div className="rhead">
        <img className="l" src="/logo.png" alt="OneHive" />
        <div><h1>Candidate comparison</h1><div className="sub">{role.name} · {list.length} candidate{list.length === 1 ? '' : 's'} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
      </div>
      <table>
        <thead><tr><th>Rank</th><th>Candidate</th><th>Fit</th>{role.pillars.map((p) => <th key={p.id}>{p.name}</th>)}<th>Status</th></tr></thead>
        <tbody>{list.map((s) => { const b = band(s.fit, role.bands); return (
          <tr key={s.sid}><td><b>{ranked.indexOf(s) + 1}</b></td><td><b>{s.name}</b><br /><span className="sub">{s.email}</span></td><td><b>{s.fit}%</b><br /><span style={{ color: b.fg, fontSize: 12 }}>{b.t}</span></td>
            {role.pillars.map((p) => <td key={p.id}>{s.pl[p.id] == null ? '–' : Math.round(s.pl[p.id] * 100) + '%'}</td>)}<td>{st(s.status)}</td></tr>); })}</tbody>
      </table>
      {list.length > 1 && (
        <div style={{ maxWidth: 460, margin: '0 auto 18px' }}>
          <Radar pillars={role.pillars} sets={list.slice(0, 6).map((s, i) => ({ s, c: colours[i], o: 0.12 }))} />
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>{list.slice(0, 6).map((s, i) => <span key={s.sid}><i style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: colours[i], marginRight: 5 }} />{s.name}</span>)}</div>
        </div>
      )}
      <div className="cc">
        {list.map((s) => { const b = band(s.fit, role.bands); const rv = data.reviews[s.sid] || {}; return (
          <div className="ccard" key={s.sid}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Ring p={s.fit} c={b.c} size={60} /><div><h3>{s.name}</h3><div className="sub">{s.loc || 'Location not given'} · {s.done ? 'Completed' : 'Did not finish'} · {Math.round(s.total / 60)} min</div></div></div>
            <div style={{ marginTop: 10 }}>{role.pillars.map((p) => { const v = s.pl[p.id]; const pc = v == null ? 0 : Math.round(v * 100); return (<div key={p.id}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>{p.name}</span><b>{v == null ? '–' : pc + '%'}</b></div><div className="bar"><i style={{ width: pc + '%', background: band(pc, role.bands).c }} /></div></div>); })}</div>
            <div style={{ fontSize: 12, marginTop: 6 }}><b>Integrity:</b> {s.flags.filter((f) => f.t !== 'incomplete').map((f) => f.t).join(', ') || 'clean run'}</div>
            {written.map((q) => { const w = s.cells[q.id] && s.cells[q.id].a; const r = (rv.written || {})[q.id] || {}; return w && w.text ? (<div key={q.id} style={{ marginTop: 8, fontSize: 12.5 }}><b>{q.title}</b>{(r.manual || r.ai) ? ` · ${r.manual || r.ai}/5` : ''}<div style={{ background: '#FFF8F0', borderRadius: 10, padding: 8, marginTop: 4, whiteSpace: 'pre-wrap' }}>{w.text}</div>{r.reason && <div className="sub" style={{ marginTop: 3 }}>Claude: {r.reason}</div>}</div>) : null; })}
            {rv.notes && <div style={{ marginTop: 8, fontSize: 12.5 }}><b>Notes:</b> {rv.notes}</div>}
          </div>); })}
      </div>
    </div>
  );
}
