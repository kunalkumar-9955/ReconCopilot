// app/api/reconcile/route.ts
// Core reconciliation engine — runs rule-based + LLM-assisted matching

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { runRuleBasedMatching } from '@/lib/matching/rules';
import { llmAssistedMatch } from '@/lib/claude';

export async function POST() {
  const supabase = createAdminClient();

  try {
    // ── Fetch demo merchant ───────────────────────────────────────────────
    const { data: merchants, error: mErr } = await supabase
      .from('merchants')
      .select('*')
      .limit(1);
    if (mErr || !merchants?.length) {
      return NextResponse.json({ error: 'No merchant found. Run /api/seed first.' }, { status: 400 });
    }
    const merchant = merchants[0];

    // ── Clear previous reconciliation results ─────────────────────────────
    await supabase.from('exceptions').delete().eq('merchant_id', merchant.id);
    await supabase.from('reconciliation_matches').delete().eq('merchant_id', merchant.id);

    // ── Fetch all data ────────────────────────────────────────────────────
    const [ordersRes, settlementsRes, bankRes, invoicesRes] = await Promise.all([
      supabase.from('orders').select('*').eq('merchant_id', merchant.id),
      supabase.from('razorpay_settlements').select('*').eq('merchant_id', merchant.id),
      supabase.from('bank_transactions').select('*').eq('merchant_id', merchant.id),
      supabase.from('gst_invoices').select('*').eq('merchant_id', merchant.id),
    ]);

    const orders = ordersRes.data || [];
    const settlements = settlementsRes.data || [];
    const bankTxns = bankRes.data || [];
    const invoices = invoicesRes.data || [];

    console.log(`Running reconciliation: ${orders.length} orders, ${settlements.length} settlements`);

    // ── Rule-based matching ───────────────────────────────────────────────
    const { definiteMatches, ambiguous, unmatched } = runRuleBasedMatching(
      orders,
      settlements,
      bankTxns,
      invoices
    );

    // ── LLM-assisted matching for ambiguous cases ─────────────────────────
    const llmMatches: any[] = [];
    for (const { order, candidates } of ambiguous) {
      console.log(`LLM matching for order ${order.order_id}...`);
      const decision = await llmAssistedMatch(order, candidates);

      const invoice = invoices.find(inv => inv.order_id_linked === order.order_id);
      const settlement = candidates.find(s => s.id === decision.matchedSettlementId);
      const bankTxn = settlement
        ? bankTxns.find(bt => bt.description?.includes(settlement.utr || ''))
        : null;

      llmMatches.push({
        orderId: order.order_id,
        orderDbId: order.id,
        settlementId: decision.matchedSettlementId,
        bankTxnId: bankTxn?.id ?? null,
        invoiceId: invoice?.id ?? null,
        status: decision.exceptionType ? 'exception' : (decision.matchedSettlementId ? 'matched' : 'exception'),
        confidence: decision.confidence,
        method: 'llm',
        exceptionType: decision.exceptionType ?? (decision.matchedSettlementId ? undefined : 'unmatched'),
        exceptionDescription: decision.explanation,
        amountDelta: settlement
          ? parseFloat((settlement.net_settled_amount - order.amount * 0.9764).toFixed(2))
          : 0,
      });
    }

    // ── Handle completely unmatched orders ────────────────────────────────
    const unmatchedResults = unmatched.map(order => ({
      orderId: order.order_id,
      orderDbId: order.id,
      settlementId: null,
      bankTxnId: null,
      invoiceId: null,
      status: 'exception' as const,
      confidence: 0,
      method: 'rule' as const,
      exceptionType: 'unmatched' as const,
      exceptionDescription: `No Razorpay settlement found for order ${order.order_id} (₹${order.amount}). Order may be in a different settlement batch or payment may have failed.`,
      amountDelta: -order.amount,
    }));

    const allResults = [...definiteMatches, ...llmMatches, ...unmatchedResults];

    // ── Write reconciliation_matches ──────────────────────────────────────
    const matchInserts = allResults.map(r => ({
      merchant_id: merchant.id,
      order_id: r.orderDbId,
      settlement_id: r.settlementId,
      bank_txn_id: r.bankTxnId,
      invoice_id: r.invoiceId,
      match_status: r.status,
      match_confidence: r.confidence,
      match_method: r.method,
    }));

    const { data: insertedMatches, error: matchErr } = await supabase
      .from('reconciliation_matches')
      .insert(matchInserts)
      .select();

    if (matchErr) {
      console.error('Match insert error:', matchErr);
      return NextResponse.json({ error: matchErr.message }, { status: 500 });
    }

    // ── Write exceptions ──────────────────────────────────────────────────
    const exceptionInserts: any[] = [];
    for (let i = 0; i < allResults.length; i++) {
      const r = allResults[i];
      if (r.status === 'exception' || r.exceptionType) {
        exceptionInserts.push({
          merchant_id: merchant.id,
          match_id: insertedMatches?.[i]?.id ?? null,
          order_id: r.orderDbId,
          exception_type: r.exceptionType || 'unmatched',
          description: r.exceptionDescription || 'Reconciliation exception',
          amount_delta: r.amountDelta || 0,
          resolved: false,
        });
      }
    }

    if (exceptionInserts.length > 0) {
      const { error: excErr } = await supabase.from('exceptions').insert(exceptionInserts);
      if (excErr) console.error('Exception insert error:', excErr);
    }

    // ── Return summary ────────────────────────────────────────────────────
    const matched = allResults.filter(r => r.status === 'matched').length;
    const partial = allResults.filter(r => r.status === 'partial').length;
    const exceptions = allResults.filter(r => r.status === 'exception').length;

    return NextResponse.json({
      success: true,
      summary: {
        totalOrders: orders.length,
        matched,
        partial,
        exceptions,
        reconciledPct: Math.round(((matched + partial) / orders.length) * 100),
        llmAssisted: llmMatches.length,
      },
    });
  } catch (err: any) {
    console.error('Reconcile error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
