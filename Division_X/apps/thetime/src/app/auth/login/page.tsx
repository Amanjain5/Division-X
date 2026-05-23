'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, persistAuth, isLoggedIn } from '@divisionx/api-client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/tracker';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (typeof window !== 'undefined' && isLoggedIn()) {
    router.replace(redirect);
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const result = await login({ email, password });
      persistAuth(result);
      router.push(redirect);
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg, #011a13 0%, #052e21 40%, #0a4030 100%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '48px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>⏰</div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--text-main)', margin: 0 }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 6 }}>Sign in to your TheTime account</p>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="label">Email Address</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" type="email" autoComplete="email" autoFocus />
          </div>
          <div className="input-group">
            <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Password
              <Link href="/auth/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 500 }}>Forgot?</Link>
            </label>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" autoComplete="current-password" />
          </div>
          <button className="btn btn-primary" type="submit" style={{ marginTop: 8, width: '100%', padding: '14px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {error && <div style={{ color: 'var(--danger-text)', background: 'var(--danger-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
        </form>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign up free</Link>
        </div>
      </div>
    </main>
  );
}
