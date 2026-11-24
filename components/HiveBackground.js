'use client';
import { useEffect, useRef, useState } from 'react';

// Animated brand background: a few soft-cornered, flat-top hexagons and a snake trail
// that travels between them. Each hexagon changes colour when the snake reaches it.
const COLOURS = ['#FCB040', '#2BA7A0', '#D77F5A'];

// Positions as fractions of the screen, in the order the snake visits them.
// Kept to the edges so the hexagons sit around the content, not behind the text.
const WIDE = [[0.08, 0.16], [0.17, 0.42], [0.07, 0.68], [0.16, 0.9], [0.5, 0.97], [0.85, 0.88], [0.94, 0.62], [0.83, 0.36], [0.93, 0.12]];
const NARROW = [[0.06, 0.14], [0.94, 0.26], [0.98, 0.58], [0.9, 0.9], [0.1, 0.82], [0.02, 0.48]];

function hexPath(cx, cy, r) {
  // flat-top hexagon with rounded corners
  const k = 0.22; // corner softness
  const pts = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  let d = '';
  for (let i = 0; i < 6; i++) {
    const p = pts[i], prev = pts[(i + 5) % 6], next = pts[(i + 1) % 6];
    const a1 = [p[0] + (prev[0] - p[0]) * k, p[1] + (prev[1] - p[1]) * k];
    const a2 = [p[0] + (next[0] - p[0]) * k, p[1] + (next[1] - p[1]) * k];
    d += (i === 0 ? `M${a1[0].toFixed(1)},${a1[1].toFixed(1)}` : `L${a1[0].toFixed(1)},${a1[1].toFixed(1)}`) + `Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${a2[0].toFixed(1)},${a2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

// Smooth closed curve through the points (Catmull-Rom to Bezier), one segment per hop.
function segments(pts) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out.push(`C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return out;
}

export default function HiveBackground() {
  const [size, setSize] = useState(null);
  const [cols, setCols] = useState([]);
  const [pulse, setPulse] = useState(-1);
  const snakeRefs = [useRef(null), useRef(null)];
  const measureRef = useRef(null);

  useEffect(() => {
    let t;
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    const onR = () => { clearTimeout(t); t = setTimeout(read, 200); };
    window.addEventListener('resize', onR);
    window.addEventListener('orientationchange', onR);
    return () => { window.removeEventListener('resize', onR); window.removeEventListener('orientationchange', onR); clearTimeout(t); };
  }, []);

  const narrow = size && size.w < 760;
  const layout = narrow ? NARROW : WIDE;
  const r = size ? (narrow ? Math.max(30, Math.min(44, size.w * 0.1)) : Math.max(34, Math.min(52, size.w * 0.032))) : 40;
  const pts = size ? layout.map(([x, y]) => [x * size.w, y * size.h]) : [];
  const segs = size ? segments(pts) : [];
  const d = size ? `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}` + segs.join('') : '';

  useEffect(() => { if (size) setCols(layout.map((_, i) => i % 3)); }, [narrow, !!size]); // eslint-disable-line

  useEffect(() => {
    if (!size || !measureRef.current) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // cumulative length to each hexagon
    const p = measureRef.current;
    const cum = []; let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      p.setAttribute('d', `M${pts[i][0]},${pts[i][1]}${segs[i]}`);
      acc += p.getTotalLength(); cum.push(acc);
    }
    const total = acc;
    const nodeAt = cum.map((c, i) => ({ i: (i + 1) % pts.length, at: i === segs.length - 1 ? 0 : c }));
    const snakeLen = Math.min(total * 0.18, narrow ? 220 : 340);
    snakeRefs.forEach((s) => { if (s.current) s.current.style.strokeDasharray = `${snakeLen} ${total - snakeLen}`; });
    if (reduce) { snakeRefs.forEach((s) => { if (s.current) s.current.style.strokeDashoffset = `${snakeLen}`; }); return; }
    const speed = narrow ? 85 : 130; // px per second
    let raf, start = null, prev = 0, paused = false;
    const tick = (ts) => {
      if (paused) return;
      if (start === null) start = ts - prev / speed * 1000;
      const head = (((ts - start) / 1000) * speed) % total;
      snakeRefs.forEach((s) => { if (s.current) s.current.style.strokeDashoffset = `${-(head - snakeLen)}`; });
      for (const n of nodeAt) {
        const crossed = prev <= head ? n.at > prev && n.at <= head : n.at > prev || n.at <= head;
        if (crossed) { setCols((c) => { const x = c.slice(); x[n.i] = (x[n.i] + 1) % 3; return x; }); setPulse(n.i); }
      }
      prev = head;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVis = () => { if (document.hidden) { paused = true; cancelAnimationFrame(raf); } else { paused = false; start = null; raf = requestAnimationFrame(tick); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
  }, [size && size.w, size && size.h]); // eslint-disable-line

  if (!size) return null;
  return (
    <svg className="hive-bg" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
      <path ref={measureRef} d="" fill="none" stroke="none" />
      <path ref={snakeRefs[0]} d={d} fill="none" stroke="#FCB040" strokeOpacity="0.35" strokeWidth={narrow ? 9 : 12} strokeLinecap="round" strokeLinejoin="round" />
      <path ref={snakeRefs[1]} d={d} fill="none" stroke="#25201D" strokeWidth={narrow ? 3 : 4} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <path key={i} d={hexPath(x, y, r)} className={'hive-hex' + (pulse === i ? ' pulse' : '')} style={{ fill: COLOURS[cols[i] ?? i % 3] }} onAnimationEnd={() => setPulse(-1)} />
      ))}
    </svg>
  );
}
