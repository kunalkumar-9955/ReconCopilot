// app/api/dashboard/route.ts
// Dashboard data aggregation endpoint
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createAdminClient();

  try {
    const { data: merchants } = await supabase.from('merchants').select('*').limit(1);
    const merchant = merchants?.[0];
    if (!merchant) return NextResponse.json(null);

    const merchantId = merchant.id;

    const [ordersRes, matchesRes, settlementsRes, exceptionsRes, recentOrdersRes] = await Promise.all([
      supabase.from('orders').select('id, amount, order_date').eq('merchant_id', merchantId),
      supabase.from('reconciliation_matches').select('order_id, settlement_id, match_status').eq('merchant_id', merchantId),
      supabase.from('razorpay_settlements').select('id, commission, gst_on_commission, settlement_date, net_settled_amount').eq('merchant_id', merchantId),
      supabase.from('exceptions').select('id, exception_type, order_id, amount_delta, description').eq('merchant_id', merchantId).eq('resolved', false),
      supabase.from('orders').select('id, order_id, amount, customer_ref, order_date').eq('merchant_id', merchantId).order('order_date', { ascending: false }).limit(10),
    ]);

    const orders: any[] = ordersRes.data || [];
    const matches: any[] = matchesRes.data || [];
    const settlements: any[] = settlementsRes.data || [];
    const exceptions: any[] = exceptionsRes.data || [];
    const recentOrders: any[] = recentOrdersRes.data || [];

    const matched = matches.filter(m => m.match_status === 'matched').length;
    const partial = matches.filter(m => m.match_status === 'partial').length;
    const exceptionCount = exceptions.length;
    const unmatchedCount = Math.max(0, orders.length - matches.length);

    const totalOrderValue = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const totalCommission = settlements.reduce((s, st) => s + (Number(st.commission) || 0), 0);
    const totalGstOnCommission = settlements.reduce((s, st) => s + (Number(st.gst_on_commission) || 0), 0);

    const exceptionsByType: Record<string, number> = {};
    for (const e of exceptions) {
      exceptionsByType[e.exception_type] = (exceptionsByType[e.exception_type] || 0) + 1;
    }

    // Map settlements by id for fast lookup
    const settlementMap = new Map(settlements.map(s => [s.id, s]));
    const matchMap = new Map(matches.map(m => [m.order_id, m]));
    const exceptionMap = new Map(exceptions.map(e => [e.order_id, e]));

    // Construct recent activity ledger
    const recentActivity = recentOrders.map(o => {
      const match = matchMap.get(o.id);
      const ex = exceptionMap.get(o.id);
      const st = match?.settlement_id ? settlementMap.get(match.settlement_id) : null;

      let status = 'unmatched';
      if (ex) {
        status = 'exception';
      } else if (match?.match_status === 'matched') {
        status = 'matched';
      } else if (match?.match_status === 'partial') {
        status = 'partial';
      }

      return {
        id: o.id,
        orderId: o.order_id,
        date: o.order_date,
        customer: o.customer_ref || 'Customer',
        amount: Number(o.amount) || 0,
        netSettled: st ? Number(st.net_settled_amount) || 0 : null,
        fee: st ? (Number(st.commission) + Number(st.gst_on_commission)) : null,
        status,
        exceptionType: ex?.exception_type || null,
        exceptionDesc: ex?.description || null,
      };
    });

    // Weekly data for area chart (last 8 weeks)
    const weeklyData: any[] = [];
    const now = new Date('2025-09-01'); // reference demo date
    for (let w = 7; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekLabel = `${weekStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;

      const weekOrders = orders.filter(o => {
        const d = new Date(o.order_date);
        return d >= weekStart && d < weekEnd;
      });

      const weekOrderIds = new Set(weekOrders.map(o => o.id));
      const weekMatches = matches.filter(m => weekOrderIds.has(m.order_id));
      const weekReconciled = weekMatches.filter(m => m.match_status === 'matched' || m.match_status === 'partial').length;
      const weekExceptions = weekMatches.filter(m => m.match_status === 'exception').length;

      weeklyData.push({
        week: weekLabel,
        reconciled: weekReconciled,
        exceptions: weekExceptions,
        total: weekOrders.length,
      });
    }

    const reconciledPct = orders.length > 0
      ? Math.round(((matched + partial) / orders.length) * 100)
      : 0;

    return NextResponse.json({
      merchant: { name: merchant.name, gstin: merchant.gstin },
      totalOrders: orders.length,
      matchedOrders: matched,
      partialOrders: partial,
      exceptionOrders: exceptionCount,
      unmatchedOrders: unmatchedCount,
      reconciledPct,
      totalOrderValue: parseFloat(totalOrderValue.toFixed(2)),
      totalCommission: parseFloat(totalCommission.toFixed(2)),
      totalGstOnCommission: parseFloat(totalGstOnCommission.toFixed(2)),
      exceptionsByType,
      weeklyData,
      recentActivity,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
