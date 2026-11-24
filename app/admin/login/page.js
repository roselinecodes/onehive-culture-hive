'use client';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
    setBusy(false);
    if (r.ok) window.location.href = '/admin';
    else { const j = await r.json().catch(() => ({})); setErr(j.error || 'Could not sign in.'); setPw(''); }
  }
  return (
    <form className="login" onSubmit={go}>
      <img src="/logo.png" alt="OneHive" />
      <div style={{ color: '#6f655d', fontSize: 14 }}>Hiring hive admin</div>
      <input type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
      <input type="password" placeholder="Password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required style={{ marginTop: 0 }} />
      <button className="btn amber" style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {err && <div style={{ color: '#b4532a', marginTop: 10, fontSize: 14 }}>{err}</div>}
    </form>
  );
}
