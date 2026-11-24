'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { band, computeCandidate, explain, groupCandidates } from '@/lib/scoring';
import QuestionEditor from './QuestionEditor';
import Challenge from './Challenge';
import { publicQuestion } from '@/lib/public';
import { QUESTION_TYPES as QTYPES } from '@/lib/defaults';

const C = { amber: '#FCB040', teal: '#2BA7A0', clay: '#D77F5A', black: '#25201D', blue: '#1A2196', line: '#eadfce' };
export const STATUSES = [
  { id: 'new', t: 'New', c: '#a99c8f' },
  { id: 'shortlist', t: 'Shortlist', c: C.teal },
  { id: 'interview', t: 'Interview', c: C.blue },
  { id: 'offer', t: 'Offer', c: '#3f8f3a' },
  { id: 'rejected', t: 'Rejected', c: C.clay },
];
const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

function hexPts(cx, cy, r, n = 6) { const p = []; for (let i = 0; i < n; i++) { const a = (Math.PI / 180) * ((360 / n) * i - 90); p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); } return p.join(' '); }
function Ring({ p, c, size = 60 }) {
  const r = 24, L = 2 * Math.PI * r;
  return (<svg viewBox="0 0 60 60" width={size} height={size}><circle cx="30" cy="30" r={r} fill="none" stroke="#f1e9de" strokeWidth="6" /><circle cx="30" cy="30" r={r} fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" strokeDasharray={L.toFixed(1)} strokeDashoffset={(L * (1 - p / 100)).toFixed(1)} transform="rotate(-90 30 30)" /><text x="30" y="35" textAnchor="middle" fontFamily="Outfit, system-ui, sans-serif" fontWeight="700" fontSize="16" fill={C.black}>{p}</text></svg>);
}
function RankHex({ n, c }) { return (<svg viewBox="0 0 34 38" width="34"><polygon points={hexPts(17, 19, 17)} fill={c} /><text x="17" y="24.5" textAnchor="middle" fontFamily="Outfit, system-ui, sans-serif" fontWeight="700" fontSize="15" fill={C.black}>{n}</text></svg>); }
function Radar({ sets, pillars }) {
  const n = Math.max(3, pillars.length), S = 320, cx = 160, cy = 164, R = 106;
  const pt = (i, v) => { const a = (Math.PI / 180) * ((360 / n) * i - 90); return [cx + R * v * Math.cos(a), cy + R * v * Math.sin(a)]; };
  return (
    <svg viewBox={`-70 0 ${S + 140} ${S + 10}`}>
      {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={hexPts(cx, cy, R * k, n)} fill={k === 1 ? '#fffaf2' : 'none'} stroke={C.line} />)}
      {pillars.map((p, i) => { const [x, y] = pt(i, 1); const [lx, ly] = pt(i, 1.2); const cos = Math.cos((Math.PI / 180) * ((360 / n) * i - 90)); const anc = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'; const parts = p.name.split(' & ');
        return (<g key={p.id}><line x1={cx} y1={cy} x2={x} y2={y} stroke={C.line} /><text x={lx} y={ly - (parts.length > 1 ? 3 : -4)} textAnchor={anc} fontFamily="Outfit, system-ui, sans-serif" fontSize="12" fontWeight="600" fill="#5d544d">{parts[0]}{parts.length > 1 ? ' &' : ''}</text>{parts.length > 1 && <text x={lx} y={ly + 11} textAnchor={anc} fontFamily="Outfit, system-ui, sans-serif" fontSize="12" fontWeight="600" fill="#5d544d">{parts[1]}</text>}</g>); })}
      {sets.map((st, k) => { const pts = pillars.map((p, i) => pt(i, st.s.pl[p.id] ?? 0).map((v) => v.toFixed(1)).join(',')).join(' ');
        return (<g key={k}><polygon points={pts} fill={st.c} fillOpacity={st.o} stroke={st.c} strokeWidth="2.5" strokeLinejoin="round" />{pillars.map((p, i) => { const [x, y] = pt(i, st.s.pl[p.id] ?? 0); return <circle key={p.id} cx={x} cy={y} r="3.5" fill={st.c} />; })}</g>); })}
    </svg>
  );
}
const fmtT = (s) => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export default function Admin() {
  const [tab, setTab] = useState('candidates');
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState(null);
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState({});
  const [status, setStatusMsg] = useState({ t: 'Loading…', err: false });
  const [sel, setSel] = useState(null);
  const [cmp, setCmp] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState({});
  const [scoring, setScoring] = useState(false);
  const say = (t, err = false) => setStatusMsg({ t, err });

  const loadRoles = useCallback(async () => {
    const r = await fetch('/api/admin/roles', { cache: 'no-store' });
    if (r.status === 401) { window.location.href = '/admin/login'; return []; }
    const j = await r.json();
    if (j.error) { say(j.error, true); return []; }
    setRoles(j.roles);
    return j.roles;
  }, []);

  const load = useCallback(async (rid) => {
    if (!rid) return;
    say('Loading responses…');
    try {
      const r = await fetch('/api/admin/responses?role=' + encodeURIComponent(rid), { cache: 'no-store' });
      if (r.status === 401) { window.location.href = '/admin/login'; return; }
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setData(j); setReviews(j.reviews || {});
      say(`${j.role.name}: ${new Set(j.rows.map((x) => x.session_id)).size} candidate(s), loaded ${new Date(j.loadedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}. Storage: ${j.storage === 'database' ? 'Neon database' : j.storage === 'sheets' ? 'Google Sheet' : 'local file (dev only)'}.`);
    } catch (e) { say('Could not load: ' + e.message, true); }
  }, []);

  useEffect(() => {
    loadRoles().then((rs) => {
      if (!rs.length) return;
      let saved = null; try { saved = localStorage.getItem('hiveRole'); } catch (e) { /* ignore */ }
      setRoleId(rs.find((r) => r.id === saved) ? saved : rs[0].id);
    });
  }, [loadRoles]);
  useEffect(() => { if (roleId) { try { localStorage.setItem('hiveRole', roleId); } catch (e) { /* ignore */ } setSel(null); setCmp(''); setPicked({}); setData(null); load(roleId); } }, [roleId, load]);

  const role = data ? data.role : roles.find((r) => r.id === roleId);
  const cands = useMemo(() => {
    if (!data) return [];
    return groupCandidates(data.rows).map((s) => computeCandidate(s, data.questions, data.role, reviews[s.sid]));
  }, [data, reviews]);
  const ranked = useMemo(() => cands.slice().sort((a, b) => (b.done - a.done) || (b.fit - a.fit)), [cands]);
  const q = search.trim().toLowerCase();
  const shown = ranked.filter((s) => (filter === 'all' || (filter === 'done' ? s.done : s.status === filter)) && (!q || (s.name + ' ' + s.email + ' ' + s.loc).toLowerCase().includes(q))).slice(0, 200);
  useEffect(() => { if (!sel && ranked.length) setSel(ranked[0].sid); }, [ranked, sel]);

  const saveTimers = useRef({});
  function updateReview(sid, patch, immediate = true) {
    setReviews((prev) => {
      const next = { ...prev, [sid]: { ...(prev[sid] || {}), ...patch } };
      const send = () => fetch('/api/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sid, review: next[sid] }) }).then((r) => { if (!r.ok) say('Could not save that change.', true); });
      clearTimeout(saveTimers.current[sid]);
      if (immediate) send(); else saveTimers.current[sid] = setTimeout(send, 900);
      return next;
    });
  }
  async function scoreOne(sid, force = false) {
    const r = await fetch('/api/admin/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sid, force }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Scoring failed');
    if (j.review) setReviews((prev) => ({ ...prev, [sid]: j.review }));
    return j.scored;
  }
  async function scoreAll() {
    if (!data) return;
    const wq = data.questions.filter((x) => x.type === 'written').map((x) => x.id);
    const todo = cands.filter((s) => wq.some((id) => s.cells[id] && s.cells[id].a.text && !(reviews[s.sid] && reviews[s.sid].written && reviews[s.sid].written[id] && reviews[s.sid].written[id].ai)));
    if (!todo.length) { say('Every written answer already has a Claude score.'); return; }
    setScoring(true);
    try { for (let i = 0; i < todo.length; i++) { say(`Claude is scoring ${todo[i].name} (${i + 1} of ${todo.length})…`); await scoreOne(todo[i].sid); } say('Written answers scored.'); }
    catch (e) { say(e.message, true); }
    setScoring(false);
  }
  function copyRanking() {
    const pills = data.role.pillars;
    const lines = [['Rank', 'Name', 'Email', 'Location', 'Fit %', 'Band', 'Status', 'Completed', ...pills.map((p) => p.name), 'Flags'].join(',')];
    ranked.forEach((s, i) => lines.push([i + 1, s.name, s.email, s.loc, s.fit, band(s.fit, data.role.bands).t, statusOf(s.status).t, s.done ? 'yes' : 'no', ...pills.map((p) => (s.pl[p.id] == null ? '' : Math.round(s.pl[p.id] * 100))), s.flags.map((f) => f.t).join('; ')].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')));
    navigator.clipboard.writeText(lines.join('\n')).then(() => say('Ranking copied as CSV. Paste it into a sheet.'), () => say('Could not copy.', true));
  }
  function openReport() {
    let ids = Object.keys(picked).filter((k) => picked[k]);
    if (!ids.length) ids = ranked.filter((s) => s.done && s.status !== 'rejected').slice(0, 3).map((s) => s.sid);
    if (!ids.length) { say('No completed candidates to compare yet.', true); return; }
    window.open(`/admin/report?role=${encodeURIComponent(roleId)}&ids=${ids.map(encodeURIComponent).join(',')}`, '_blank');
  }
  async function logout() { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }
  const publicUrl = role && typeof window !== 'undefined' ? `${window.location.origin}/c/${role.slug}` : '';

  const done = ranked.filter((s) => s.done);
  const avg = done.length ? Math.round(done.reduce((t, s) => t + s.fit, 0) / done.length) : 0;
  const podium = done.filter((s) => s.status !== 'rejected').slice(0, 3);
  const s = ranked.find((x) => x.sid === sel);
  const nPicked = Object.values(picked).filter(Boolean).length;
  const roleStatus = (r) => (r.status === 'open' ? { t: 'Open', c: C.teal } : r.status === 'closed' ? { t: 'Closed', c: C.clay } : { t: 'Draft', c: '#a99c8f' });

  return (
    <div className="adm">
      <header>
        <img className="logo" src="/logo.png" alt="OneHive" />
        <span className="sub">Hiring hive</span>
        {roles.length > 0 && (
          <select className="rolesel" value={roleId || ''} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name} ({roleStatus(r).t})</option>)}
          </select>
        )}
        <div className="tabs">
          {[['candidates', 'Candidates'], ['questions', 'Questions'], ['role', 'Role settings'], ['roles', 'All roles']].map(([id, t]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{t}</button>)}
        </div>
        <div className="actions"><button className="b ghost" onClick={logout}>Sign out</button></div>
      </header>
      {role && (
        <div className="linkbar">
          <span className="stat" style={{ background: roleStatus(role).c, color: '#fff' }}>{roleStatus(role).t}</span>
          <span className="hint">Public link for LinkedIn:</span>
          <code>{publicUrl}</code>
          <button className="b ghost sm" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => say('Link copied. Paste it into your LinkedIn post.'))}>Copy link</button>
          <a className="b ghost sm" href={`/c/${role.slug}`} target="_blank" rel="noopener">Open</a>
          {role.status !== 'open' && <span className="hint" style={{ color: '#b4532a' }}>Candidates cannot start until you set this role to Open in Role settings.</span>}
          {role.closesAt && <span className="hint">Closes {new Date(role.closesAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        </div>
      )}
      <div className={'status' + (status.err ? ' err' : '')}>{status.t}</div>

      {tab === 'candidates' && data && (
        <>
          <div className="savebar" style={{ justifyContent: 'flex-start' }}>
            <button className="b amber" onClick={() => load(roleId)}>Refresh</button>
            <button className="b teal" onClick={scoreAll} disabled={scoring || !data.ai}>{scoring ? 'Scoring…' : 'Score written answers with Claude'}</button>
            <button className="b" onClick={openReport} disabled={!ranked.length}>{nPicked ? `Compare report (${nPicked})` : 'Compare report (top 3)'}</button>
            <button className="b ghost" onClick={copyRanking} disabled={!ranked.length}>Copy ranking (CSV)</button>
            {!data.ai && <span className="hint">Add ANTHROPIC_API_KEY to switch on Claude scoring.</span>}
            {data.sheetId && <a className="hint" href={`https://docs.google.com/spreadsheets/d/${data.sheetId}/edit`} target="_blank" rel="noopener">Open the Google Sheet</a>}
          </div>
          <div className="kpis">
            <div className="kpi"><small>Candidates</small><b>{ranked.length}</b><i>started this challenge</i></div>
            <div className="kpi"><small>Completed</small><b>{done.length}</b><i>{ranked.length ? Math.round((100 * done.length) / ranked.length) : 0}% finished</i></div>
            <div className="kpi"><small>Average fit</small><b>{done.length ? avg + '%' : '–'}</b><i>completed only</i></div>
            <div className="kpi"><small>Strong fits</small><b>{done.filter((x) => x.fit >= data.role.bands.strong).length}</b><i>{data.role.bands.strong}% or more</i></div>
          </div>
          {podium.length > 0 && (
            <div className="podium">
              {podium.map((p, i) => { const b = band(p.fit, data.role.bands); return (
                <button key={p.sid} className={'pod' + (i === 0 ? ' first' : '')} onClick={() => setSel(p.sid)}>
                  <Ring p={p.fit} c={b.c} size={64} />
                  <div><div className="medal">{['Best match', 'Runner-up', 'Third'][i]}</div><div className="nm">{p.name}</div><span className="band" style={{ background: b.bg, color: b.fg }}>{b.t}</span> <span className="stat" style={{ background: statusOf(p.status).c, color: '#fff' }}>{statusOf(p.status).t}</span></div>
                </button>); })}
            </div>
          )}
          <div className="layout">
            <div className="panel">
              <h3>Ranking <span className="r">{nPicked ? `${nPicked} ticked for the report` : 'tick to add to a report'}</span></h3>
              <input type="text" placeholder="Search name, email or location" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 8 }} />
              <div className="filters">
                {[['all', 'All'], ['done', 'Completed'], ...STATUSES.map((x) => [x.id, x.t])].map(([id, t]) => <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{t}</button>)}
              </div>
              {!shown.length && <div className="empty">No candidates here yet. Share the public link to start collecting entries.</div>}
              {shown.map((c) => { const b = band(c.fit, data.role.bands); const rank = ranked.indexOf(c) + 1; return (
                <div key={c.sid} className="candwrap">
                  <input type="checkbox" className="pick" checked={!!picked[c.sid]} onChange={(e) => setPicked({ ...picked, [c.sid]: e.target.checked })} title="Add to compare report" />
                  <button className={'cand' + (sel === c.sid ? ' on' : '')} onClick={() => { setSel(c.sid); if (window.innerWidth < 1000) setTimeout(() => document.getElementById('detail')?.scrollIntoView({ behavior: 'smooth' }), 50); }}>
                    <RankHex n={rank} c={c.done ? b.c : '#efe6da'} />
                    <div style={{ minWidth: 0 }}>
                      <div className="nm">{c.name} <span className="band" style={{ background: b.bg, color: b.fg }}>{b.t}</span>{c.status !== 'new' && <> <span className="stat" style={{ background: statusOf(c.status).c, color: '#fff' }}>{statusOf(c.status).t}</span></>}</div>
                      <div className="em">{c.email}{c.loc ? ' · ' + c.loc : ''}</div>
                      <div className="flags">{c.flags.length ? c.flags.map((f, i) => <span key={i} className={'flag ' + f.c}>{f.t}</span>) : <span className="flag ok">clean run</span>}</div>
                    </div>
                    <Ring p={c.fit} c={b.c} />
                  </button>
                </div>); })}
              {ranked.length > 200 && <div className="hint" style={{ textAlign: 'center' }}>Showing the top 200. Use search or filters to find others.</div>}
            </div>
            <div className="panel" id="detail">
              {!s ? <div className="empty">Pick a candidate.</div> : (
                <Detail s={s} cmp={ranked.find((x) => x.sid === cmp && x.sid !== s.sid)} setCmp={setCmp} others={ranked.filter((x) => x.sid !== s.sid)} questions={data.questions} settings={data.role} review={reviews[s.sid] || {}} updateReview={updateReview} say={say}
                  scoreOne={async () => { try { setScoring(true); say('Claude is scoring…'); const n = await scoreOne(s.sid, true); say(n ? 'Scored.' : 'No written answer to score.'); } catch (e) { say(e.message, true); } setScoring(false); }} canAI={data.ai} scoring={scoring} />
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'questions' && data && <QuestionEditor key={roleId} initial={data.questions} settings={data.role} roleId={roleId} onSaved={(qs) => { setData({ ...data, questions: qs }); say('Questions saved. Candidates see the changes straight away.'); }} say={say} />}
      {tab === 'role' && data && <RoleSettings key={roleId} role={data.role} onSaved={(r) => { setData({ ...data, role: r }); setRoles(roles.map((x) => (x.id === r.id ? { ...x, ...r } : x))); say('Role settings saved.'); }} say={say} />}
      {tab === 'roles' && <RolesPanel roles={roles} currentId={roleId} ai={data ? data.ai : false} onOpen={(id, t) => { setRoleId(id); setTab(t || 'candidates'); }} onCreated={async (r) => { await loadRoles(); setRoleId(r.id); setTab('questions'); setTimeout(() => say(`Created “${r.name}” as a draft. Review the questions, then set it to Open in Role settings.`), 1500); }} say={say} />}
    </div>
  );
}

function Detail({ s, cmp, setCmp, others, questions, settings, review, updateReview, scoreOne, canAI, scoring, say }) {
  const b = band(s.fit, settings.bands);
  const sets = [];
  if (cmp) sets.push({ s: cmp, c: C.blue, o: 0.12 });
  sets.push({ s, c: b.c === '#a99c8f' ? C.clay : C.amber, o: 0.38 });
  const qs = questions.filter((q) => q.enabled || s.cells[q.id]);
  const written = qs.filter((q) => q.type === 'written' || q.type === 'link');
  const [notes, setNotes] = useState(review.notes || '');
  useEffect(() => { setNotes(review.notes || ''); }, [s.sid]); // eslint-disable-line
  const setW = (qid, patch) => updateReview(s.sid, { written: { ...(review.written || {}), [qid]: { ...((review.written || {})[qid] || {}), ...patch } } });
  return (
    <>
      <div className="dhead">
        <Ring p={s.fit} c={b.c} size={80} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2>{s.name}</h2>
          <div className="meta">{s.email}{s.loc ? ' · ' + s.loc : ''} · {s.answered}/{s.totalQ} cells · {fmtT(s.total)} total · ref {s.sid}</div>
          <div style={{ marginTop: 6 }}><span className="band" style={{ background: b.bg, color: b.fg }}>{b.t}</span> {!s.done && <span className="flag">did not finish</span>}</div>
          <div className="statusbar">
            {STATUSES.map((st) => <button key={st.id} className={s.status === st.id ? 'on' : ''} style={s.status === st.id ? { background: st.c } : null} onClick={() => updateReview(s.sid, { status: st.id })}>{st.t}</button>)}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="b ghost sm" onClick={() => {
              if (!settings.bookingLink) { say('Add a booking link in Role settings first.', true); return; }
              const msg = (settings.inviteMessage || '{link}').replace(/\{first\}/g, s.name.split(' ')[0]).replace(/\{role\}/g, settings.name).replace(/\{link\}/g, settings.bookingLink);
              navigator.clipboard.writeText(msg).then(() => { say(`Interview invite for ${s.name} copied. Paste it into an email to ${s.email}.`); if (s.status === 'new' || s.status === 'shortlist') updateReview(s.sid, { status: 'interview' }); }, () => say('Could not copy.', true));
            }}>Copy interview invite</button>
            <button className="b ghost sm" onClick={() => navigator.clipboard.writeText(s.email).then(() => say('Email copied.'))}>Copy email</button>
            {s.cv ? <a className="b sm" href={`/api/admin/file?id=${encodeURIComponent(s.cv.id)}`}>Download CV</a> : <span className="flag">no CV</span>}
            {s.linkedin && <a className="b ghost sm" href={s.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
            {s.portfolio && <a className="b ghost sm" href={s.portfolio} target="_blank" rel="noopener noreferrer">Portfolio</a>}
          </div>
        </div>
      </div>
      <div className="dgrid">
        <div className="radar">
          <Radar sets={sets} pillars={settings.pillars} />
          <div className="legend"><span><i style={{ background: sets[sets.length - 1].c }} />{s.name.split(' ')[0]}</span>{cmp && <span><i style={{ background: C.blue, opacity: 0.6 }} />{cmp.name.split(' ')[0]}</span>}</div>
          <div className="compare">Compare with <select value={cmp ? cmp.sid : ''} onChange={(e) => setCmp(e.target.value)}><option value="">nobody</option>{others.map((x) => <option key={x.sid} value={x.sid}>{x.name}</option>)}</select></div>
        </div>
        <div>
          {settings.pillars.map((p) => { const v = s.pl[p.id]; const pc = v == null ? null : Math.round(v * 100); const cv = cmp && cmp.pl[p.id] != null ? Math.round(cmp.pl[p.id] * 100) : null; return (
            <div className="pill" key={p.id}>
              <div className="row"><span>{p.name}{Number(p.weight ?? 1) !== 1 && <span className="tag">×{p.weight}</span>}</span><b>{pc == null ? '–' : pc + '%'}{cv != null && <span style={{ color: C.blue, fontWeight: 500 }}> vs {cv}%</span>}</b></div>
              <div className="bar"><i style={{ width: (pc || 0) + '%', background: band(pc || 0, settings.bands).c }} />{cv != null && <i style={{ width: cv + '%', background: 'none', borderRight: `3px solid ${C.blue}`, borderRadius: 0 }} />}</div>
            </div>); })}
        </div>
      </div>
      <div className="sec"><h4>Integrity</h4>
        <div className="int">
          <div className={s.tabs > 2 ? 'bad' : ''}><b>{s.tabs}</b><small>times left the page</small></div>
          <div className={s.paste ? 'bad' : ''}><b>{s.paste}</b><small>paste attempts</small></div>
          <div className={s.copy > 1 ? 'bad' : ''}><b>{s.copy}</b><small>copy attempts</small></div>
          <div><b>{qs.filter((q) => s.cells[q.id] && s.cells[q.id].a.timed_out).length}</b><small>cells timed out</small></div>
        </div>
      </div>
      <div className="sec"><h4>Cell by cell</h4>
        <table className="cells"><thead><tr><th>Cell</th><th>Score</th><th>Time</th></tr></thead><tbody>
          {qs.map((q) => { const c = s.cells[q.id]; const v = s.sc[q.id]; const pc = v == null ? null : Math.round(v * 100); return (
            <tr key={q.id}>
              <td><b>{q.title}</b><span className="tag">{(settings.pillars.find((p) => p.id === q.pillar) || {}).name || 'No area'}</span>{c && c.a.timed_out && <span className="tag">timed out</span>}<div className="what">{explain(q, c && c.a, review)}</div></td>
              <td className="sc">{pc == null ? <span style={{ color: '#6f655d' }}>{(q.type === 'written' || q.type === 'link') && c ? 'needs scoring' : '–'}</span> : <><div style={{ fontSize: 12.5, fontWeight: 600 }}>{pc}%</div><div className="bar"><i style={{ width: pc + '%', background: band(pc, settings.bands).c }} /></div></>}</td>
              <td className="t">{c ? fmtT(c.sec) + ' / ' + fmtT(q.limit) : '–'}</td>
            </tr>); })}
        </tbody></table>
      </div>
      {written.map((q) => { const w = s.cells[q.id] && s.cells[q.id].a; const rv = (review.written || {})[q.id] || {}; return (
        <div className="sec" key={q.id}><h4>{q.type === 'link' ? q.title + ', what they made' : q.title + ', in their words'}</h4>
          {q.type === 'link'
            ? (w && w.url ? <div className="written"><a href={w.url} target="_blank" rel="noopener noreferrer">{w.url}</a>{w.note ? `\n${w.note}` : ''}</div> : <div className="written" style={{ color: '#6f655d' }}>No link submitted.</div>)
            : (w && w.text ? <div className="written">{w.text}</div> : <div className="written" style={{ color: '#6f655d' }}>No written answer.</div>)}
          {q.type === 'link' && q.rubric && <div className="help" style={{ marginTop: 6 }}>{q.rubric}</div>}
          {rv.ai && <div className="ai"><b>{rv.ai}/5</b><div><div style={{ fontSize: 13.5 }}>{rv.reason}</div><div style={{ fontSize: 12, color: '#6f655d', marginTop: 3 }}>Claude’s score · chance it was AI-written: {rv.likelihood || 'unknown'}</div></div></div>}
          {w && (w.text || w.url) && (
            <div className="overr">Your score:
              {[1, 2, 3, 4, 5].map((k) => <button key={k} className={rv.manual === k ? 'on' : ''} onClick={() => setW(q.id, { manual: rv.manual === k ? null : k })}>{k}</button>)}
              <span style={{ color: '#6f655d' }}>{rv.manual ? 'Overrides Claude. Tap again to clear.' : 'Optional, overrides Claude'}</span>
              {canAI && q.type === 'written' && <button className="b ghost sm" style={{ width: 'auto', height: 'auto' }} onClick={scoreOne} disabled={scoring}>{rv.ai ? 'Re-score with Claude' : 'Score with Claude'}</button>}
            </div>
          )}
        </div>); })}
      <div className="sec"><h4>Your notes</h4>
        <textarea value={notes} placeholder="Interview notes, references, next steps" onChange={(e) => { setNotes(e.target.value); updateReview(s.sid, { notes: e.target.value }, false); }} />
      </div>
    </>
  );
}


function RoleSettings({ role, onSaved, say }) {
  const [st, setSt] = useState(JSON.parse(JSON.stringify(role)));
  const [saving, setSaving] = useState(false);
  const set = (fn) => setSt((p) => { const n = JSON.parse(JSON.stringify(p)); fn(n); return n; });
  async function save() {
    setSaving(true);
    const r = await fetch('/api/admin/roles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: st }) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok) onSaved(st); else say(j.error || 'Could not save.', true);
  }
  return (
    <div className="layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="panel">
        <h3>Role and link</h3>
        <label className="f"><span>Role name (shown to candidates)</span><input type="text" value={st.name} onChange={(e) => set((n) => { n.name = e.target.value; })} /></label>
        <label className="f"><span>Link name: /c/{st.slug}</span><input type="text" value={st.slug} onChange={(e) => set((n) => { n.slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'); })} /></label>
        <div className="frow" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="f"><span>Status</span><select value={st.status} onChange={(e) => set((n) => { n.status = e.target.value; })}><option value="draft">Draft (link does not work)</option><option value="open">Open (taking entries)</option><option value="closed">Closed</option></select></label>
          <label className="f"><span>Closing date (optional)</span><input type="date" value={st.closesAt || ''} onChange={(e) => set((n) => { n.closesAt = e.target.value; })} /></label>
        </div>
        <label className="f"><span>Interview booking link (e.g. the CEO&apos;s Motion link)</span><input type="text" value={st.bookingLink || ''} placeholder="https://" onChange={(e) => set((n) => { n.bookingLink = e.target.value; })} /></label>
        <label className="f"><span>Interview invite message. Use {'{first}'}, {'{role}'} and {'{link}'}</span><textarea rows={6} value={st.inviteMessage || ''} onChange={(e) => set((n) => { n.inviteMessage = e.target.value; })} /></label>
        <label className="f"><span>Role description (helps Claude score written answers)</span><textarea rows={3} value={st.description || ''} onChange={(e) => set((n) => { n.description = e.target.value; })} /></label>
      </div>
      <div className="panel">
        <h3>Welcome screen</h3>
        <label className="f"><span>Heading</span><input type="text" value={st.intro.title} onChange={(e) => set((n) => { n.intro.title = e.target.value; })} /></label>
        <label className="f"><span>Intro text</span><textarea rows={4} value={st.intro.text} onChange={(e) => set((n) => { n.intro.text = e.target.value; })} /></label>
        <div className="sec"><h4>Culture areas and weights</h4>
          <p className="help">Each question belongs to one area. The overall fit is the weighted average of the areas. Weight 0 ignores an area.</p>
          <div className="list">
            {st.pillars.map((p, i) => (
              <div className="li" key={p.id} style={{ gridTemplateColumns: '24px 1fr 80px auto' }}>
                <div className="ix">{i + 1}</div>
                <input type="text" value={p.name} onChange={(e) => set((n) => { n.pillars[i].name = e.target.value; })} />
                <input type="number" step="0.5" min="0" max="5" value={p.weight ?? 1} onChange={(e) => set((n) => { n.pillars[i].weight = Number(e.target.value); })} title="Weight" />
                <div className="ctrl"><button onClick={() => set((n) => { n.pillars.splice(i, 1); })} disabled={st.pillars.length <= 3} title="Remove">✕</button></div>
              </div>))}
          </div>
          <button className="b ghost sm" onClick={() => set((n) => { n.pillars.push({ id: 'p' + Date.now().toString(36), name: 'New area', weight: 1 }); })}>Add an area</button>
        </div>
        <div className="sec"><h4>Fit bands</h4>
          <div className="frow" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <label className="f"><span>Strong fit from %</span><input type="number" value={st.bands.strong} onChange={(e) => set((n) => { n.bands.strong = Number(e.target.value); })} /></label>
            <label className="f"><span>Promising from %</span><input type="number" value={st.bands.promising} onChange={(e) => set((n) => { n.bands.promising = Number(e.target.value); })} /></label>
            <label className="f"><span>Mixed from %</span><input type="number" value={st.bands.mixed} onChange={(e) => set((n) => { n.bands.mixed = Number(e.target.value); })} /></label>
          </div>
        </div>
        <div className="savebar"><button className="b amber" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save role settings'}</button></div>
      </div>
    </div>
  );
}

function RolesPanel({ roles, currentId, ai, onOpen, onCreated, say }) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('claude');
  const [copyFrom, setCopyFrom] = useState(currentId || '');
  const [jd, setJd] = useState('');
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState(12);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [keep, setKeep] = useState({});
  const [preview, setPreview] = useState(null);
  const st = (r) => (r.status === 'open' ? { t: 'Open', c: C.teal } : r.status === 'closed' ? { t: 'Closed', c: C.clay } : { t: 'Draft', c: '#a99c8f' });

  async function generate() {
    if (!name.trim()) { say('Give the role a name first.', true); return; }
    setBusy(true); setDraft(null); say('Claude is drafting the challenge. This can take up to a minute…');
    try {
      const r = await fetch('/api/admin/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, jobDescription: jd, notes, count }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Generation failed');
      setDraft(j.draft); setKeep(Object.fromEntries(j.draft.questions.map((q) => [q.id, true])));
      say(`Claude drafted ${j.draft.questions.length} questions. Review them, untick any you do not want, then create the role.`);
    } catch (e) { say(e.message, true); }
    setBusy(false);
  }
  async function create() {
    if (!name.trim()) { say('Give the role a name first.', true); return; }
    setBusy(true);
    const body = { name: name.trim(), from: from === 'claude' ? 'draft' : from, copyFrom };
    if (from === 'claude') body.draft = { ...draft, questions: draft.questions.filter((q) => keep[q.id]) };
    const r = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { say(j.error || 'Could not create the role.', true); return; }
    setDraft(null); setName(''); setJd(''); setNotes('');
    onCreated(j.role);
  }
  const pname = (id) => ((draft && draft.role.pillars.find((p) => p.id === id)) || {}).name || id;

  return (
    <div className="layout" style={{ gridTemplateColumns: '1fr 1.3fr' }}>
      <div className="panel">
        <h3>Roles <span className="r">{roles.length}</span></h3>
        {roles.map((r) => (
          <div key={r.id} className={'rolecard' + (r.id === currentId ? ' on' : '')}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm">{r.name} <span className="stat" style={{ background: st(r).c, color: '#fff' }}>{st(r).t}</span></div>
              <div className="em">/c/{r.slug} · {r.started || 0} started · {r.completed || 0} completed{r.closesAt ? ' · closes ' + r.closesAt : ''}</div>
            </div>
            <button className="b ghost sm" onClick={() => onOpen(r.id, 'candidates')}>Candidates</button>
            <button className="b ghost sm" onClick={() => onOpen(r.id, 'questions')}>Questions</button>
            <button className="b ghost sm" onClick={() => onOpen(r.id, 'role')}>Settings</button>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>Create a challenge for a new role</h3>
        <label className="f"><span>Role name</span><input type="text" value={name} placeholder="e.g. Partnerships Manager" onChange={(e) => setName(e.target.value)} /></label>
        <div className="filters" style={{ marginBottom: 12 }}>
          {[['claude', 'Draft with Claude from a job description'], ['copy', 'Copy an existing role'], ['blank', 'Start blank']].map(([id, t]) => <button key={id} className={from === id ? 'on' : ''} onClick={() => { setFrom(id); setDraft(null); }}>{t}</button>)}
        </div>
        {from === 'copy' && <label className="f"><span>Copy questions and settings from</span><select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
        {from === 'claude' && (<>
          {!ai && <div className="flag bad" style={{ display: 'block', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>Add ANTHROPIC_API_KEY in Vercel to use this.</div>}
          <label className="f"><span>Job description</span><textarea rows={8} value={jd} placeholder="Paste the job description or a list of responsibilities and must-haves" onChange={(e) => setJd(e.target.value)} /></label>
          <div className="frow" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <label className="f"><span>Number of questions</span><input type="number" min="6" max="16" value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
            <label className="f"><span>Anything to focus on (optional)</span><input type="text" value={notes} placeholder="e.g. strong on Pipedrive, writing for funders" onChange={(e) => setNotes(e.target.value)} /></label>
          </div>
          <div className="savebar" style={{ justifyContent: 'flex-start' }}><button className="b teal" onClick={generate} disabled={busy || !ai}>{busy ? 'Drafting…' : draft ? 'Draft again' : 'Draft the challenge'}</button></div>
          {draft && (
            <div className="sec">
              <h4>Claude&apos;s draft: {draft.questions.filter((q) => keep[q.id]).length} of {draft.questions.length} questions kept</h4>
              <p className="help">Culture areas: {draft.role.pillars.map((p) => p.name).join(', ')}. You can edit everything after creating the role.</p>
              {draft.questions.map((q) => (
                <div key={q.id} className="li" style={{ gridTemplateColumns: '24px 1fr auto', marginBottom: 6 }}>
                  <input type="checkbox" checked={!!keep[q.id]} onChange={(e) => setKeep({ ...keep, [q.id]: e.target.checked })} style={{ marginTop: 6 }} />
                  <div><b style={{ fontSize: 14 }}>{q.title}</b> <span className="tag">{QTYPES[q.type] || q.type}</span><span className="tag">{pname(q.pillar)}</span><div className="help" style={{ margin: '2px 0 0' }}>{q.lead}</div></div>
                  <div className="ctrl"><button onClick={() => setPreview([publicQuestion(q)])}>Preview</button></div>
                </div>
              ))}
            </div>
          )}
        </>)}
        <div className="savebar"><button className="b amber" onClick={create} disabled={busy || !name.trim() || (from === 'claude' && !draft)}>Create role as draft</button></div>
      </div>
      {preview && (
        <div className="pv-wrap" onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
          <div className="pv"><button className="b sm pv-close" onClick={() => setPreview(null)}>Close preview</button><Challenge questions={preview} preview /></div>
        </div>
      )}
    </div>
  );
}
export { Radar, Ring };
