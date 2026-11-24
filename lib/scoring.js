// Shared scoring. Runs in the admin browser. Every question scores 0 to 1.
const clamp = (x) => Math.max(0, Math.min(1, x));

export function writtenScore(review, qid) {
  const w = review && review.written && review.written[qid];
  if (!w) return null;
  const v = w.manual || w.ai;
  return v ? (v - 1) / 4 : null;
}

export function scoreQuestion(q, a, review) {
  if (!a || !q) return null;
  switch (q.type) {
    case 'rank': {
      const ideal = q.items.map((i) => i.id);
      const o = (a.order || []).filter((x) => ideal.includes(x));
      ideal.forEach((x) => { if (!o.includes(x)) o.push(x); });
      let agree = 0, tot = 0;
      for (let i = 0; i < ideal.length; i++) for (let j = i + 1; j < ideal.length; j++) { tot++; if (o.indexOf(ideal[i]) < o.indexOf(ideal[j])) agree++; }
      const loose = tot ? agree / tot : 0;
      const k = Number(q.strictTop) || 0;
      if (k > 0) {
        // the top k positions must be exactly right; the rest is scored loosely
        let hit = 0; for (let i = 0; i < k; i++) if (o[i] === ideal[i]) hit++;
        return clamp(0.6 * (hit / k) + 0.4 * loose);
      }
      const first = o[0] === ideal[0] ? 1 : o[1] === ideal[0] ? 0.4 : 0;
      return clamp(0.6 * loose + 0.4 * first);
    }
    case 'flag': {
      const key = q.items.filter((i) => i.correct).map((i) => i.id);
      const sel = a.flagged || [];
      const tp = sel.filter((x) => key.includes(x)).length, fp = sel.length - tp;
      return key.length ? clamp((tp - fp) / key.length) : (fp ? 0 : 1);
    }
    case 'binary': {
      const ch = a.choices || {};
      const n = q.items.length; if (!n) return null;
      return q.items.filter((i) => ch[i.id] === i.correct).length / n;
    }
    case 'steps': {
      const ch = a.choices || [];
      let got = 0, max = 0;
      q.steps.forEach((s, i) => {
        const m = Math.max(0, ...s.options.map((o) => Number(o.points) || 0));
        max += m;
        const o = s.options.find((x) => x.id === ch[i]);
        got += o ? Number(o.points) || 0 : 0;
      });
      let sc = max ? got / max : 0;
      if (q.slider && q.slider.weight) {
        const best = Number(q.slider.best) || 0;
        const v = a.scope_moved ? (a.scope <= best ? 1 : a.scope <= best * 2.5 ? 0.5 : 0) : 0;
        sc = (1 - q.slider.weight) * sc + q.slider.weight * v;
      }
      return clamp(sc);
    }
    case 'matrix': {
      const m = a.matches || {};
      if (!q.rows.length) return null;
      return q.rows.filter((r) => m[r.id] === r.correct).length / q.rows.length;
    }
    case 'pattern': {
      const ans = a.answers || [];
      if (!q.puzzles.length) return null;
      return q.puzzles.filter((p, i) => { const c = p.opts.find((o) => o.correct); return c && ans[i] === c.id; }).length / q.puzzles.length;
    }
    case 'written':
      return writtenScore(review, q.id);
    default:
      return null;
  }
}

const lbl = (list, id) => { const x = (list || []).find((i) => i.id === id); return x ? x.t : id; };

export function explain(q, a, review) {
  if (!a) return 'Not answered';
  const tm = a.timed_out ? ' (ran out of time)' : '';
  switch (q.type) {
    case 'rank':
      return 'Their order: ' + (a.order || []).map((x) => lbl(q.items, x)).join(' › ') + tm + '\nIdeal: ' + q.items.map((i) => i.t).join(' › ');
    case 'flag': {
      const sel = a.flagged || [], key = q.items.filter((i) => i.correct);
      const caught = key.filter((i) => sel.includes(i.id)).map((i) => i.t);
      const missed = key.filter((i) => !sel.includes(i.id)).map((i) => i.t);
      const wrong = q.items.filter((i) => !i.correct && sel.includes(i.id)).map((i) => i.t);
      return `Caught: ${caught.join(', ') || 'none'}\nMissed: ${missed.join(', ') || 'none'}\nWrongly flagged: ${wrong.join(', ') || 'none'}${tm}`;
    }
    case 'binary': {
      const ch = a.choices || {};
      const wrong = q.items.filter((i) => ch[i.id] !== i.correct).map((i) => `${i.t} (${ch[i.id] ? lbl(q.labels, ch[i.id]) : 'skipped'})`);
      return (wrong.length ? 'Got wrong: ' + wrong.join('; ') : 'All correct') + tm;
    }
    case 'steps': {
      const ch = a.choices || [];
      let s = q.steps.map((st, i) => { const o = st.options.find((x) => x.id === ch[i]); return `${q.steps.length > 1 ? i + 1 + '. ' : ''}${o ? o.t + ' (' + (o.points || 0) + ' pts)' : 'skipped'}`; }).join('\n');
      if (q.slider) s += `\nSlider: ${a.scope_moved ? a.scope + '%' : 'untouched'} (best ${q.slider.best}% or less)`;
      return s + tm;
    }
    case 'matrix': {
      const m = a.matches || {};
      const wrong = q.rows.filter((r) => m[r.id] !== r.correct).map((r) => `${r.t} → ${m[r.id] || 'none'} (should be ${r.correct})`);
      return (wrong.length ? 'Mismatched: ' + wrong.join('; ') : 'All matched') + tm;
    }
    case 'pattern': {
      const ans = a.answers || [];
      const n = q.puzzles.filter((p, i) => { const c = p.opts.find((o) => o.correct); return c && ans[i] === c.id; }).length;
      return `${n} of ${q.puzzles.length} puzzles correct${tm}`;
    }
    case 'written':
      return a.text ? `${a.text.split(/\s+/).length} words · ${a.keystrokes} keystrokes for ${a.chars} characters${tm}` : 'No answer' + tm;
    default:
      return '';
  }
}

