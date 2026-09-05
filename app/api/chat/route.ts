// app/api/chat/route.ts
// Natural-language chat endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { chatWithClaude } from '@/lib/claude';
import type { ChatContext } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 });

  const supabase = createAdminClient();

  try {
    // Get merchant
    const { data: merchants } = await supabase.from('merchants').select('*').limit(1);
    const merchant = merchants?.[0];
    if (!merchant) return NextResponse.json({ reply: 'Pehle demo data load karein (Onboarding page pe jaayen).' });

    const merchantId = merchant.id;

    // Precompute context slices
    const [ordersRes, matchesRes, exceptionsRes, settlementsRes, invoicesRes] = await Promise.all([
      supabase.from('orders').select('id, order_id, amount, order_date').eq('merchant_id', merchantId),
      supabase.from('reconciliation_matches').select('order_id, match_status').eq('merchant_id', merchantId),
      supabase.from('exceptions').select('exception_type, amount_delta, order_id, description').eq('merchant_id', merchantId).eq('resolved', false),
      supabase.from('razorpay_settlements').select('commission, gst_on_commission, settlement_date').eq('merchant_id', merchantId),
      supabase.from('gst_invoices').select('invoice_amount, gst_amount, order_id_linked').eq('merchant_id', merchantId),
    ]);

    const orders = ordersRes.data || [];
    const matches = matchesRes.data || [];
    const exceptions = exceptionsRes.data || [];
    const settlements = settlementsRes.data || [];
    const invoices = invoicesRes.data || [];

    const now = new Date();
    const thisMonth = now.getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

    const commissionThisMonth = settlements
      .filter((s: any) => new Date(s.settlement_date).getMonth() === thisMonth)
      .reduce((sum: number, s: any) => sum + s.commission + s.gst_on_commission, 0);
    const commissionLastMonth = settlements
      .filter((s: any) => new Date(s.settlement_date).getMonth() === lastMonth)
      .reduce((sum: number, s: any) => sum + s.commission + s.gst_on_commission, 0);

    const matchedOrderIds = new Set(matches.filter((m: any) => m.match_status === 'matched').map((m: any) => m.order_id));
    const partialOrderIds = new Set(matches.filter((m: any) => m.match_status === 'partial').map((m: any) => m.order_id));
    const reconciledOrderIds = new Set([...matchedOrderIds, ...partialOrderIds]);

    const unreconciledOrders = orders
      .filter((o: any) => !reconciledOrderIds.has(o.id))
      .map((o: any) => ({ order_id: o.order_id, amount: o.amount, order_date: o.order_date }));

    const exceptionsByType: Record<string, number> = {};
    for (const e of exceptions) {
      exceptionsByType[e.exception_type] = (exceptionsByType[e.exception_type] || 0) + 1;
    }

    const topExceptions = exceptions.slice(0, 5).map((e: any) => ({
      order_id: orders.find((o: any) => o.id === e.order_id)?.order_id || '',
      type: e.exception_type,
      description: e.description,
      amount_delta: e.amount_delta,
    }));

    const totalInvoiceAmount = invoices.reduce((s: number, i: any) => s + i.invoice_amount, 0);
    const totalGstAmount = invoices.reduce((s: number, i: any) => s + i.gst_amount, 0);
    const missingInvoiceCount = exceptions.filter((e: any) => e.exception_type === 'missing_invoice').length;

    const context: ChatContext = {
      totalOrders: orders.length,
      reconciledCount: reconciledOrderIds.size,
      exceptionCount: exceptions.length,
      exceptionsByType,
      commissionThisMonth: parseFloat(commissionThisMonth.toFixed(2)),
      commissionLastMonth: parseFloat(commissionLastMonth.toFixed(2)),
      unreconciledOrders,
      topExceptions,
      gstSummary: {
        totalInvoiceAmount: parseFloat(totalInvoiceAmount.toFixed(2)),
        totalGstAmount: parseFloat(totalGstAmount.toFixed(2)),
        invoiceCount: invoices.length,
        missingCount: missingInvoiceCount,
      },
      currentMonth: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    };

    const reply = await chatWithClaude(message, context);
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('Chat error:', err);
    return NextResponse.json({ reply: 'Sorry, kuch error aaya. Please dobara try karein.' });
  }
}
