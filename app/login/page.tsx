// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  async function checkDestination() {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const d = await res.json();
        if (d.totalOrders > 0) {
          router.push('/dashboard');
          return;
        }
      }
    } catch {}
    router.push('/');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      await checkDestination();
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: name || 'Demo Merchant',
          gstin: gstin || '27AABCP1234Q1Z5',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Automatically sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setSuccess('Account created! Please log in with your credentials.');
        setMode('login');
        setLoading(false);
      } else {
        await checkDestination();
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 14,
        padding: '2.25rem 2rem',
        boxShadow: 'var(--card-shadow)',
      }}>
        {/* Ledger Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent-border)',
            marginBottom: '1rem',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z"/>
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
              <path d="M12 6v12"/>
            </svg>
          </div>

          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>
            ReconCopilot
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Automated settlement & GST reconciliation statement for Razorpay merchants.
          </p>
        </div>

        {/* Mode Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-card)',
          borderRadius: 8,
          padding: 3,
          marginBottom: '1.5rem',
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: mode === 'login' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'login' ? 'var(--accent-primary)' : 'var(--text-muted)',
              boxShadow: mode === 'login' ? 'var(--card-shadow)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: mode === 'signup' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'signup' ? 'var(--accent-primary)' : 'var(--text-muted)',
              boxShadow: mode === 'signup' ? 'var(--card-shadow)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Register Merchant
          </button>
        </div>

        {/* Error / Success feedback */}
        {error && (
          <div style={{
            padding: '0.65rem 0.85rem',
            background: 'var(--critical-dim)',
            border: '1px solid var(--critical-border)',
            borderRadius: 6,
            fontSize: '0.82rem',
            color: 'var(--critical)',
            marginBottom: '1.25rem',
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            padding: '0.65rem 0.85rem',
            background: 'var(--success-dim)',
            border: '1px solid var(--success-border)',
            borderRadius: 6,
            fontSize: '0.82rem',
            color: 'var(--success)',
            marginBottom: '1.25rem',
          }}>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'signup' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Merchant / Store Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priya Crafts Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="app-input"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 500 }}>
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27AABCP1234Q1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="app-input font-mono"
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 500 }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="merchant@store.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="app-input"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.7rem' }}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Open Ledger' : 'Create Merchant Profile'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-card)' }}>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Demo Account Credentials:
          </p>
          <p style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
            priya@crafts.com • DemoPassword123!
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.75rem' }}>
            Built for Razorpay merchants subject to mandatory GST e-invoicing.
          </p>
        </div>
      </div>
    </div>
  );
}
