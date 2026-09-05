// app/api/exceptions/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createAdminClient();

  try {
    const { data: merchants } = await supabase.from('merchants').select('*').limit(1);
    const merchant = merchants?.[0];
    if (!merchant) return NextResponse.json({ exceptions: [] });

    const merchantId = merchant.id;

    // Fetch exceptions, matches, settlements, bank txns, and gst invoices
    const [exceptionsRes, matchesRes, settlementsRes, bankTxnsRes, invoicesRes] = await Promise.all([
      supabase
        .from('exceptions')
        .select(`
          id, exception_type, description, amount_delta, resolved, created_at, order_id, match_id,
          orders(id, order_id, amount, customer_ref, order_date)
        `)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false }),
      supabase.from('reconciliation_matches').select('*').eq('merchant_id', merchantId),
      supabase.from('razorpay_settlements').select('*').eq('merchant_id', merchantId),
      supabase.from('bank_transactions').select('*').eq('merchant_id', merchantId),
      supabase.from('gst_invoices').select('*').eq('merchant_id', merchantId),
    ]);

    const exceptions: any[] = exceptionsRes.data || [];
    const matches: any[] = matchesRes.data || [];
    const settlements: any[] = settlementsRes.data || [];
    const bankTxns: any[] = bankTxnsRes.data || [];
    const invoices: any[] = invoicesRes.data || [];

    const settlementById = new Map(settlements.map(s => [s.id, s]));
    const settlementByOrder = new Map(settlements.map(s => [s.order_id_linked, s]));
    const bankTxnById = new Map(bankTxns.map(b => [b.id, b]));
    const invoiceByOrder = new Map(invoices.map(i => [i.order_id_linked, i]));
    const matchByOrderId = new Map(matches.map(m => [m.order_id, m]));

    const enriched = exceptions.map((e: any) => {
      const order = e.orders;
      const orderId = order?.order_id;
      const match = e.order_id ? matchByOrderId.get(e.order_id) : null;

      // Settlement record
      const settlement = match?.settlement_id
        ? settlementById.get(match.settlement_id)
        : (orderId ? settlementByOrder.get(orderId) : null);

      // Bank transaction
      const bankTxn = match?.bank_txn_id
        ? bankTxnById.get(match.bank_txn_id)
        : (settlement?.utr ? bankTxns.find(b => b.bank_ref === settlement.utr || b.description?.includes(settlement.utr)) : null);

      // GST Invoice
      const invoice = orderId ? invoiceByOrder.get(orderId) : null;

      return {
        id: e.id,
        exception_type: e.exception_type,
        description: e.description,
        amount_delta: Number(e.amount_delta) || 0,
        resolved: Boolean(e.resolved),
        created_at: e.created_at,
        order_id_str: order?.order_id || 'N/A',
        order_amount: Number(order?.amount) || 0,
        order_date: order?.order_date || '',
        customer_ref: order?.customer_ref || 'Customer',
        comparison: {
          order: {
            orderId: order?.order_id || '—',
            amount: Number(order?.amount) || 0,
            date: order?.order_date || '—',
            customer: order?.customer_ref || '—',
          },
          settlement: settlement ? {
            settlementId: settlement.settlement_id,
            grossAmount: Number(settlement.gross_amount),
            commission: Number(settlement.commission),
            gstOnCommission: Number(settlement.gst_on_commission),
            netSettled: Number(settlement.net_settled_amount),
            date: settlement.settlement_date,
            utr: settlement.utr,
          } : null,
          bank: bankTxn ? {
            bankRef: bankTxn.bank_ref,
            creditAmount: Number(bankTxn.credit_amount),
            date: bankTxn.txn_date,
            description: bankTxn.description,
          } : null,
          invoice: invoice ? {
            invoiceNumber: invoice.invoice_number,
            amount: Number(invoice.invoice_amount),
            gstAmount: Number(invoice.gst_amount),
            date: invoice.invoice_date,
            hsnCode: invoice.hsn_code,
          } : null,
        },
      };
    });

    return NextResponse.json({ exceptions: enriched });
  } catch (err: any) {
    return NextResponse.json({ exceptions: [], error: err.message }, { status: 500 });
  }
}
