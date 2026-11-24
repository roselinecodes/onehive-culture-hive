'use client';
import { useEffect, useRef, useState } from 'react';

// Animated brand background: small clusters of connected, slim-edged honeycomb cells.
// The centres stay clear; only the outlines are coloured. A snake trail travels along the
// shared edges, and each cell it passes switches to the next colour (amber, teal, clay).
const COLOURS = ['#FCB040', '#2BA7A0', '#D77F5A'];
const SHAPE = [[0, 0], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [2, -1], [-1, 2]]; // axial coords, flat-top

function buildCluster(cx, cy, R, shape) {
  const s3 = Math.sqrt(3);
  const cells = shape.map(([q, r]) => {
    const x = cx + R * 1.5 * q, y = cy + R * s3 * (r + q / 2);
    const v = []; for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i); v.push([x + R * Math.cos(a), y + R * Math.sin(a)]); }
    return { x, y, v };
  });
  // shared vertex graph
  const key = (p) => `${Math.round(p[0])}:${Math.round(p[1])}`;
  const nodes = {}, edges = {};
  cells.forEach((c, ci) => {
    c.v.forEach((p, i) => {
      const q = c.v[(i + 1) % 6];
      const a = key(p), b = key(q);
      nodes[a] = nodes[a] || { p, n: new Set() }; nodes[b] = nodes[b] || { p: q, n: new Set() };
      nodes[a].n.add(b); nodes[b].n.add(a);
      const ek = a < b ? a + '|' + b : b + '|' + a;
      (edges[ek] = edges[ek] || []).push(ci);
    });
  });
  return { cells, nodes, edges };
}

export default function HiveBackground() {
  const [size, setSize] = useState(null);
  const [cols, setCols] = useState({});
  const trailRefs = useRef([]);

  useEffect(() => {
    let t;
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    const onR = () => { clearTimeout(t); t = setTimeout(read, 200); };
    window.addEventListener('resize', onR); window.addEventListener('orientationchange', onR);
    return () => { window.removeEventListener('resize', onR); window.removeEventListener('orientationchange', onR); clearTimeout(t); };
  }, []);

  const narrow = size && size.w < 760;
  const R = size ? (narrow ? Math.max(26, Math.min(34, size.w * 0.08)) : Math.max(36, Math.min(54, size.w * 0.03))) : 40;
  // cluster centres, kept to the edges so the content stays clear
  const centres = size ? (narrow ? [[size.w - R * 0.9, size.h * 0.1], [R * 0.9, size.h * 0.88]] : [[Math.min(size.w * 0.11, 200), size.h * 0.38], [size.w - Math.min(size.w * 0.11, 200), size.h * 0.66]]) : [];
  const clusters = size ? centres.map(([x, y], k) => buildCluster(x, y, R, k ? SHAPE.map(([q, r]) => [-q, -r]) : SHAPE)) : [];

  useEffect(() => {
    if (!size) return;
    const init = {}; clusters.forEach((c, k) => c.cells.forEach((_, i) => { init[`${k}-${i}`] = (i + k) % 3; }));
    setCols(init);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const speed = narrow ? 70 : 95; // px per second
    const trailLen = R * 2.4;
    const snakes = clusters.map((c, k) => {
      const keys = Object.keys(c.nodes);
      const start = keys[(k * 7) % keys.length];
      const nb = [...c.nodes[start].n];
      return { k, c, from: start, to: nb[0], t: 0, hist: [c.nodes[start].p], lastCell: -1 };
    });
    const lastChanged = {};
    let raf, last = null, paused = false;
    const step = (ts) => {
      if (paused) return;
      const dt = last === null ? 0 : Math.min(0.05, (ts - last) / 1000); last = ts;
      snakes.forEach((s, si) => {
        const a = s.c.nodes[s.from].p, b = s.c.nodes[s.to].p;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        s.t += (speed * dt) / len;
        if (s.t >= 1) {
          // arrived at a corner: recolour the cell this edge belongs to, then pick the next edge
          const ek = s.from < s.to ? s.from + '|' + s.to : s.to + '|' + s.from;
          const owners = s.c.edges[ek] || [];
          const pick = owners.slice().sort((x, y) => (lastChanged[`${s.k}-${x}`] || 0) - (lastChanged[`${s.k}-${y}`] || 0))[0];
          if (pick !== undefined && pick !== s.lastCell) {
            const id = `${s.k}-${pick}`; lastChanged[id] = ts; s.lastCell = pick;
            setCols((cc) => ({ ...cc, [id]: ((cc[id] ?? 0) + 1) % 3 }));
          }
          s.hist.push(b); if (s.hist.length > 12) s.hist.shift();
          const options = [...s.c.nodes[s.to].n].filter((n) => n !== s.from);
          const next = options[Math.floor(Math.random() * options.length)] || s.from;
          s.from = s.to; s.to = next; s.t = 0;
        }
        const A = s.c.nodes[s.from].p, B = s.c.nodes[s.to].p;
        const head = [A[0] + (B[0] - A[0]) * s.t, A[1] + (B[1] - A[1]) * s.t];
        // build the trail backwards from the head
        const pts = [head]; let remain = trailLen; let cur = head;
        for (let i = s.hist.length - 1; i >= 0 && remain > 0; i--) {
          const p = s.hist[i]; const d = Math.hypot(cur[0] - p[0], cur[1] - p[1]);
          if (d >= remain) { const f = remain / (d || 1); pts.push([cur[0] + (p[0] - cur[0]) * f, cur[1] + (p[1] - cur[1]) * f]); remain = 0; }
          else { pts.push(p); remain -= d; cur = p; }
        }
        const dd = 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
        const els = trailRefs.current[si];
        if (els) els.forEach((el) => el && el.setAttribute('d', dd));
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const onVis = () => { if (document.hidden) { paused = true; cancelAnimationFrame(raf); } else { paused = false; last = null; raf = requestAnimationFrame(step); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
  }, [size && size.w, size && size.h]); // eslint-disable-line

  if (!size) return null;
  const sw = narrow ? 2 : 2.5;
  return (
    <svg className="hive-bg" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
      {clusters.map((c, k) => (
        <g key={k}>
          {c.cells.map((cell, i) => (
            <polygon key={i} className="hive-hex" points={cell.v.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')} fill="none" strokeWidth={sw} strokeLinejoin="round" style={{ stroke: COLOURS[cols[`${k}-${i}`] ?? (i + k) % 3] }} />
          ))}
          <path ref={(el) => { (trailRefs.current[k] = trailRefs.current[k] || [])[0] = el; }} d="" fill="none" stroke="#FCB040" strokeOpacity="0.35" strokeWidth={narrow ? 8 : 10} strokeLinecap="round" strokeLinejoin="round" />
          <path ref={(el) => { (trailRefs.current[k] = trailRefs.current[k] || [])[1] = el; }} d="" fill="none" stroke="#25201D" strokeWidth={narrow ? 3 : 3.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}
