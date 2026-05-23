'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { acceptInvite, clearAuth } from '@divisionx/api-client';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link. Please check the URL.');
    } else {
      clearAuth(); // Flush any existing owner/user credentials to prevent session leak
    }
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const result = await acceptInvite({ token, name: name || undefined, password });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch {
      setError('Invalid or expired invite. Please contact your workspace admin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg, #011a13 0%, #052e21 40%, #0a4030 100%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '48px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>🤝</div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--text-main)', margin: 0 }}>Join Workspace</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 6 }}>Set up your account to join the team</p>
        </div>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '16px', borderRadius: 'var(--radius-md)', fontWeight: 500, marginBottom: 20 }}>
              ✓ You&apos;ve successfully joined the workspace! Redirecting to login...
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="label">Your Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" autoFocus />
            </div>
            <div className="input-group">
              <label className="label">Password <span style={{ color: 'var(--danger-text)' }}>*</span></label>
              <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" type="password" autoComplete="new-password" />
            </div>
            <div className="input-group">
              <label className="label">Confirm Password <span style={{ color: 'var(--danger-text)' }}>*</span></label>
              <input className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" type="password" autoComplete="new-password" />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '14px' }} disabled={loading || !token}>
              {loading ? 'Joining...' : 'Join Workspace'}
            </button>
            {error && <div style={{ color: 'var(--danger-text)', background: 'var(--danger-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
          </form>
        )}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}
