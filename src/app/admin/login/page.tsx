'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AdminLoginPage() {
  const [password, setPassword] = useState(''); const [error, setError] = useState(''); const router = useRouter();
  async function submit(event: React.FormEvent) { event.preventDefault(); const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) }); if (response.ok) router.push('/admin'); else setError('Incorrect password or server configuration.'); }
  return <main className="panel" style={{ margin: '3rem auto', maxWidth: 420 }}><h1>Admin sign in</h1><form onSubmit={submit}><p><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" /></p><button>Sign in</button>{error && <p role="alert">{error}</p>}</form></main>;
}
