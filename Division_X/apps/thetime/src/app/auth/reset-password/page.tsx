'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing password reset token. Please request another reset link.');
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:5000'}/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/auth/login'), 2500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error === 'invalid_or_expired_token' ? 'The reset link is invalid or has expired.' : 'Failed to reset password. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg, #011a13 0%, #052e21 40%, #0a4030 100%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '48px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>🔐</div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--text-main)', margin: 0 }}>Reset Password</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 6 }}>Enter your new password below</p>
        </div>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '16px', borderRadius: 'var(--radius-md)', fontWeight: 500, marginBottom: 20 }}>
              ✓ Password reset successfully! Redirecting you to login...
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="label">New Password <span style={{ color: 'var(--danger-text)' }}>*</span></label>
              <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" type="password" autoComplete="new-password" autoFocus />
            </div>
            <div className="input-group">
              <label className="label">Confirm Password <span style={{ color: 'var(--danger-text)' }}>*</span></label>
              <input className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" type="password" autoComplete="new-password" />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '14px' }} disabled={loading || !token}>
              {loading ? 'Resetting...' : 'Update Password'}
            </button>
            {error && <div style={{ color: 'var(--danger-text)', background: 'var(--danger-bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
          </form>
        )}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Back to{' '}
          <Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}
