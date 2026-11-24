// Candidate challenge engine (browser only). Renders questions from data and saves each answer.
const C = { amber: '#FCB040', teal: '#2BA7A0', clay: '#D77F5A', ivory: '#FFF8F0', black: '#25201D', blue: '#1A2196', white: '#FFFFFF', line: '#eadfce' };

function h(tag, attrs, html) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k.slice(0, 2) === 'on') e[k] = attrs[k]; else e.setAttribute(k, attrs[k]); }
  if (html != null) e.innerHTML = html;
  return e;
}
export function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function hexPts(cx, cy, r) { const p = []; for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 90); p.push((cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2)); } return p.join(' '); }
function hexSvg(fill, stroke, label, w) { w = w || 30; return `<svg viewBox="0 0 30 34" width="${w}"><polygon points="${hexPts(15, 17, 15)}" fill="${fill}" stroke="${stroke || 'none'}" stroke-width="1.5"/>${label != null ? `<text x="15" y="22" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="14" fill="${C.black}">${label}</text>` : ''}</svg>`; }
export function flower(state, size) {
  size = size || 74; const r = 11, d = r * Math.sqrt(3), cx = 37, cy = 37;
  let s = `<svg viewBox="0 0 74 74" width="${size}"><polygon points="${hexPts(cx, cy, r - 0.8)}" fill="${state.c || C.white}" stroke="${C.black}" stroke-width="1"/>`;
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (-60 + 60 * i); const x = cx + d * Math.cos(a), y = cy + d * Math.sin(a); s += `<polygon points="${hexPts(x, y, r - 0.8)}" fill="${(state.f && state.f[i]) || C.white}" stroke="${C.black}" stroke-width="1"/>`; }
  return s + '</svg>';
}
export const LOGO_VISUALS = { white: 'Logo on white', amber: 'Logo on Amber', ivory: 'Logo on Soft Ivory', dark: 'White logo on Rich Black', stretch: 'Stretched logo', border: 'Clay Orange border', fx: 'Drop shadow and glow', recolour: 'Recoloured (purple)', crop: 'Cropped logo', rotate: 'Rotated logo' };
export function logoTile(v) {
  const bg = { amber: C.amber, ivory: C.ivory, dark: C.black }[v] || C.white;
  const src = v === 'dark' ? '/logo-white.png' : '/logo.png';
  const st = {
    stretch: 'transform:scale(1.45,0.6)', fx: 'filter:drop-shadow(4px 5px 3px rgba(0,0,0,.55)) drop-shadow(0 0 6px #ff00d4)',
    recolour: 'filter:hue-rotate(235deg) saturate(1.6)', rotate: 'transform:rotate(-14deg)', crop: 'transform:translateX(38%)',
  }[v] || '';
  const border = v === 'border' ? `outline:3px solid ${C.clay};outline-offset:8px;border-radius:6px;` : '';
  return `<div class="ltile" style="background:${bg}"><img src="${src}" alt="" style="${st};${border}" draggable="false"></div>`;
}

