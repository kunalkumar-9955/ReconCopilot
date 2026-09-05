// app/exceptions/page.tsx
'use client';

import { useEffect, useState, Fragment } from 'react';
import Link from 'next/link';

interface ComparisonRecord {
  order: { orderId: string; amount: number; date: string; customer: string };
  settlement: { settlementId: string; grossAmount: number; commission: number; gstOnCommission: number; netSettled: number; date: string; utr: string } | null;
  bank: { bankRef: string; creditAmount: number; date: string; description: string } | null;
  invoice: { invoiceNumber: string; amount: number; gstAmount: number; date: string; hsnCode: string } | null;
}

interface ExceptionItem {
  id: string;
  exception_type: string;
  description: string;
  amount_delta: number;
  resolved: boolean;
  created_at: string;
  order_id_str: string;
  order_amount: number;
  order_date: string;
  customer_ref: string;
  comparison: ComparisonRecord;
}

const TYPE_CONFIG: Record<string, { label: string; pillClass: string }> = {
  double_commission: { label: 'Double Commission', pillClass: 'pill-amber' },
  short_settlement:  { label: 'Short Settlement',  pillClass: 'pill-amber' },
  missing_invoice:   { label: 'Missing Invoice',   pillClass: 'pill-amber' },
  timing_mismatch:   { label: 'Timing Mismatch',   pillClass: 'pill-neutral' },
  unmatched:         { label: 'Unmatched',         pillClass: 'pill-red' },
};

