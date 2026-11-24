'use client';
import { useMemo, useState } from 'react';
import { QUESTION_TYPES, QUESTION_LIBRARY } from '@/lib/defaults';
import { publicQuestion } from '@/lib/public';
import Challenge from './Challenge';

const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 8);
const clone = (o) => JSON.parse(JSON.stringify(o));
const LOGO_VISUALS = { white: 'Logo on white', amber: 'Logo on Amber', ivory: 'Logo on Soft Ivory', dark: 'White logo on Rich Black', stretch: 'Stretched logo', border: 'Clay Orange border', fx: 'Drop shadow and glow', recolour: 'Recoloured (purple)', crop: 'Cropped logo', rotate: 'Rotated logo' };
const FLAG_DISPLAYS = { list: 'Option list (with optional notes panel)', chips: 'Dark slide with chips (with notes panel)', code: 'Code / prompt lines', tiles: 'Logo tiles', table: 'CRM rows (separate columns with ·)' };

function template(type) {
  const base = { id: uid('q_'), type, enabled: false, isNew: true, tag: 'New', pillar: 'p1', weight: 1, limit: 90, title: 'New question', lead: '' };
  switch (type) {
    case 'rank': return { ...base, items: [{ id: uid(), t: 'First thing', s: '' }, { id: uid(), t: 'Second thing', s: '' }, { id: uid(), t: 'Third thing', s: '' }] };
    case 'flag': return { ...base, display: 'list', items: [{ id: uid(), t: 'Item to flag', correct: true }, { id: uid(), t: 'Item that is fine', correct: false }] };
    case 'binary': return { ...base, style: 'list', labels: [{ id: 'a', t: 'Option A' }, { id: 'b', t: 'Option B' }], items: [{ id: uid(), t: 'Card one', s: '', correct: 'a' }, { id: uid(), t: 'Card two', s: '', correct: 'b' }] };
    case 'steps': return { ...base, steps: [{ q: 'What do you do?', options: [{ id: 'a', t: 'Best answer', points: 5 }, { id: 'b', t: 'Okay answer', points: 2 }, { id: 'c', t: 'Poor answer', points: 0 }] }] };
    case 'matrix': return { ...base, cols: ['Tool A', 'Tool B', 'Tool C'], rows: [{ id: uid(), t: 'Job one', correct: 'Tool A' }, { id: uid(), t: 'Job two', correct: 'Tool B' }] };
    case 'pattern': return { ...base, puzzles: [] };
    case 'written': return { ...base, limit: 240, minWords: 25, maxWords: 150, rubric: '5 = excellent\n3 = adequate\n1 = poor' };
    case 'link': return { ...base, limit: 900, linkLabel: 'Share link', rubric: '5 = excellent\n3 = adequate\n1 = poor' };
    default: return base;
  }
}

