// Strips answer keys and scoring data before questions go to candidates.
export function publicQuestion(q) {
  const { key, rubric, weight, pillar, notesInternal, isNew, ...rest } = q;
  const c = JSON.parse(JSON.stringify(rest));
  if (c.steps) c.steps = c.steps.map((s) => ({ ...s, options: s.options.map(({ points, ...o }) => o) }));
  if (c.items) c.items = c.items.map(({ correct, ...it }) => it);
  if (c.rows) c.rows = c.rows.map(({ correct, ...r }) => r);
  if (c.puzzles) c.puzzles = c.puzzles.map((p) => ({ seq: p.seq, opts: p.opts.map(({ correct, ...o }) => o) }));
  if (c.slider) { const { best, weight: w, ...s } = c.slider; c.slider = s; }
  return c;
}

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function publicQuestions(qs) {
  return qs.filter((q) => q.enabled).map((q) => {
    const p = publicQuestion(q);
    if (p.type === 'rank' && p.items) p.items = shuffle(p.items); // rank order must never reach the browser
    return p;
  });
}
