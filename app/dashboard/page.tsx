// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

interface RecentTransaction {
  id: string;
  orderId: string;
  date: string;
  customer: string;
  amount: number;
  netSettled: number | null;
  fee: number | null;
  status: 'matched' | 'exception' | 'partial' | 'unmatched';
  exceptionType: string | null;
  exceptionDesc: string | null;
}

interface DashboardData {
  merchant: { name: string; gstin: string };
  totalOrders: number;
  matchedOrders: number;
  partialOrders: number;
  exceptionOrders: number;
  unmatchedOrders: number;
  reconciledPct: number;
  totalOrderValue: number;
  totalCommission: number;
  totalGstOnCommission: number;
  exceptionsByType: Record<string, number>;
  weeklyData: Array<{ week: string; reconciled: number; exceptions: number; total: number }>;
  recentActivity: RecentTransaction[];
}

const EXCEPTION_LABELS: Record<string, string> = {
  timing_mismatch:   'Timing Mismatch',
  double_commission: 'Double Commission',
  short_settlement:  'Short Settlement',
  missing_invoice:   'Missing Invoice',
  unmatched:         'Unmatched',
};

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function inrInt(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Theme-aware Chart Palettes
  const chartColors = isDark
    ? {
        reconciled: '#3EA88A',
        exceptions: '#D6A03C',
        grid: '#2C2F35',
        axis: '#9A9DA3',
        tooltipBg: '#1E2126',
        tooltipBorder: '#2C2F35',
        tooltipText: '#F2F1EE',
        donutStroke: '#1E2126',
        donutMap: {
          timing_mismatch:   '#D6A03C',
          double_commission: '#DE8939',
          short_settlement:  '#DB6E43',
          missing_invoice:   '#D85D50',
          unmatched:         '#D45D5D',
        } as Record<string, string>,
      }
    : {
        reconciled: '#0F6B5C',
        exceptions: '#B5791C',
        grid: '#E4E0D6',
        axis: '#6B6F76',
        tooltipBg: '#FFFFFF',
        tooltipBorder: '#E4E0D6',
        tooltipText: '#1C1E22',
        donutStroke: '#FFFFFF',
        donutMap: {
          timing_mismatch:   '#B5791C',
          double_commission: '#C46D1E',
          short_settlement:  '#BD5328',
          missing_invoice:   '#B84332',
          unmatched:         '#B23B3B',
        } as Record<string, string>,
      };

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/dashboard');
      if (r.ok) {
        setData(await r.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function rerun() {
    setRunning(true);
    try {
      await fetch('/api/reconcile', { method: 'POST' });
      await load();
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', width: 24, height: 24,
          border: '2px solid var(--border-card)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p className="body-muted" style={{ marginTop: '12px' }}>Loading reconciliation statement...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data || data.totalOrders === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div className="app-card" style={{ padding: '36px 24px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent-border)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z"/>
            </svg>
          </div>
          <h2 className="section-heading" style={{ fontSize: '18px', marginBottom: '8px' }}>
            No Reconciliation Statement Loaded
          </h2>
          <p className="body-muted" style={{ marginBottom: '24px' }}>
            Ingest your Razorpay settlements, bank credits, and GST invoices to generate the reconciliation statement.
          </p>
          <Link href="/sync" className="btn-primary">
            Sync Statement Sources
          </Link>
        </div>
      </div>
    );
  }

  const pieData = Object.entries(data.exceptionsByType || {}).map(([type, count]) => ({
    name: EXCEPTION_LABELS[type] || type,
    type,
    value: count,
  }));

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 24px 64px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', marginBottom: '32px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="pill pill-teal">Reconciliation Statement</span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono' }}>
              GSTIN: {data.merchant.gstin}
            </span>
          </div>
          <h1 className="page-title">
            {data.merchant.name} — Settlement & Tax Ledger
          </h1>
          <p className="body-muted" style={{ marginTop: '4px' }}>
            Cross-referencing Razorpay settlements, HDFC bank credits, and GSTR-1 invoices
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={rerun}
            disabled={running}
            className="btn-secondary"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: running ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
            <span>{running ? 'Reconciling...' : 'Re-run Engine'}</span>
          </button>
          <Link href="/export" className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export GST CSV</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards - Uniform 24px padding, calm borders, Exceptions highlighted via Warning */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {/* Card 1: Gross Sales */}
        <div className="app-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="card-label">Gross Order Book</span>
            <span className="pill pill-neutral font-mono">{data.totalOrders} Orders</span>
          </div>
          <div className="card-metric">
            {inrInt(data.totalOrderValue)}
          </div>
          <p className="body-muted" style={{ fontSize: '13px', marginTop: '8px' }}>
            Total billed sales across channels
          </p>
        </div>

        {/* Card 2: Reconciled Health */}
        <div className="app-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="card-label">Reconciliation Rate</span>
            <span className="pill pill-teal">{data.reconciledPct}% Reconciled</span>
          </div>
          <div className="card-metric">
            {data.matchedOrders + data.partialOrders} <span style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {data.totalOrders}</span>
          </div>
          <div style={{ marginTop: '12px', width: '100%', height: 5, background: 'var(--border-card)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${data.reconciledPct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 3 }} />
          </div>
        </div>

        {/* Card 3: Gateway Fees & Tax */}
        <div className="app-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="card-label">Razorpay Deductions</span>
            <span className="pill pill-neutral font-mono">2% + 18% GST</span>
          </div>
          <div className="card-metric">
            {inrInt(data.totalCommission)}
          </div>
          <p className="body-muted" style={{ fontSize: '13px', marginTop: '8px', color: 'var(--accent-primary)', fontWeight: 500 }}>
            + {inr(data.totalGstOnCommission)} GST (Eligible for ITC)
          </p>
        </div>

        {/* Card 4: Open Exceptions (Distinct visual priority via Warning) */}
        <div className="app-card app-card-amber">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="card-label" style={{ color: 'var(--warning)' }}>Open Exceptions</span>
            <span className="pill pill-amber">{data.exceptionOrders} Flagged</span>
          </div>
          <div className="card-metric" style={{ color: 'var(--warning)' }}>
            {data.exceptionOrders} Items
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
            <span className="body-muted" style={{ fontSize: '13px' }}>Requires review</span>
            <Link href="/exceptions" style={{ fontSize: '13px', color: 'var(--warning)', textDecoration: 'none', fontWeight: 600 }}>
              Resolve Items →
            </Link>
          </div>
        </div>
      </div>

      {/* Middle Grid: Volume Trend Line Chart & Exceptions Donut */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {/* Trend Chart (2 Colors: Ledger Green Reconciled, Muted Amber Exceptions) */}
        <div className="app-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 className="section-heading">
                Reconciliation & Settlement Volume
              </h3>
              <p className="body-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
                Weekly orders matched against Razorpay settlements and bank credits (8-week view)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 8, height: 8, background: chartColors.reconciled, borderRadius: 2 }} /> Reconciled
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 8, height: 8, background: chartColors.exceptions, borderRadius: 2 }} /> Exceptions
              </span>
            </div>
          </div>

          <div style={{ height: 210, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="week" stroke={chartColors.axis} fontSize={11} tickLine={false} />
                <YAxis stroke={chartColors.axis} fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 6,
                    fontSize: 12,
                    color: chartColors.tooltipText,
                    boxShadow: 'var(--card-shadow)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="reconciled"
                  stroke={chartColors.reconciled}
                  strokeWidth={2}
                  fill={chartColors.reconciled}
                  fillOpacity={0.12}
                  name="Reconciled"
                />
                <Area
                  type="monotone"
                  dataKey="exceptions"
                  stroke={chartColors.exceptions}
                  strokeWidth={2}
                  fill={chartColors.exceptions}
                  fillOpacity={0.12}
                  name="Exceptions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exceptions Donut (Tied to severity scale) */}
        <div className="app-card">
          <div style={{ marginBottom: '16px' }}>
            <h3 className="section-heading">
              Root Cause Discrepancy Breakdown
            </h3>
            <p className="body-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
              Categorized by accounting severity
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 140, height: 140, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={`cell-${entry.type}`}
                        fill={chartColors.donutMap[entry.type] || 'var(--text-muted)'}
                        stroke={chartColors.donutStroke}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              {pieData.map((item) => (
                <div key={`legend-${item.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: chartColors.donutMap[item.type] || 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  </div>
                  <span className="font-mono" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 className="section-heading">
              Recent Statement Activity
            </h3>
            <p className="body-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
              Last 10 transactions verified across Order Book, Gateway Deductions, and Bank Credits
            </p>
          </div>
          <Link href="/exceptions" className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
            View Exceptions Register
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="app-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order Ref</th>
                <th>Customer</th>
                <th className="text-right">Gross Amount</th>
                <th className="text-right">Gateway Fee</th>
                <th className="text-right">Net Settled</th>
                <th>Status</th>
                <th>Notes / Root Cause</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {tx.orderId}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {tx.customer}
                    </td>
                    <td className="text-right num-tabular font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {inr(tx.amount)}
                    </td>
                    <td className="text-right num-tabular font-mono" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {tx.fee !== null ? inr(tx.fee) : '—'}
                    </td>
                    <td className="text-right num-tabular font-mono" style={{ color: tx.netSettled ? 'var(--accent-primary)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                      {tx.netSettled !== null ? inr(tx.netSettled) : 'Pending'}
                    </td>
                    <td>
                      {tx.status === 'matched' && <span className="pill pill-teal">Matched</span>}
                      {tx.status === 'exception' && <span className="pill pill-amber">Exception</span>}
                      {tx.status === 'partial' && <span className="pill pill-neutral">Partial</span>}
                      {tx.status === 'unmatched' && <span className="pill pill-red">Unmatched</span>}
                    </td>
                    <td style={{ fontSize: '12px', color: tx.status === 'exception' ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {tx.exceptionDesc || 'Settlement and tax invoice verified.'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                    No recent transaction records found.
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
