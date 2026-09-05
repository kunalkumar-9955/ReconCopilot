// app/page.tsx
'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Hero Section */}
      <section style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '5rem 1.5rem 4rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Domain Badge */}
        <div style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
          <span className="pill pill-teal" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            🇮🇳 Built for Indian D2C & Micro Razorpay Merchants • FY 2025-26 e-Invoicing
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
          fontWeight: 800,
          color: 'var(--text-primary)',
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          maxWidth: 960,
          margin: '0 auto 1.5rem',
        }}>
          Reconcile Razorpay Settlements, Bank Credits & GST Invoices{' '}
          <span style={{ color: 'var(--accent-primary)' }}>
            in Seconds.
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.18rem)',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          maxWidth: 760,
          margin: '0 auto 2.5rem',
        }}>
          Stop spending weekends doing manual Excel VLOOKUPs. ReconCopilot automatically cross-references your payment gateway settlements against bank UTR credits and GST e-invoices, uncovers hidden fee deductions, and answers audit queries in plain Hindi or English.
        </p>

        {/* Hero CTAs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}>
          <Link
            href="/login"
            className="btn-primary"
            style={{
              padding: '0.85rem 1.85rem',
              fontSize: '0.98rem',
              borderRadius: 8,
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <span>Get Started — Sign In to Access</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>

          <Link
            href="/login"
            className="btn-secondary"
            style={{ padding: '0.85rem 1.6rem', fontSize: '0.98rem', borderRadius: 8 }}
          >
            Merchant Login
          </Link>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
          ✓ Secure authentication with email, password & 1-click evaluation access.
        </p>

        {/* Product Showcase Visual Card */}
        <div style={{
          marginTop: '3.5rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 16,
          padding: '1.75rem',
          boxShadow: 'var(--card-shadow)',
          textAlign: 'left',
        }}>
          {/* Mock Window Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem', marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--critical)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontFamily: 'JetBrains Mono' }}>
                ReconCopilot Statement Audit — Priya Crafts Store (GSTIN: 27AABCP1234Q1Z5)
              </span>
            </div>
            <span className="pill pill-teal">3-Way Auto Reconciled</span>
          </div>

          {/* Mini Dashboard Preview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="app-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Gross Order Book</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>₹1,64,820</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>80 Orders Billed</div>
            </div>

            <div className="app-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Reconciliation Health</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: 4 }}>86% Clear</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>69 Verified Against Bank</div>
            </div>

            <div className="app-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Razorpay Fee & Tax</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>₹3,248.42</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginTop: 2 }}>+ ₹584.98 ITC Claimable</div>
            </div>

            <div className="app-card app-card-amber" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>Exceptions Flagged</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--warning)', marginTop: 4 }}>12 Discrepancies</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: 2 }}>Double fee & UTR lags</div>
            </div>
          </div>

          {/* Visual Preview Snippets */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {/* Exception Preview Display */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--warning-border)',
              borderRadius: 10,
              padding: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="pill pill-amber">Double Commission Alert</span>
                <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--critical)', fontWeight: 600 }}>-₹45.20 Delta</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                <strong>Order #ord_0042:</strong> Razorpay deducted fee twice due to payment retry. Gateway settlement is short by ₹45.20.
              </p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--warning)' }}>
                • Requires merchant review & dispute filing with gateway
              </div>
            </div>

            {/* AI Copilot Snippet Display */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--accent-border)',
              borderRadius: 10,
              padding: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span className="dot dot-teal" />
                <span style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Ask AI Copilot (Hinglish)</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <em>Merchant:</em> &quot;Iss mahine kitna commission kata?&quot;
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)', background: 'var(--accent-dim)', padding: '0.5rem', borderRadius: 6, lineHeight: 1.4 }}>
                &quot;Is mahine aapka total commission <strong>₹3,248.42</strong> kata hai. Is par ₹584.98 GST laga hai jo GSTR-3B Table 4 mein <strong>ITC claim</strong> karne ke liye eligible hai.&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 3-Way Reconciliation Architecture Section */}
      <section id="how-it-works" style={{
        maxWidth: 1200,
        margin: '2rem auto 5rem',
        padding: '0 1.5rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="pill pill-teal">How It Works</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
            The 3-Way Automated Ledger Cross-Check
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem', maxWidth: 620, margin: '0.4rem auto 0' }}>
            Unlike generic accounting software, ReconCopilot compares all three independent financial sources simultaneously.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Step 1 */}
          <div className="app-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.25rem',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <rect width="20" height="14" x="2" y="5" rx="2"/>
                <line x1="2" x2="22" y1="10" y2="10"/>
              </svg>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', fontWeight: 600 }}>SOURCE 1</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.35rem 0 0.5rem' }}>
              Razorpay Settlement Feed
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Ingests gross order amounts, 2% standard transaction commissions, 18% GST on fees, and settlement batch references.
            </p>
          </div>

          {/* Step 2 */}
          <div className="app-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.25rem',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', fontWeight: 600 }}>SOURCE 2</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.35rem 0 0.5rem' }}>
              Current Account Bank UTRs
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Cross-verifies actual NEFT/RTGS bank credits against payment gateway payout batches, identifying T+2 timing lags or deductions.
            </p>
          </div>

          {/* Step 3 */}
          <div className="app-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--warning-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.25rem',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
              </svg>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--warning)', fontWeight: 600 }}>SOURCE 3</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.35rem 0 0.5rem' }}>
              Mandatory GST e-Invoices
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Ensures every customer order has a compliant B2C tax invoice with HSN tax splits for seamless GSTR-1 Section 7/8 filing.
            </p>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" style={{
        maxWidth: 1200,
        margin: '0 auto 5rem',
        padding: '0 1.5rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="pill pill-teal">Key Capabilities</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
            Engineered Specifically for Solo & Micro Merchants
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: '1.25rem',
        }}>
          <div className="app-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              🎯 3-Priority Match Engine
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Exact Order ID matching first, amount + settlement date proximity second, and LLM inference for ambiguous retry notes.
            </p>
          </div>

          <div className="app-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              ⚠️ Root-Cause Discrepancy Drawer
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Examine 4-way side-by-side comparison across Order, Razorpay, Bank, and GST Invoice with plain-language reasons.
            </p>
          </div>

          <div className="app-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              💬 Hinglish Financial Copilot
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Ask conversational questions like <em>&quot;Kitna settlement pending hai?&quot;</em> or <em>&quot;Double commission wale orders kaunse hain?&quot;</em>
            </p>
          </div>

          <div className="app-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              📑 CA-Ready GSTR-1 & ITC Export
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Generate complete CSV schedules linking customer orders and Razorpay fee tax credits ready for GSTR-3B Table 4(A)(5).
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Final CTA */}
      <section style={{
        maxWidth: 1200,
        margin: '0 auto 5rem',
        padding: '0 1.5rem',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 16,
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: 'var(--card-shadow)',
        }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Ready to Reconcile Your Merchant Ledger?
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto 2rem', lineHeight: 1.55 }}>
            Sign in to access your automated settlement statement, audit flagged exceptions, and export GST schedules.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href="/login"
              className="btn-primary"
              style={{ padding: '0.8rem 1.85rem', fontSize: '0.96rem' }}
            >
              Get Started — Sign In to Access →
            </Link>
            <Link
              href="/login"
              className="btn-secondary"
              style={{ padding: '0.8rem 1.5rem', fontSize: '0.96rem' }}
            >
              Merchant Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-card)',
        padding: '2rem 1.5rem',
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
      }}>
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ReconCopilot</span> — Settlement & GST Reconciliation for Indian Razorpay Merchants.
        </div>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Merchant Sign In</Link>
          <a href="#how-it-works" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>How It Works</a>
          <a href="#features" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Features</a>
        </div>
      </footer>
    </div>
  );
}