export default function QuestionEditor({ initial, settings, roleId, onSaved, say }) {
  const [qs, setQs] = useState(clone(initial));
  const [sel, setSel] = useState(initial[0] ? initial[0].id : null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [addType, setAddType] = useState('steps');
  const [json, setJson] = useState(false);
  const [lib, setLib] = useState(false);
  const idx = qs.findIndex((q) => q.id === sel);
  const q = qs[idx];

  const mut = (fn) => { setQs((prev) => { const n = clone(prev); fn(n); return n; }); setDirty(true); };
  const upd = (fn) => mut((n) => { const i = n.findIndex((x) => x.id === sel); if (i > -1) fn(n[i]); });
  const move = (i, d) => mut((n) => { const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; });

  async function save() {
    setSaving(true);
    const r = await fetch('/api/admin/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleId, questions: qs }) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok) { setDirty(false); onSaved(qs); } else say(j.error || 'Could not save questions.', true);
  }
  const enabled = qs.filter((x) => x.enabled);
  const mins = Math.round(enabled.reduce((t, x) => t + (Number(x.limit) || 0), 0) / 60);
  const warnings = useMemo(() => (q ? validate(q) : []), [q]);

  return (
    <div className="qed">
      <div className="panel sticky">
        <h3>Question bank <span className="r">{enabled.length} live · up to {mins} min</span></h3>
        <p className="help">Order here is the order candidates see. Switch questions on or off without deleting them.</p>
        {qs.map((x, i) => (
          <div key={x.id} className={'qitem' + (x.id === sel ? ' on' : '') + (x.enabled ? '' : ' off')} onClick={() => { setSel(x.id); setJson(false); }}>
            <div className="mv" onClick={(e) => e.stopPropagation()}><button onClick={() => move(i, -1)} title="Move up">▲</button><button onClick={() => move(i, 1)} title="Move down">▼</button></div>
            <div style={{ minWidth: 0 }}>
              <div className="qt">{i + 1}. {x.title}{x.isNew && <span className="tag new">new</span>}</div>
              <div className="qs">{QUESTION_TYPES[x.type]} · {(settings.pillars.find((p) => p.id === x.pillar) || {}).name || 'No area'} · {x.limit}s</div>
            </div>
            <button className={'switch' + (x.enabled ? ' on' : '')} title={x.enabled ? 'Live' : 'Off'} onClick={(e) => { e.stopPropagation(); mut((n) => { n[i].enabled = !n[i].enabled; }); }} />
          </div>
        ))}
        <div className="sec" style={{ marginTop: 14 }}>
          <h4>Add a question</h4>
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={addType} onChange={(e) => setAddType(e.target.value)}>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button className="b sm" onClick={() => { const t = template(addType); mut((n) => { n.push(t); }); setSel(t.id); }}>Add</button>
          </div>
        </div>
        <div className="sec" style={{ marginTop: 14 }}>
          <button className="b teal sm" onClick={() => setLib(!lib)}>{lib ? 'Hide the library' : 'Add from library'}</button>
          {lib && (() => {
            const have = new Set(qs.map((x) => x.id.replace(/-[a-z0-9]{4}$/, '')));
            const avail = QUESTION_LIBRARY.filter((x) => !have.has(x.id));
            return (<div style={{ marginTop: 8 }}>
              {!avail.length && <p className="help">Every library question is already in this role.</p>}
              {avail.map((x) => (
                <div key={x.id} className="qitem" style={{ gridTemplateColumns: '1fr auto', cursor: 'default' }}>
                  <div style={{ minWidth: 0 }}><div className="qt">{x.title}{x.id.startsWith('k') && <span className="tag new">content</span>}</div><div className="qs">{QUESTION_TYPES[x.type]} · {x.limit}s</div></div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="b ghost sm" onClick={() => setPreview([publicQuestion(x)])}>Preview</button>
                    <button className="b sm" onClick={() => { const c = clone(x); c.enabled = true; c.isNew = true; if (!settings.pillars.some((p) => p.id === c.pillar)) c.pillar = settings.pillars[settings.pillars.length - 1].id; mut((n) => { n.push(c); }); setSel(c.id); say(`Added “${c.title}”. Click Save all changes to put it live.`); }}>Add</button>
                  </div>
                </div>))}
            </div>);
          })()}
        </div>
        <div className="sec" style={{ marginTop: 14 }}>
          <button className="b ghost sm" disabled={!enabled.length} onClick={() => setPreview(enabled.map(publicQuestion))}>Preview the whole challenge</button>
        </div>
      </div>

      <div className="panel">
        <div className="savebar">
          {dirty && <span className="dirty">Unsaved changes</span>}
          {q && <button className="b ghost sm" onClick={() => setPreview([publicQuestion(q)])}>Preview this question</button>}
          {q && <button className="b ghost sm" onClick={() => { const c = clone(q); c.id = uid('q_'); c.title += ' (copy)'; c.enabled = false; mut((n) => { n.splice(idx + 1, 0, c); }); setSel(c.id); }}>Duplicate</button>}
          {q && <button className="b danger sm" onClick={() => { if (confirmDelete(q)) { mut((n) => { n.splice(idx, 1); }); setSel(qs[idx + 1] ? qs[idx + 1].id : qs[idx - 1] ? qs[idx - 1].id : null); } }}>Delete</button>}
          <button className="b amber" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save all changes'}</button>
        </div>
        {!q ? <div className="empty">Pick or add a question.</div> : (
          <>
            <div className="frow">
              <label className="f" style={{ gridColumn: 'span 2' }}><span>Title</span><input type="text" value={q.title} onChange={(e) => upd((x) => { x.title = e.target.value; })} /></label>
              <label className="f"><span>Label shown to candidate</span><input type="text" value={q.tag || ''} onChange={(e) => upd((x) => { x.tag = e.target.value; })} /></label>
              <label className="f"><span>Status</span><button className={'switch' + (q.enabled ? ' on' : '')} onClick={() => upd((x) => { x.enabled = !x.enabled; })} /> <span style={{ fontSize: 13 }}>{q.enabled ? 'Live' : 'Off'}</span></label>
            </div>
            <div className="frow">
              <label className="f"><span>Culture area</span><select value={q.pillar} onChange={(e) => upd((x) => { x.pillar = e.target.value; })}>{settings.pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label className="f"><span>Weight in that area</span><input type="number" step="0.1" min="0" value={q.weight ?? 1} onChange={(e) => upd((x) => { x.weight = Number(e.target.value); })} /></label>
              <label className="f"><span>Timer (seconds)</span><input type="number" min="10" value={q.limit} onChange={(e) => upd((x) => { x.limit = Number(e.target.value); })} /></label>
              <label className="f"><span>Type</span><input type="text" value={QUESTION_TYPES[q.type]} disabled /></label>
            </div>
            <label className="f"><span>Instructions / scenario shown to the candidate</span><textarea rows={3} value={q.lead || ''} onChange={(e) => upd((x) => { x.lead = e.target.value; })} /></label>
            {warnings.length > 0 && <div className="flag bad" style={{ display: 'block', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12.5 }}>{warnings.join(' ')}</div>}
            <div className="sec" style={{ marginTop: 6 }}>
              <h4 style={{ display: 'flex', alignItems: 'center' }}>Content and answer key <button className="b ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setJson(!json)}>{json ? 'Back to the form' : 'Edit as JSON'}</button></h4>
              {json ? <JsonEdit q={q} onChange={(nq) => upd((x) => { Object.keys(x).forEach((k) => delete x[k]); Object.assign(x, nq, { id: q.id }); })} /> : <TypeEditor q={q} upd={upd} />}
            </div>
          </>
        )}
      </div>
      {preview && (
        <div className="pv-wrap" onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
          <div className="pv">
            <button className="b sm pv-close" onClick={() => setPreview(null)}>Close preview</button>
            <Challenge questions={preview} preview />
          </div>
        </div>
      )}
    </div>
  );
}

function confirmDelete(q) { return typeof window !== 'undefined' && window.confirm ? window.confirm(`Delete “${q.title}”? Old answers to it will no longer be scored.`) : true; }

function validate(q) {
  const w = [];
  if (q.type === 'flag' && !(q.items || []).some((i) => i.correct)) w.push('Tick at least one item that should be flagged.');
  if (q.type === 'steps') (q.steps || []).forEach((s, i) => { if (!s.options.some((o) => Number(o.points) > 0)) w.push(`Step ${i + 1} has no option with points.`); });
  if (q.type === 'matrix') (q.rows || []).forEach((r) => { if (!(q.cols || []).includes(r.correct)) w.push(`“${r.t}” has no correct column.`); });
  if (q.type === 'pattern' && !(q.puzzles || []).length) w.push('Pattern puzzles are edited as JSON. Copy a puzzle from “Hive logic” to start.');
  if ((q.type === 'rank' || q.type === 'binary' || q.type === 'flag') && (q.items || []).length < 2) w.push('Add at least two items.');
  return w;
}

function JsonEdit({ q, onChange }) {
  const [txt, setTxt] = useState(JSON.stringify(q, null, 2));
  const [err, setErr] = useState('');
  return (<div>
    <textarea style={{ minHeight: 380, fontFamily: 'ui-monospace,Menlo,Consolas,monospace', fontSize: 12.5 }} value={txt} onChange={(e) => { setTxt(e.target.value); try { const v = JSON.parse(e.target.value); setErr(''); onChange(v); } catch (x) { setErr('Not valid JSON yet: ' + x.message); } }} />
    {err && <div className="help" style={{ color: '#b4532a', marginTop: 6 }}>{err}</div>}
  </div>);
}

function ListEd({ items, onChange, render, add, label = 'Add' }) {
  const set = (fn) => { const n = clone(items); fn(n); onChange(n); };
  return (<>
    <div className="list">
      {items.map((it, i) => (
        <div className="li" key={it.id || i}>
          <div className="ix">{i + 1}</div>
          <div className="fields">{render(it, (fn) => set((n) => fn(n[i])), i)}</div>
          <div className="ctrl">
            <button onClick={() => set((n) => { if (i > 0) [n[i - 1], n[i]] = [n[i], n[i - 1]]; })} title="Up">▲</button>
            <button onClick={() => set((n) => { if (i < n.length - 1) [n[i + 1], n[i]] = [n[i], n[i + 1]]; })} title="Down">▼</button>
            <button onClick={() => set((n) => { n.splice(i, 1); })} title="Remove">✕</button>
          </div>
        </div>))}
    </div>
    <button className="b ghost sm" onClick={() => set((n) => { n.push(add()); })}>{label}</button>
  </>);
}
const T = ({ v, on, ph }) => <input type="text" value={v || ''} placeholder={ph} onChange={(e) => on(e.target.value)} />;

function TypeEditor({ q, upd }) {
  switch (q.type) {
    case 'rank':
      return (<>
        <p className="help">List the cards in the ideal order, best first. Candidates see them shuffled.</p>
        <label className="f" style={{ maxWidth: 360 }}><span>Scoring</span><select value={q.strictTop || 0} onChange={(e) => upd((x) => { x.strictTop = Number(e.target.value) || undefined; })}><option value={0}>Overall order (first pick counts extra)</option><option value={1}>Top 1 must be exact, rest loosely</option><option value={2}>Top 2 must be exact, rest loosely</option><option value={3}>Top 3 must be exact, rest loosely</option></select></label>
        <ListEd items={q.items} onChange={(v) => upd((x) => { x.items = v; })} add={() => ({ id: uid(), t: '', s: '' })} label="Add a card" render={(it, u) => (<><T v={it.t} ph="Card text" on={(v) => u((o) => { o.t = v; })} /><T v={it.s} ph="Detail line (optional)" on={(v) => u((o) => { o.s = v; })} /></>)} />
      </>);
    case 'flag':
      return (<>
        <div className="frow" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="f"><span>Display</span><select value={q.display || 'list'} onChange={(e) => upd((x) => { x.display = e.target.value; })}>{Object.entries(FLAG_DISPLAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          {q.display === 'chips' && <label className="f"><span>Slide title</span><input type="text" value={q.slideTitle || ''} onChange={(e) => upd((x) => { x.slideTitle = e.target.value; })} /></label>}
        </div>
        {(q.display === 'list' || q.display === 'chips' || !q.display) && (<>
          <label className="f"><span>Notes panel title (optional)</span><input type="text" value={(q.notes && q.notes.title) || ''} onChange={(e) => upd((x) => { x.notes = { ...(x.notes || { lines: [] }), title: e.target.value }; })} /></label>
          <label className="f"><span>Notes panel lines, one per line</span><textarea rows={4} value={((q.notes && q.notes.lines) || []).join('\n')} onChange={(e) => upd((x) => { x.notes = { ...(x.notes || {}), lines: e.target.value.split('\n') }; })} /></label>
        </>)}
        <p className="help">Tick the items a strong candidate should flag. Score is correct flags minus wrong flags.</p>
        <ListEd items={q.items} onChange={(v) => upd((x) => { x.items = v; })} add={() => ({ id: uid(), t: '', correct: false })} label="Add an item" render={(it, u) => (<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {q.display === 'tiles' ? <select value={it.visual || 'white'} onChange={(e) => u((o) => { o.visual = e.target.value; o.t = LOGO_VISUALS[e.target.value]; })}>{Object.entries(LOGO_VISUALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> : <T v={it.t} ph="Item text" on={(v) => u((o) => { o.t = v; })} />}
          <label className="chk"><input type="checkbox" checked={!!it.correct} onChange={(e) => u((o) => { o.correct = e.target.checked; })} />Should be flagged</label>
        </div>)} />
      </>);
    case 'binary':
      return (<>
        <div className="frow">
          <label className="f"><span>Style</span><select value={q.style || 'list'} onChange={(e) => upd((x) => { x.style = e.target.value; })}><option value="list">Cards with two buttons</option><option value="stack">Swipe stack, one at a time</option></select></label>
          <label className="f"><span>Left button</span><input type="text" value={q.labels[0].t} onChange={(e) => upd((x) => { x.labels[0].t = e.target.value; })} /></label>
          <label className="f"><span>Right button</span><input type="text" value={q.labels[1].t} onChange={(e) => upd((x) => { x.labels[1].t = e.target.value; })} /></label>
        </div>
        <ListEd items={q.items} onChange={(v) => upd((x) => { x.items = v; })} add={() => ({ id: uid(), t: '', s: '', correct: q.labels[0].id })} label="Add a card" render={(it, u) => (<>
          <div style={{ display: 'flex', gap: 8 }}><T v={it.t} ph={q.style === 'stack' ? 'Statement' : 'Heading'} on={(v) => u((o) => { o.t = v; })} />
            <select style={{ width: 210, flex: 'none' }} value={it.correct} onChange={(e) => u((o) => { o.correct = e.target.value; })} title="Right answer">{q.labels.map((l) => <option key={l.id} value={l.id}>✓ {l.t}</option>)}</select></div>
          {q.style !== 'stack' && <T v={it.s} ph="Detail (optional)" on={(v) => u((o) => { o.s = v; })} />}
        </>)} />
      </>);
    case 'steps':
      return (<>
        <label className="chk" style={{ marginBottom: 10 }}><input type="checkbox" checked={!!q.bubble} onChange={(e) => upd((x) => { x.bubble = e.target.checked ? { text: 'Message text', from: 'CEO, just now' } : undefined; })} />Show a chat message above the question</label>
        {q.bubble && <div className="frow" style={{ gridTemplateColumns: '2fr 1fr' }}><label className="f"><span>Message</span><input type="text" value={q.bubble.text} onChange={(e) => upd((x) => { x.bubble.text = e.target.value; })} /></label><label className="f"><span>From</span><input type="text" value={q.bubble.from} onChange={(e) => upd((x) => { x.bubble.from = e.target.value; })} /></label></div>}
        <p className="help">Give each option points (best answer highest). With more than one step, candidates go through them in turn.</p>
        {q.steps.map((st, si) => (
          <div className="stepbox" key={si}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}><T v={st.q} ph="Question" on={(v) => upd((x) => { x.steps[si].q = v; })} />{q.steps.length > 1 && <button className="b danger sm" onClick={() => upd((x) => { x.steps.splice(si, 1); })}>Remove step</button>}</div>
            <ListEd items={st.options} onChange={(v) => upd((x) => { x.steps[si].options = v; })} add={() => ({ id: uid('o'), t: '', points: 0 })} label="Add an option" render={(o, u) => (<div style={{ display: 'flex', gap: 8 }}><T v={o.t} ph="Option" on={(v) => u((z) => { z.t = v; })} /><input type="number" style={{ width: 80 }} value={o.points} onChange={(e) => u((z) => { z.points = Number(e.target.value); })} title="Points" /></div>)} />
          </div>))}
        <button className="b ghost sm" onClick={() => upd((x) => { x.steps.push({ q: '', options: [{ id: 'a', t: '', points: 5 }, { id: 'b', t: '', points: 0 }] }); })}>Add a step</button>
        <div className="sec">
          <label className="chk"><input type="checkbox" checked={!!q.slider} onChange={(e) => upd((x) => { x.slider = e.target.checked ? { label: 'How much?', left: 'A little', right: 'A lot', best: 20, weight: 0.3 } : undefined; })} />Add a slider</label>
          {q.slider && <div className="frow" style={{ marginTop: 8 }}>
            <label className="f" style={{ gridColumn: 'span 2' }}><span>Slider question</span><input type="text" value={q.slider.label} onChange={(e) => upd((x) => { x.slider.label = e.target.value; })} /></label>
            <label className="f"><span>Left end</span><input type="text" value={q.slider.left} onChange={(e) => upd((x) => { x.slider.left = e.target.value; })} /></label>
            <label className="f"><span>Right end</span><input type="text" value={q.slider.right} onChange={(e) => upd((x) => { x.slider.right = e.target.value; })} /></label>
            <label className="f"><span>Best at or below %</span><input type="number" value={q.slider.best} onChange={(e) => upd((x) => { x.slider.best = Number(e.target.value); })} /></label>
            <label className="f"><span>Slider share of score (0 to 1)</span><input type="number" step="0.1" min="0" max="1" value={q.slider.weight} onChange={(e) => upd((x) => { x.slider.weight = Number(e.target.value); })} /></label>
          </div>}
        </div>
      </>);
    case 'matrix':
      return (<>
        <label className="f"><span>Columns (choices), one per line</span><textarea rows={4} value={q.cols.join('\n')} onChange={(e) => upd((x) => { x.cols = e.target.value.split('\n'); })} /></label>
        <ListEd items={q.rows} onChange={(v) => upd((x) => { x.rows = v; })} add={() => ({ id: uid(), t: '', correct: q.cols[0] })} label="Add a row" render={(r, u) => (<div style={{ display: 'flex', gap: 8 }}><T v={r.t} ph="Row (job)" on={(v) => u((o) => { o.t = v; })} /><select style={{ width: 200 }} value={r.correct} onChange={(e) => u((o) => { o.correct = e.target.value; })}>{q.cols.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}</select></div>)} />
      </>);
    case 'pattern':
      return (<>
        <p className="help">Each puzzle has three steps and four picture options; mark one option with &quot;correct&quot;: true. Use &quot;Edit as JSON&quot; to change them. Cells are numbered 0 to 5 clockwise from top right.</p>
        {(q.puzzles || []).map((p, i) => (<div key={i} className="stepbox"><b style={{ fontSize: 13 }}>Puzzle {i + 1}</b><div className="pv-flowers">{p.seq.map((s, k) => <span key={k} dangerouslySetInnerHTML={{ __html: flowerSvg(s) }} />)}<span style={{ margin: '0 6px' }}>options:</span>{p.opts.map((o, k) => <span key={k} className={o.correct ? 'ok' : ''} dangerouslySetInnerHTML={{ __html: flowerSvg(o.s) }} />)}</div></div>))}
      </>);
    case 'written':
      return (<>
        <div className="frow" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="f"><span>Minimum words</span><input type="number" value={q.minWords} onChange={(e) => upd((x) => { x.minWords = Number(e.target.value); })} /></label>
          <label className="f"><span>Maximum words</span><input type="number" value={q.maxWords} onChange={(e) => upd((x) => { x.maxWords = Number(e.target.value); })} /></label>
        </div>
        <label className="f"><span>Scoring rubric for Claude (1 to 5)</span><textarea rows={6} value={q.rubric || ''} onChange={(e) => upd((x) => { x.rubric = e.target.value; })} /></label>
      </>);
    case 'link':
      return (<>
        <p className="help">Candidates paste a share link (for example Canva, Google Drive or a video) to something they make during the timer. They can leave the page for this cell only. You score it yourself in the candidate view.</p>
        <label className="f"><span>Label above the link box</span><input type="text" value={q.linkLabel || ''} onChange={(e) => upd((x) => { x.linkLabel = e.target.value; })} /></label>
        <label className="f"><span>How to score it (shown to you, not candidates)</span><textarea rows={4} value={q.rubric || ''} onChange={(e) => upd((x) => { x.rubric = e.target.value; })} /></label>
      </>);
    default:
      return <p className="help">Use &quot;Edit as JSON&quot; for this type.</p>;
  }
}

function hp(cx, cy, r) { const p = []; for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 90); p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); } return p.join(' '); }
function flowerSvg(state) {
  const r = 11, d = r * Math.sqrt(3), cx = 37, cy = 37;
  let s = `<svg viewBox="0 0 74 74"><polygon points="${hp(cx, cy, r - 0.8)}" fill="${state.c || '#fff'}" stroke="#25201D"/>`;
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (-60 + 60 * i); s += `<polygon points="${hp(cx + d * Math.cos(a), cy + d * Math.sin(a), r - 0.8)}" fill="${(state.f && state.f[i]) || '#fff'}" stroke="#25201D"/>`; }
  return s + '</svg>';
}
