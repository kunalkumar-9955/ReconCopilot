// app/export/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface PreviewRow {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customer: string;
  date: string;
  amount: number;
  gstAmount: number;
  hsnCode: string;
  settlementId: string;
  fee: number;
  commission: number;
  gstOnCommission: number;
  netSettled: number;
  utr: string;
  status: string;
}

interface ExportData {
  total: number;
  summary: {
    totalValue: number;
    totalGst: number;
    totalItc: number;
  };
  rows: PreviewRow[];
}

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function inrInt(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function ExportPage() {
  const [period, setPeriod] = useState('quarter');
  const [statusFilter, setStatusFilter] = useState('all');
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPreview() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?preview=true&status=${statusFilter}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPreview();
  }, [statusFilter]);

  function handleDownload() {
    window.location.href = `/api/export?status=${statusFilter}`;
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 24px 64px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', marginBottom: '28px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="pill pill-teal">Tax Filing & Schedules</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GSTR-1 & GSTR-3B Schedules</span>
          </div>
          <h1 className="page-title">
            GST Audit & Reconciliation Export
          </h1>
          <p className="body-muted" style={{ marginTop: '4px' }}>
            Generate CA-ready CSV exports linking Sales Invoices, Gateway Commission Invoices, and Bank Credits
          </p>
        </div>

        <button
          onClick={handleDownload}
          className="btn-primary"
          style={{ padding: '9px 18px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download Audit CSV</span>
        </button>
      </div>

      {/* Filter and Period Selection Bar */}
      <div className="app-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Period Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Period:</span>
            {[
              { id: 'month', label: 'August 2025' },
              { id: 'quarter', label: 'Q2 FY 2025-26 (Full Quarter)' },
              { id: 'all', label: 'All Transactions' },
            ].map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: '12px',
                    fontWeight: active ? 600 : 500,
                    border: active ? '1px solid var(--accent-border)' : '1px solid var(--border-card)',
                    background: active ? 'var(--accent-dim)' : 'var(--bg-card)',
                    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Match Status:</span>
            {[
              { id: 'all', label: 'All Items' },
              { id: 'matched', label: 'Reconciled Only' },
              { id: 'partial', label: 'Partial Only' },
            ].map((s) => {
              const active = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: '12px',
                    fontWeight: active ? 600 : 500,
                    border: active ? '1px solid var(--accent-border)' : '1px solid var(--border-card)',
                    background: active ? 'var(--accent-dim)' : 'var(--bg-card)',
                    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      {data && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div className="app-card">
            <div className="card-label" style={{ marginBottom: '8px' }}>
              Exportable Transactions
            </div>
            <div className="card-metric font-mono">
              {data.total} Orders
            </div>
            <p className="body-muted" style={{ fontSize: '13px', marginTop: '6px' }}>
              Matched against bank credits & UTRs
            </p>
          </div>

          <div className="app-card">
            <div className="card-label" style={{ marginBottom: '8px' }}>
              Total Taxable Turnover
            </div>
            <div className="card-metric font-mono">
              {inrInt(data.summary.totalValue)}
            </div>
            <p className="body-muted" style={{ fontSize: '13px', marginTop: '6px' }}>
              Eligible for GSTR-1 Section 7 (B2C)
            </p>
          </div>

          <div className="app-card">
            <div className="card-label" style={{ marginBottom: '8px' }}>
              Output GST Liability (18%)
            </div>
            <div className="card-metric font-mono">
              {inrInt(data.summary.totalGst)}
            </div>
            <p className="body-muted" style={{ fontSize: '13px', marginTop: '6px' }}>
              Total GST collected from customers
            </p>
          </div>

          <div className="app-card">
            <div className="card-label" style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>
              Input Tax Credit (ITC) on Fees
            </div>
            <div className="card-metric font-mono" style={{ color: 'var(--accent-primary)' }}>
              {inr(data.summary.totalItc)}
            </div>
            <p className="body-muted" style={{ fontSize: '13px', marginTop: '6px', color: 'var(--accent-primary)', fontWeight: 500 }}>
              Claimable in GSTR-3B Table 4(A)(5)
            </p>
          </div>
        </div>
      )}

      {/* Live Preview Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 className="section-heading">
              Export Schedule Preview ({data?.rows.length || 0} Records)
            </h3>
            <p className="body-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
              Inspect the exact CSV columns before generating files for your chartered accountant
            </p>
          </div>

          <span className="pill pill-neutral font-mono">17 CSV Columns</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="app-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Order Date</th>
                <th className="text-right">Order Amt (₹)</th>
                <th className="text-right">GST on Sale (₹)</th>
                <th className="text-right">Gateway Fee (₹)</th>
                <th className="text-right">Net Settled (₹)</th>
                <th>Bank UTR Ref</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading preview rows...
                  </td>
                </tr>
              ) : data && data.rows.length > 0 ? (
                data.rows.slice(0, 15).map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {row.invoiceNumber}
                    </td>
                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 500 }}>
                      {row.orderId}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {row.customer}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="text-right num-tabular font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {inr(row.amount)}
                    </td>
                    <td className="text-right num-tabular font-mono" style={{ color: 'var(--text-muted)' }}>
                      {inr(row.gstAmount)}
                    </td>
                    <td className="text-right num-tabular font-mono" style={{ color: 'var(--text-muted)' }}>
                      {inr(row.fee)}
                    </td>
                    <td className="text-right num-tabular font-mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {inr(row.netSettled)}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {row.utr || 'Pending'}
                    </td>
                    <td>
                      {row.status === 'matched' ? (
                        <span className="pill pill-teal">Matched</span>
                      ) : (
                        <span className="pill pill-neutral">{row.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                    No exportable transactions found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