function inr(n: number) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showResolved, setShowResolved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function loadExceptions() {
    setLoading(true);
    try {
      const res = await fetch('/api/exceptions');
      if (res.ok) {
        const data = await res.json();
        setExceptions(data.exceptions || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExceptions();
  }, []);

  async function handleResolve(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setResolvingId(id);
    try {
      const res = await fetch(`/api/exceptions/${id}/resolve`, { method: 'PATCH' });
      if (res.ok) {
        setExceptions(prev =>
          prev.map(item => (item.id === id ? { ...item, resolved: true } : item))
        );
      }
    } finally {
      setResolvingId(null);
    }
  }

  const filtered = exceptions.filter(item => {
    if (!showResolved && item.resolved) return false;
    if (filterType !== 'all' && item.exception_type !== filterType) return false;
    return true;
  });

  const openCount = exceptions.filter(e => !e.resolved).length;
  const resolvedCount = exceptions.filter(e => e.resolved).length;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 24px 64px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', marginBottom: '28px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="pill pill-amber">Audit Register</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {openCount} Open Exceptions Requiring Review
            </span>
          </div>
          <h1 className="page-title">
            Exceptions & Discrepancy Ledger
          </h1>
          <p className="body-muted" style={{ marginTop: '4px' }}>
            Flagged variations across Order Book, Razorpay Deductions, Bank UTR Credits, and GST Invoices
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="btn-secondary"
            style={{ fontSize: '13px' }}
          >
            {showResolved ? 'Hide Resolved' : `Show Resolved (${resolvedCount})`}
          </button>
          <Link href="/chat" className="btn-primary" style={{ fontSize: '13px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Ask AI Copilot</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px',
      }}>
        {[
          { key: 'all', label: `All (${exceptions.length})` },
          { key: 'double_commission', label: 'Double Commission' },
          { key: 'short_settlement', label: 'Short Settlement' },
          { key: 'missing_invoice', label: 'Missing Invoice' },
          { key: 'timing_mismatch', label: 'Timing Mismatch' },
          { key: 'unmatched', label: 'Unmatched' },
        ].map(({ key, label }) => {
          const active = filterType === key;
          return (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                border: active ? '1px solid var(--accent-border)' : '1px solid var(--border-card)',
                background: active ? 'var(--accent-dim)' : 'var(--bg-card)',
                color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Exceptions Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Loading exceptions...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <p style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>No exceptions in this filter</p>
            <p className="body-muted" style={{ fontSize: '13px', marginTop: 4 }}>All records in this category are clear.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="app-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Order ID</th>
                  <th style={{ width: 100 }}>Order Date</th>
                  <th style={{ width: 160 }}>Exception Type</th>
                  <th className="text-right" style={{ width: 120 }}>Discrepancy</th>
                  <th>Root Cause Analysis</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 90, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const isExpanded = expandedId === item.id;
                  const cfg = TYPE_CONFIG[item.exception_type] || { label: item.exception_type, pillClass: 'pill-neutral' };
                  const sign = item.amount_delta > 0 ? '+' : item.amount_delta < 0 ? '-' : '';

                  return (
                    <Fragment key={item.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        style={{
                          cursor: 'pointer',
                          background: isExpanded ? 'var(--bg-hover)' : 'transparent',
                        }}
                      >
                        <td className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          {item.order_id_str}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                          {item.order_date ? new Date(item.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                        <td>
                          <span className={`pill ${cfg.pillClass}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="text-right font-mono num-tabular" style={{
                          fontWeight: 600,
                          color: item.amount_delta < 0 ? 'var(--critical)' : item.amount_delta > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                        }}>
                          {item.amount_delta !== 0 ? `${sign}${inr(item.amount_delta)}` : 'Timing Ref'}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--text-primary)', maxWidth: 360 }}>
                          {item.description}
                        </td>
                        <td>
                          {item.resolved ? (
                            <span className="pill pill-teal">Resolved</span>
                          ) : (
                            <span className="pill pill-amber">Open</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            {isExpanded ? 'Hide ↑' : 'Inspect ↓'}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable 4-Way Audit Drawer */}
                      {isExpanded && (
                        <tr style={{ background: 'var(--bg-subtle)' }}>
                          <td colSpan={7} style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-card)' }}>
                            <div style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-card)',
                              borderRadius: 8,
                              padding: '20px',
                              boxShadow: 'var(--card-shadow)',
                            }}>
                              {/* Root Cause Banner */}
                              <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                                padding: '12px 16px',
                                background: 'var(--warning-dim)',
                                border: '1px solid var(--warning-border)',
                                borderRadius: 6,
                                marginBottom: '20px',
                              }}>
                                <div style={{ color: 'var(--warning)', marginTop: 1 }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                  </svg>
                                </div>
                                <div>
                                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)' }}>
                                    Audit Diagnostic Root-Cause
                                  </p>
                                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.45 }}>
                                    {item.description}
                                  </p>
                                </div>
                              </div>

                              {/* 4-Way Comparative Grid */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '12px',
                                marginBottom: '20px',
                              }}>
                                {/* Box 1 */}
                                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 6, padding: '12px 14px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    1. Order Record (Store)
                                  </div>
                                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Ref:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.comparison.order.orderId}</span></div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Amount:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inr(item.comparison.order.amount)}</span></div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Customer:</span> <span style={{ color: 'var(--text-primary)' }}>{item.comparison.order.customer}</span></div>
                                    <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <span style={{ color: 'var(--text-muted)' }}>{item.comparison.order.date}</span></div>
                                  </div>
                                </div>

                                {/* Box 2 */}
                                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 6, padding: '12px 14px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    2. Razorpay Settlement
                                  </div>
                                  {item.comparison.settlement ? (
                                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <div><span style={{ color: 'var(--text-muted)' }}>ID:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.comparison.settlement.settlementId}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Fee:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inr(item.comparison.settlement.commission + item.comparison.settlement.gstOnCommission)}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Net Settled:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inr(item.comparison.settlement.netSettled)}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>UTR:</span> <span className="font-mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{item.comparison.settlement.utr}</span></div>
                                    </div>
                                  ) : (
                                    <div style={{ color: 'var(--critical)', fontSize: '12px' }}>Missing settlement record in feed</div>
                                  )}
                                </div>

                                {/* Box 3 */}
                                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 6, padding: '12px 14px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    3. Bank Account Credit
                                  </div>
                                  {item.comparison.bank ? (
                                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Bank Ref:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.comparison.bank.bankRef}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Credit Amt:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inr(item.comparison.bank.creditAmount)}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <span style={{ color: 'var(--text-muted)' }}>{item.comparison.bank.date}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Txn:</span> <span style={{ color: 'var(--text-primary)' }}>{item.comparison.bank.description}</span></div>
                                    </div>
                                  ) : (
                                    <div style={{ color: 'var(--critical)', fontSize: '12px' }}>No bank credit record found</div>
                                  )}
                                </div>

                                {/* Box 4 */}
                                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-card)', borderRadius: 6, padding: '12px 14px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    4. GST e-Invoice
                                  </div>
                                  {item.comparison.invoice ? (
                                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Inv No:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.comparison.invoice.invoiceNumber}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>Taxable:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inr(item.comparison.invoice.amount)}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>GST:</span> <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inr(item.comparison.invoice.gstAmount)}</span></div>
                                      <div><span style={{ color: 'var(--text-muted)' }}>HSN:</span> <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{item.comparison.invoice.hsnCode}</span></div>
                                    </div>
                                  ) : (
                                    <div style={{ color: 'var(--critical)', fontSize: '12px' }}>Missing GST e-invoice entry</div>
                                  )}
                                </div>
                              </div>

                              {/* Drawer Footer Actions */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                <Link
                                  href={`/chat?q=${encodeURIComponent(`Why was order ${item.order_id_str} flagged for ${item.exception_type}?`)}`}
                                  className="btn-secondary"
                                  style={{ fontSize: '12px', padding: '6px 12px' }}
                                >
                                  Ask AI Copilot
                                </Link>

                                {!item.resolved ? (
                                  <button
                                    onClick={(e) => handleResolve(item.id, e)}
                                    disabled={resolvingId === item.id}
                                    className="btn-primary"
                                    style={{ fontSize: '12px', padding: '6px 14px' }}
                                  >
                                    {resolvingId === item.id ? 'Marking...' : 'Mark as Resolved'}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                    ✓ Marked as Resolved
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
