// app/sync/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SyncHubPage() {
  const [seeding, setSeeding] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [reconResult, setReconResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const d = await res.json();
          if (d?.totalOrders > 0) {
            setSeedResult({
              orders: d.totalOrders,
              settlements: d.matchedOrders + d.partialOrders + d.exceptionOrders,
              merchant: d.merchant.name,
            });
            if (d.reconciledPct > 0) {
              setReconResult({
                summary: {
                  matched: d.matchedOrders,
                  partial: d.partialOrders,
                  exceptions: d.exceptionOrders,
                  reconciledPct: d.reconciledPct,
                },
              });
            }
          }
        }
      } catch {}
    }
    checkExisting();
  }, []);

  async function handleLoadData() {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to seed demo ledger statement');
        return;
      }
      setSeedResult(data);
    } catch (err: any) {
      setError(err.message || 'Connection error while seeding data');
    } finally {
      setSeeding(false);
    }
  }

  async function handleReconcile() {
    setReconciling(true);
    setError(null);
    try {
      const res = await fetch('/api/reconcile', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to execute reconciliation engine');
        return;
      }
      setReconResult(data);
    } catch (err: any) {
      setError(err.message || 'Error executing reconciliation engine');
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ maxWidth: 760, marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="pill pill-teal">Statement Hub</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Priya Crafts Store • FY 2025-26</span>
        </div>
        <h1 className="page-title">
          Razorpay Settlement & GST Synchronization
        </h1>
        <p className="body-muted" style={{ marginTop: '6px' }}>
          Automate the 3-way reconciliation of payment gateway settlements, current account bank credits, and mandatory GST e-invoices.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--critical-dim)',
          border: '1px solid var(--critical-border)',
          borderRadius: 8,
          fontSize: '13px',
          color: 'var(--critical)',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      {/* 3 Channels Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {/* Channel 1 */}
        <div className="app-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 6,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <rect width="20" height="14" x="2" y="5" rx="2"/>
                <line x1="2" x2="22" y1="10" y2="10"/>
              </svg>
            </div>
            <span className="pill pill-teal">API Feed Active</span>
          </div>

          <h3 className="section-heading" style={{ marginBottom: '6px' }}>
            Razorpay Settlements
          </h3>
          <p className="body-muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
            Captures gross order amounts, 2% standard gateway fee deductions, and 18% GST invoices on service charges.
          </p>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
            Account Ref: <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>acc_PriyaCrafts2025</span>
          </div>
        </div>

        {/* Channel 2 */}
        <div className="app-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 6,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/>
              </svg>
            </div>
            <span className="pill pill-teal">Connected</span>
          </div>

          <h3 className="section-heading" style={{ marginBottom: '6px' }}>
            HDFC Current Account (Bank UTR)
          </h3>
          <p className="body-muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
            Cross-verifies NEFT/RTGS batch settlement reference numbers directly against account statement credits.
          </p>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
            A/C Number: <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>•••• •••• 9012 (HDFC)</span>
          </div>
        </div>

        {/* Channel 3 */}
        <div className="app-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 6,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <span className="pill pill-teal">NIC Portal Sync</span>
          </div>

          <h3 className="section-heading" style={{ marginBottom: '6px' }}>
            GSTR-1 Sales Ledger & Invoices
          </h3>
          <p className="body-muted" style={{ fontSize: '13px', marginBottom: '14px' }}>
            Matches customer sales invoices against payment transactions to ensure complete e-invoicing compliance.
          </p>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
            GSTIN: <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>27AABCP1234Q1Z5</span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="app-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 className="section-heading" style={{ marginBottom: '8px' }}>
          Execute Reconciliation Pipeline
        </h3>
        <p className="body-muted" style={{ fontSize: '13px', marginBottom: '20px', maxWidth: 640 }}>
          Load your statement sources into the database and run the 3-way automated matching engine to detect commission anomalies, timing lags, and invoice gaps.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={handleLoadData}
            disabled={seeding}
            className="btn-secondary"
          >
            {seeding ? 'Ingesting Datasets...' : '1. Ingest Statement Sources'}
          </button>

          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="btn-primary"
          >
            {reconciling ? 'Running Matching Rules...' : '2. Run 3-Way Reconciliation Engine'}
          </button>

          <Link href="/dashboard" className="btn-secondary">
            View Live Dashboard →
          </Link>
        </div>
      </div>

      {/* Pipeline Execution Results */}
      {(seedResult || reconResult) && (
        <div className="app-card">
          <h3 className="section-heading" style={{ marginBottom: '16px' }}>
            Pipeline Execution Telemetry
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {seedResult && (
              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 8, padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ingestion Status</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>✓ Data Synced</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Orders: <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{seedResult.orders || 80}</span></div>
                  <div>Settlements: <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{seedResult.settlements || 76}</span></div>
                  <div>Merchant: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{seedResult.merchant || 'Priya Crafts Store'}</span></div>
                </div>
              </div>
            )}

            {reconResult && (
              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 8, padding: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Audit Verdict</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '8px' }}>
                  {reconResult.summary?.reconciledPct || 86}% Reconciled
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Matched: <span className="font-mono" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{reconResult.summary?.matched}</span></div>
                  <div>Partial / Timing: <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{reconResult.summary?.partial}</span></div>
                  <div>Exceptions: <span className="font-mono" style={{ color: 'var(--warning)', fontWeight: 600 }}>{reconResult.summary?.exceptions}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
