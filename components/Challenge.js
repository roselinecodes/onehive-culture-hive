'use client';
import { useEffect, useRef, useState } from 'react';

export default function Challenge({ slug, questions: given, intro: givenIntro, role: givenRole, preview = false }) {
  const ref = useRef(null);
  const [state, setState] = useState(given ? { questions: given, intro: givenIntro || {}, role: givenRole || {} } : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (given) return;
    fetch('/api/questions?role=' + encodeURIComponent(slug || ''), { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (j.error) setError(j.error); else setState({ questions: j.questions, intro: j.intro || {}, role: j.role }); })
      .catch(() => setError('Could not load the challenge. Check your connection and refresh.'));
  }, [given, slug]);

  useEffect(() => {
    if (!state || !ref.current) return;
    let destroy = () => {};
    let live = true;
    import('@/lib/engine').then((m) => { if (live) destroy = m.mount(ref.current, { questions: state.questions, intro: state.intro, role: state.role, preview }); });
    return () => { live = false; destroy(); };
  }, [state, preview]);

  if (error) return (<div className="loading"><img src="/logo.png" alt="OneHive" /><img src="/squiggle.png" alt="" style={{ width: 260 }} /><div style={{ maxWidth: 420, textAlign: 'center' }}>{error}</div></div>);
  if (!state) return <div className="loading"><img src="/logo.png" alt="OneHive" /><div>Loading the hive…</div></div>;
  return <div className="hive" ref={ref} />;
}