export function band(p, bands) {
  const b = bands || { strong: 80, promising: 65, mixed: 50 };
  if (p >= b.strong) return { t: 'Strong fit', bg: '#d8f1ef', fg: '#17605b', c: '#2BA7A0' };
  if (p >= b.promising) return { t: 'Promising', bg: '#fff0d4', fg: '#7a5000', c: '#FCB040' };
  if (p >= b.mixed) return { t: 'Mixed', bg: '#fbe6dc', fg: '#8f4424', c: '#D77F5A' };
  return { t: 'Not a fit', bg: '#efe6da', fg: '#5d544d', c: '#a99c8f' };
}

// Group answer rows into candidates.
export function groupCandidates(rows) {
  const by = {};
  for (const r of rows) {
    const sid = r.session_id;
    if (!sid || sid === 'TEST-DUMMY') continue;
    let a;
    try { a = JSON.parse(r.answer_json || '{}'); } catch (e) { a = { _raw: r.answer_json }; }
    const s = by[sid] || (by[sid] = { sid, name: r.name, email: r.email, cells: {}, tabs: 0, paste: 0, copy: 0, first: r.timestamp, last: r.timestamp });
    s.name = r.name || s.name; s.email = r.email || s.email; s.last = r.timestamp;
    s.cells[r.challenge_id] = { a, sec: Number(r.seconds) || 0, ts: r.timestamp };
    s.tabs = Math.max(s.tabs, Number(r.tab_switches) || 0);
    s.paste = Math.max(s.paste, Number(r.paste_attempts) || 0);
    s.copy = Math.max(s.copy, Number(r.copy_attempts) || 0);
  }
  return Object.values(by);
}

export function computeCandidate(s, questions, settings, review) {
  review = review || {};
  const qs = questions.filter((q) => q.enabled || s.cells[q.id]);
  s.sc = {};
  qs.forEach((q) => { const c = s.cells[q.id]; s.sc[q.id] = c ? scoreQuestion(q, c.a, review) : null; });
  s.pl = {};
  let tw = 0, tot = 0;
  for (const p of settings.pillars) {
    let w = 0, v = 0;
    qs.filter((q) => q.pillar === p.id).forEach((q) => { const x = s.sc[q.id]; if (x != null) { const qw = Number(q.weight) || 1; w += qw; v += qw * x; } });
    s.pl[p.id] = w ? v / w : null;
    const pw = Number(p.weight ?? 1);
    if (w && pw > 0) { tw += pw; tot += pw * (v / w); }
  }
  s.fit = tw ? Math.round((100 * tot) / tw) : 0;
  s.done = !!s.cells.c_done;
  s.answered = qs.filter((q) => s.cells[q.id]).length;
  s.totalQ = qs.filter((q) => q.enabled).length;
  s.loc = (s.cells.c0_start && s.cells.c0_start.a.location) || '';
  s.total = (s.cells.c_done && s.cells.c_done.a.total_seconds) || Object.values(s.cells).reduce((t, c) => t + (c.sec || 0), 0);
  const fl = [];
  if (s.tabs) fl.push({ t: `${s.tabs} tab leave${s.tabs > 1 ? 's' : ''}`, c: s.tabs > 2 ? 'bad' : 'mid' });
  if (s.paste) fl.push({ t: `${s.paste} paste ${s.paste > 1 ? 'tries' : 'try'}`, c: 'bad' });
  if (s.copy) fl.push({ t: `${s.copy} copy ${s.copy > 1 ? 'tries' : 'try'}`, c: s.copy > 1 ? 'bad' : 'mid' });
  qs.filter((q) => q.type === 'written').forEach((q) => {
    const w = s.cells[q.id] && s.cells[q.id].a;
    if (w && w.text && w.chars > 0 && w.keystrokes < w.chars * 0.6) fl.push({ t: 'text not typed', c: 'bad' });
    const r = review.written && review.written[q.id];
    if (r && r.likelihood === 'high') fl.push({ t: 'written may be AI', c: 'bad' });
  });
  const fast = qs.filter((q) => ['rank', 'binary', 'matrix'].includes(q.type) && s.cells[q.id] && s.cells[q.id].sec < 15);
  if (fast.length) fl.push({ t: 'very fast answers', c: 'mid' });
  const to = qs.filter((q) => s.cells[q.id] && s.cells[q.id].a.timed_out).length;
  if (to) fl.push({ t: `${to} timed out`, c: 'mid' });
  if (!s.done) fl.push({ t: 'incomplete', c: 'mid' });
  s.flags = fl;
  s.status = review.status || 'new';
  return s;
}
