'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:5000'}/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setSent(true);
    } catch {
      setSent(true); // Don't reveal whether email exists
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(165deg, #011a13 0%, #052e21 40%, #0a4030 100%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '48px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>🔑</div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--text-main)', margin: 0 }}>Reset Password</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 6 }}>Enter your email and we&apos;ll send you a reset link</p>
        </div>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '16px', borderRadius: 'var(--radius-md)', fontWeight: 500, marginBottom: 20 }}>
              ✓ If an account exists with that email, we&apos;ve sent a password reset link.
            </div>
            <Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>← Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="label">Email Address</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" type="email" autoComplete="email" autoFocus />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '14px' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        {!sent && (
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Remember your password?{' '}
            <Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
          </div>
        )}
      </div>
    </main>
  );
}
