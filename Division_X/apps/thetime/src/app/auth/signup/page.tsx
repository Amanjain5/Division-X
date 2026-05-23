'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup, persistAuth, isLoggedIn } from '@divisionx/api-client';

export default function SignupPage() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (typeof window !== 'undefined' && isLoggedIn()) {
    router.replace('/tracker');
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password || !workspaceName) { setError('Please fill in all required fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const result = await signup({ workspaceName, email, password, name: name || undefined });
      persistAuth(result);
      router.push('/tracker');
    } catch {
      setError('Unable to create account. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg, #011a13 0%, #052e21 40%, #0a4030 100%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '48px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>⏰</div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--text-main)', margin: 0 }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 6 }}>Start tracking time in seconds</p>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="label">Workspace Name <span style={{ color: 'var(--danger-text)' }}>*</span></label>
            <input className="input" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Acme Corp" autoFocus />
          </div>
          <div className="input-group">
            <label className="label">Your Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" />
          </div>
          <div className="input-group">
            <label className="label">Email Address <span style={{ color: 'var(--danger-text)' }}>*</span></label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" type="email" autoComplete="email" />
          </div>
          <div className="input-group">
            <label className="label">Password <span style={{ color: 'var(--danger-text)' }}>*</span></label>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" type="password" autoComplete="new-password" />
          </div>
          <button className="btn btn-primary" type="submit" style={{ marginTop: 8, width: '100%', padding: '14px' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
          {error && <div style={{ color: 'var(--danger-text)', background: 'var(--danger-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
        </form>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}