export function mount(root, opts) {
  const { questions, intro = {}, role = {}, preview = false, single = false } = opts;
  const CH = questions;
  const S = { sid: 'H' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(), name: preview ? 'Preview' : '', email: '', location: '', tabs: 0, pastes: 0, copies: 0, idx: -1, inChallenge: false, started: 0 };
  let TM = null, footEl = null;
  root.innerHTML = '';
  const app = h('div', { class: 'hive-app' }); root.appendChild(app);
  const toastHost = h('div'); root.appendChild(toastHost);

  function toast(t) { toastHost.innerHTML = ''; const e = h('div', { class: 'toast' }, esc(t)); toastHost.appendChild(e); setTimeout(() => e.remove(), 2200); }
  const onVis = () => { if (S.allowLeave) return; if (document.hidden && S.inChallenge) S.tabs++; else if (!document.hidden && S.inChallenge && S.tabs > 0) toast('Leaving the page is recorded'); };
  const onPaste = (e) => { if (S.inChallenge && !(e.target && e.target.closest && e.target.closest('[data-allowpaste]'))) { e.preventDefault(); S.pastes++; toast('Pasting is switched off in the hive'); } };
  const onDrop = (e) => { if (S.inChallenge) { e.preventDefault(); S.pastes++; } };
  const onCopy = (e) => { if (S.inChallenge) { e.preventDefault(); S.copies++; toast('Copying is switched off in the hive'); } };
  const onCtx = (e) => { if (S.inChallenge) e.preventDefault(); };
  if (!preview) {
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('drop', onDrop, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCopy, true);
    document.addEventListener('contextmenu', onCtx);
  }

  function save(cid, answer, seconds) {
    if (preview) return;
    const p = { role_id: role.id, session_id: S.sid, name: S.name, email: S.email, challenge_id: cid, answer, seconds, tab_switches: S.tabs, paste_attempts: S.pastes, copy_attempts: S.copies };
    let tries = 0;
    const go = () => fetch('/api/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p), keepalive: true })
      .then((r) => { if (!r.ok) throw new Error(r.status); })
      .catch(() => { tries++; if (tries < 5) setTimeout(go, 1500 * tries); else toast('Saving failed. Check your connection, then carry on.'); });
    go();
  }

  function stopTimer() { if (TM) clearInterval(TM.iv); TM = null; }
  function startTimer(limit, onEnd) { stopTimer(); TM = { t0: Date.now(), limit, onEnd, iv: setInterval(tick, 250) }; tick(); }
  function tick() {
    if (!TM) return; const el = (Date.now() - TM.t0) / 1000, left = Math.max(0, TM.limit - el);
    const wrap = app.querySelector('.timer');
    if (wrap) { const c = wrap.querySelector('circle.fg'); const L = 2 * Math.PI * 22; c.setAttribute('stroke-dasharray', L); c.setAttribute('stroke-dashoffset', L * (1 - left / TM.limit)); wrap.querySelector('span').textContent = Math.ceil(left); wrap.classList.toggle('low', left <= 10); c.setAttribute('stroke', left <= 10 ? C.clay : C.amber); }
    if (left <= 0) { const f = TM.onEnd; stopTimer(); f(true); }
  }

  function topBar(withTimer) {
    let prog = '';
    if (S.idx >= 0 && CH.length > 1) for (let i = 0; i < CH.length; i++) { const st = i < S.idx ? C.amber : i === S.idx ? C.white : '#efe6da'; prog += hexSvg(st, i === S.idx ? C.amber : 'none', null, 15); }
    return `${preview ? '<div class="banner">Preview. Answers are not saved.</div>' : ''}<div class="top"><img class="logo" src="/logo.png" alt="OneHive"><div class="prog">${prog}</div>${withTimer ? `<div class="timer"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="#efe6da" stroke-width="5"/><circle class="fg" cx="26" cy="26" r="22" fill="none" stroke="${C.amber}" stroke-width="5" stroke-linecap="round"/></svg><span></span></div>` : '<div style="width:52px"></div>'}</div>`;
  }
  function clearFoot() { if (footEl) { footEl.remove(); footEl = null; } }

  function introScreen() {
    S.inChallenge = false;
    app.innerHTML = topBar(false);
    const card = h('div', { class: 'card hero' });
    const mins = Math.max(5, Math.round(CH.reduce((t, q) => t + (Number(q.limit) || 60), 0) / 60 * 0.75));
    card.innerHTML = `<img class="squiggle" src="/squiggle.png" alt=""><div class="hero-in"><span class="kicker">${esc(role.name || 'Culture fit challenge')}</span><h1>${esc(intro.title || 'Welcome to the hive.')}</h1><p class="lead">${esc(intro.text || '')}</p></div>
      <label class="field"><span>Full name</span><input id="nm" autocomplete="name"></label><label class="field"><span>Email</span><input id="em" type="email" autocomplete="email"></label><label class="field"><span>Where are you based?</span><input id="lc" placeholder="Town, country"></label>
      <ul class="rules">${[`${CH.length} cells, about ${mins} minutes in total. Each cell has its own timer.`, 'Your answers save automatically after each cell. You cannot go back.', 'Copy, paste and leaving the page are switched off or recorded. We want to see you, not a tool.', 'Best on a phone or laptop with a steady connection. Find a quiet spot first.'].map((t) => `<li>${hexSvg(C.amber, null, null, 16)}<span>${t}</span></li>`).join('')}</ul>`;
    app.appendChild(card);
    footEl = h('div', { class: 'foot' }, '<div class="in"><span class="hint">Timer starts on the first cell</span></div>');
    const go = h('button', { class: 'btn amber' }, 'Enter the hive'); footEl.firstChild.appendChild(go); root.appendChild(footEl);
    go.onclick = () => {
      const n = card.querySelector('#nm').value.trim(), e = card.querySelector('#em').value.trim(), l = card.querySelector('#lc').value.trim();
      if (n.length < 2) { toast('Add your full name'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast('Add a valid email'); return; }
      go.disabled = true; go.textContent = 'Checking\u2026';
      fetch('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role_id: role.id, email: e }) })
        .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
        .then(({ ok, j }) => {
          if (!ok) { toast(j.error || 'You cannot start this challenge.'); go.disabled = false; go.textContent = 'Enter the hive'; return; }
          S.name = n; S.email = e; S.location = l; clearFoot();
          save('c0_start', { location: l, screen: screen.width + 'x' + screen.height, ua: navigator.userAgent.slice(0, 140) }, 0);
          S.started = Date.now(); S.idx = -1; next();
        })
        .catch(() => { toast('Connection problem. Please try again.'); go.disabled = false; go.textContent = 'Enter the hive'; });
    };
  }

  function next() { S.idx++; if (S.idx >= CH.length) return finish(); run(CH[S.idx]); }

  function run(q) {
    S.inChallenge = true; S.allowLeave = q.type === 'link'; window.scrollTo(0, 0); clearFoot();
    app.innerHTML = topBar(true);
    const card = h('div', { class: 'card noselect' });
    card.innerHTML = `<span class="kicker">${hexSvg(C.teal, null, null, 12)} Cell ${S.idx + 1} of ${CH.length} · ${esc(q.tag || '')}</span><h2>${esc(q.title)}</h2>${q.lead ? `<p class="lead">${esc(q.lead)}</p>` : ''}`;
    const body = h('div'); card.appendChild(body); app.appendChild(card);
    footEl = h('div', { class: 'foot' }, '<div class="in"><span class="hint"></span></div>');
    const btn = h('button', { class: 'btn' }, 'Lock it in'); footEl.firstChild.appendChild(btn); root.appendChild(footEl);
    const hint = footEl.querySelector('.hint');
    const R = RENDER[q.type] || RENDER.unknown;
    let api;
    const onCh = () => { btn.disabled = !api.valid(); hint.textContent = api.hint ? api.hint() : ''; };
    api = R(q, body, onCh, card);
    onCh();
    const t0 = Date.now(); let sent = false;
    const limit = Number(q.limit) || 60;
    function submit(timedOut) {
      if (sent) return; sent = true;
      const secs = Math.min(limit, Math.round((Date.now() - t0) / 1000)); stopTimer();
      const a = api.get(); a.timed_out = !!timedOut; save(q.id, a, secs);
      if (timedOut) toast('Time. Your answer so far is saved.');
      card.style.transition = 'opacity .25s,transform .25s'; card.style.opacity = '0'; card.style.transform = 'translateY(-10px)';
      setTimeout(next, timedOut ? 900 : 280);
    }
    btn.onclick = () => submit(false);
    startTimer(limit, () => submit(true));
  }

  function finish() {
    S.inChallenge = false; S.allowLeave = false; stopTimer(); clearFoot();
    save('c_done', { total_seconds: Math.round((Date.now() - S.started) / 1000) }, 0);
    app.innerHTML = topBar(false);
    const card = h('div', { class: 'card done' });
    card.innerHTML = preview
      ? '<img class="squiggle-done" src="/squiggle.png" alt=""><span class="kicker">Preview finished</span><h1>That is how candidates see it.</h1><p class="lead">Nothing was saved.</p>'
      : `<img class="squiggle-done" src="/squiggle.png" alt=""><span class="kicker">Hive complete</span><h1>Thank you, ${esc(S.name.split(' ')[0])}.</h1><p class="lead">Your answers are with the OneHive team. We will be in touch by email at ${esc(S.email)}. You can close this page now.</p><p class="hint">Reference: ${S.sid}</p>`;
    app.appendChild(card);
  }

  /* ---------- renderers ---------- */
  const RENDER = {
    unknown(q, b) { b.innerHTML = '<p class="lead">This cell could not be shown.</p>'; return { get: () => ({}), valid: () => true }; },

    rank(q, b, onCh) {
      const items = shuffle(q.items || []); const order = []; const wrap = h('div', { class: 'grid' }); b.appendChild(wrap);
      function draw() {
        wrap.innerHTML = '';
        items.forEach((it) => {
          const pos = order.indexOf(it.id); const bt = h('button', { class: 'tile' + (pos > -1 ? ' on' : '') });
          bt.innerHTML = `<span class="num">${hexSvg(pos > -1 ? C.amber : '#f3ece2', null, pos > -1 ? pos + 1 : '', 30)}</span>${esc(it.t)}${it.s ? `<small>${esc(it.s)}</small>` : ''}`;
          bt.onclick = () => { const p = order.indexOf(it.id); if (p > -1) order.splice(p, 1); else order.push(it.id); draw(); onCh(); };
          wrap.appendChild(bt);
        });
      }
      draw();
      return { get: () => ({ order: order.slice() }), valid: () => order.length === items.length, hint: () => (order.length < items.length ? `Tap in order: ${order.length}/${items.length}` : 'Tap a card to undo') };
    },

    flag(q, b, onCh) {
      const sel = {}; const items = shuffle(q.items || []); const disp = q.display || 'list';
      const count = () => Object.keys(sel).filter((k) => sel[k]).length;
      const toggle = (id, el) => { sel[id] = !sel[id]; el.classList.toggle('on', !!sel[id]); onCh(); };
      const notesHtml = q.notes && q.notes.lines && q.notes.lines.length ? `<div class="notes"><h4>${esc(q.notes.title || 'Notes')}</h4><ul>${q.notes.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>` : '';
      if (disp === 'chips') {
        const w = h('div', { class: 'split' }); w.innerHTML = notesHtml;
        const sl = h('div', { class: 'slide' }, `<h3>${esc(q.slideTitle || 'Draft slide')}</h3><p>Draft for review</p>`); const ch = h('div', { class: 'chips' }); sl.appendChild(ch); w.appendChild(sl); b.appendChild(w);
        items.forEach((f) => { const c = h('button', { class: 'chip' }, esc(f.t)); c.onclick = () => toggle(f.id, c); ch.appendChild(c); });
      } else if (disp === 'code') {
        const code = h('div', { class: 'code' }); (q.items || []).forEach((l, k) => { const bt = h('button', { class: 'ln' }, `<b>${k + 1}</b><span>${esc(l.t)}</span>`); bt.onclick = () => toggle(l.id, bt); code.appendChild(bt); }); b.appendChild(code);
      } else if (disp === 'tiles') {
        const g = h('div', { class: 'btiles' }); items.forEach((it) => { const bt = h('button', { class: 'bt' }, it.visual ? logoTile(it.visual) : `<div class="ltile txt">${esc(it.t)}</div>`); bt.onclick = () => toggle(it.id, bt); g.appendChild(bt); }); b.appendChild(g);
      } else if (disp === 'table') {
        const t = h('div', { class: 'crm' }); (q.items || []).forEach((it) => { const parts = String(it.t).split('·').map((x) => x.trim()); const bt = h('button', { class: 'crow' }, parts.map((p, i) => `<span class="${i === 0 ? 'c0' : ''}">${esc(p)}</span>`).join('')); bt.onclick = () => toggle(it.id, bt); t.appendChild(bt); }); b.appendChild(t);
      } else {
        if (notesHtml) b.insertAdjacentHTML('beforeend', notesHtml + '<div style="height:12px"></div>');
        items.forEach((it) => { const bt = h('button', { class: 'opt multi' }, esc(it.t)); bt.onclick = () => toggle(it.id, bt); b.appendChild(bt); });
      }
      return { get: () => ({ flagged: Object.keys(sel).filter((k) => sel[k]) }), valid: () => true, hint: () => `${count()} flagged` };
    },

    binary(q, b, onCh) {
      const labels = q.labels && q.labels.length === 2 ? q.labels : [{ id: 'yes', t: 'Yes' }, { id: 'no', t: 'No' }];
      const items = shuffle(q.items || []); const ans = {};
      if (q.style === 'stack') {
        let i = 0; const st = h('div', { class: 'stack' }); b.appendChild(st);
        const bs = h('div', { class: 'sbtns' }); const no = h('button', { class: 'no' }, esc(labels[0].t)), yes = h('button', { class: 'yes' }, esc(labels[1].t)); bs.appendChild(no); bs.appendChild(yes); b.appendChild(bs);
        const draw = () => {
          st.innerHTML = '';
          if (i >= items.length) { st.innerHTML = '<div class="scard" style="text-align:center;align-items:center"><img src="/logo.png" style="width:150px" alt=""><div style="margin-top:12px">All sorted. Lock it in.</div></div>'; bs.style.visibility = 'hidden'; return; }
          for (let k = Math.min(items.length - 1, i + 2); k >= i; k--) { const c = h('div', { class: 'scard' }, `<div class="n">${k + 1} of ${items.length}</div>${esc(items[k].t)}`); const off = k - i; c.style.transform = `translateY(${off * 8}px) scale(${1 - off * 0.04})`; c.style.zIndex = 10 - off; if (off) c.style.opacity = 0.6; st.appendChild(c); }
        };
        const pick = (v, dir) => { if (i >= items.length) return; ans[items[i].id] = v; const top = st.lastChild; top.classList.add(dir); i++; onCh(); setTimeout(draw, 300); };
        no.onclick = () => pick(labels[0].id, 'out-l'); yes.onclick = () => pick(labels[1].id, 'out-r'); draw();
      } else {
        items.forEach((it) => {
          const c = h('div', { class: 'sh' }); c.innerHTML = `<div class="who">${esc(it.t)}</div>${it.s ? `<div class="msg">${esc(it.s)}</div>` : ''}`;
          const sg = h('div', { class: 'seg' }); const b1 = h('button', { class: 'l0' }, esc(labels[0].t)), b2 = h('button', { class: 'l1' }, esc(labels[1].t));
          b1.onclick = () => { ans[it.id] = labels[0].id; b1.classList.add('on'); b2.classList.remove('on'); onCh(); };
          b2.onclick = () => { ans[it.id] = labels[1].id; b2.classList.add('on'); b1.classList.remove('on'); onCh(); };
          sg.appendChild(b1); sg.appendChild(b2); c.appendChild(sg); b.appendChild(c);
        });
      }
      return { get: () => ({ choices: ans }), valid: () => Object.keys(ans).length === items.length, hint: () => `${Object.keys(ans).length}/${items.length} done` };
    },

    steps(q, b, onCh) {
      if (q.notes && q.notes.lines && q.notes.lines.length) b.insertAdjacentHTML('beforeend', `<div class="notes" style="margin-bottom:14px"><h4>${esc(q.notes.title || 'Notes')}</h4><ul>${q.notes.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`);
      if (q.bubble && q.bubble.text) b.insertAdjacentHTML('beforeend', `<div class="bubble">${esc(q.bubble.text)}</div><div class="from">${esc(q.bubble.from || '')}</div>`);
      const steps = q.steps || []; const ch = [];
      let moved = false, rng = null;
      if (steps.length > 1) {
        let i = 0; const box = h('div'); b.appendChild(box);
        const draw = () => {
          box.innerHTML = ''; const dots = h('div', { class: 'pdots' }); steps.forEach((_, k) => dots.appendChild(h('span', { class: k <= i ? 'on' : '' }))); box.appendChild(dots);
          if (i >= steps.length) { box.appendChild(h('p', { class: 'lead', style: 'text-align:center' }, 'All decisions made. Lock it in.')); return; }
          const st = steps[i]; box.appendChild(h('p', { class: 'stepq' }, esc(st.q)));
          shuffle(st.options).forEach((o) => { const bt = h('button', { class: 'opt' }, esc(o.t)); bt.onclick = () => { bt.classList.add('on'); ch[i] = o.id; setTimeout(() => { i++; draw(); onCh(); }, 260); }; box.appendChild(bt); });
        };
        draw();
      } else if (steps.length === 1) {
        const st = steps[0]; if (st.q) b.appendChild(h('p', { class: 'stepq' }, esc(st.q)));
        shuffle(st.options).forEach((o) => { const bt = h('button', { class: 'opt' }, esc(o.t)); bt.onclick = () => { b.querySelectorAll('.opt').forEach((x) => x.classList.remove('on')); bt.classList.add('on'); ch[0] = o.id; onCh(); }; b.appendChild(bt); });
      }
      if (q.slider) {
        b.appendChild(h('p', { class: 'stepq', style: 'margin-top:16px' }, esc(q.slider.label || '')));
        rng = h('input', { type: 'range', min: '0', max: '100', value: '50' }); rng.oninput = () => { moved = true; onCh(); }; b.appendChild(rng);
        b.appendChild(h('div', { class: 'rlab' }, `<span>${esc(q.slider.left || '')}</span><span>${esc(q.slider.right || '')}</span>`));
      }
      return {
        get: () => { const o = { choices: ch.slice() }; if (q.slider) { o.scope = +rng.value; o.scope_moved = moved; } return o; },
        valid: () => ch.filter((x) => x).length === steps.length && (!q.slider || moved),
        hint: () => (ch.filter((x) => x).length < steps.length ? (steps.length > 1 ? `Decision ${Math.min(ch.length + 1, steps.length)} of ${steps.length}` : 'Pick one') : q.slider && !moved ? 'Set the slider' : ''),
      };
    },

    matrix(q, b, onCh) {
      const ans = {}; const rows = shuffle(q.rows || []);
      rows.forEach((r) => {
        const row = h('div', { class: 'mrow' }); row.appendChild(h('div', { class: 't' }, esc(r.t))); const cs = h('div', { class: 'mchips' });
        shuffle(q.cols || []).forEach((t) => { const c = h('button', { class: 'mchip' }, esc(t)); c.onclick = () => { cs.querySelectorAll('.mchip').forEach((x) => x.classList.remove('on')); c.classList.add('on'); ans[r.id] = t; row.classList.add('done'); onCh(); }; cs.appendChild(c); });
        row.appendChild(cs); b.appendChild(row);
      });
      return { get: () => ({ matches: ans }), valid: () => Object.keys(ans).length === rows.length, hint: () => `${Object.keys(ans).length}/${rows.length} matched` };
    },

    pattern(q, b, onCh) {
      const P = q.puzzles || []; let i = 0; const ans = []; const box = h('div'); b.appendChild(box);
      const draw = () => {
        box.innerHTML = ''; const dots = h('div', { class: 'pdots' }); P.forEach((_, k) => dots.appendChild(h('span', { class: k <= i ? 'on' : '' }))); box.appendChild(dots);
        if (i >= P.length) { box.appendChild(h('p', { class: 'lead', style: 'text-align:center' }, 'All answered. Lock it in.')); return; }
        const p = P[i]; const sq = h('div', { class: 'seq' }); p.seq.forEach((s) => sq.insertAdjacentHTML('beforeend', flower(s) + '<span class="arrow">›</span>')); sq.insertAdjacentHTML('beforeend', '<div class="q pulse">?</div>'); box.appendChild(sq);
        const po = h('div', { class: 'popts' }); shuffle(p.opts).forEach((o, k) => { const bt = h('button', { class: 'popt' }, `<i>${'ABCD'[k] || ''}</i>${flower(o.s, 74)}`); bt.onclick = () => { bt.classList.add('on'); ans[i] = o.id; setTimeout(() => { i++; draw(); onCh(); }, 260); }; po.appendChild(bt); }); box.appendChild(po);
      };
      draw();
      return { get: () => ({ answers: ans.slice() }), valid: () => ans.length === P.length, hint: () => `Puzzle ${Math.min(i + 1, P.length)} of ${P.length}` };
    },

    link(q, b, onCh, card) {
      card.classList.remove('noselect');
      const wrap = h('div', { 'data-allowpaste': '1' });
      wrap.innerHTML = `<label class="field"><span>${esc(q.linkLabel || 'Share link')}</span><input type="url" placeholder="https://" autocomplete="off"></label><label class="field"><span>Anything we should know? (optional)</span><input type="text" maxlength="200"></label>`;
      b.appendChild(wrap);
      const [u, n] = wrap.querySelectorAll('input');
      u.oninput = onCh;
      const ok = () => /^https?:\/\/\S+\.\S+/.test(u.value.trim());
      return { get: () => ({ url: u.value.trim().slice(0, 500), note: n.value.trim() }), valid: ok, hint: () => (ok() ? '' : 'Paste a link starting with https://') };
    },

    written(q, b, onCh, card) {
      card.classList.remove('noselect');
      const max = Number(q.maxWords) || 150, min = Number(q.minWords) || 25;
      const ta = h('textarea', { placeholder: 'Start typing…', spellcheck: 'true' }); let keys = 0, firstKey = 0;
      ta.addEventListener('keydown', () => { keys++; if (!firstKey) firstKey = Date.now(); });
      const wc = h('div', { class: 'wc' }, `<span>0 words</span><span>${max} max</span>`);
      const words = () => ta.value.trim().split(/\s+/).filter(Boolean);
      ta.oninput = () => { let w = words(); if (w.length > max) { ta.value = w.slice(0, max).join(' '); w = w.slice(0, max); } wc.firstChild.textContent = w.length + ' words'; onCh(); };
      b.appendChild(ta); b.appendChild(wc);
      return { get: () => ({ text: ta.value.trim(), keystrokes: keys, chars: ta.value.length, typing_seconds: firstKey ? Math.round((Date.now() - firstKey) / 1000) : 0 }), valid: () => words().length >= min, hint: () => (words().length < min ? `At least ${min} words` : '') };
    },
  };

  if (!CH.length) { app.innerHTML = topBar(false) + '<div class="card"><h2>No questions yet</h2><p class="lead">Switch some questions on in the admin.</p></div>'; }
  else if (single || preview) { S.started = Date.now(); next(); }
  else introScreen();

  return function destroy() {
    stopTimer(); clearFoot();
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('paste', onPaste, true);
    document.removeEventListener('drop', onDrop, true);
    document.removeEventListener('copy', onCopy, true);
    document.removeEventListener('cut', onCopy, true);
    document.removeEventListener('contextmenu', onCtx);
    root.innerHTML = '';
  };
}
