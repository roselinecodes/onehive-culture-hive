'use client';
import { useState } from 'react';

export default function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  async function go(e) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (r.ok) window.location.href = '/admin'; else setErr('That password is not right.');
  }
  return (
    <form className="login" onSubmit={go}>
      <img className="sq" src="/squiggle.png" alt="" />
      <img src="/logo.png" alt="OneHive" />
      <div style={{ color: '#6f655d', fontSize: 14 }}>Hive Challenge admin</div>
      <input type="password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      <button className="btn amber" style={{ width: '100%' }}>Sign in</button>
      {err && <div style={{ color: '#b4532a', marginTop: 10, fontSize: 14 }}>{err}</div>}
    </form>
  );
}
