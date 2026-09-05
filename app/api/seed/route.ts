// app/api/seed/route.ts
// Seeds the database with demo data

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(): number {
  const amounts = [199, 299, 399, 499, 699, 899, 999, 1299, 1499, 1999, 2499, 2999, 3499, 3999, 4499, 4999];
  return amounts[Math.floor(Math.random() * amounts.length)];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateSettlementId(): string {
  return `setl_${Math.random().toString(36).substring(2, 18).toUpperCase()}`;
}

function generateUTR(): string {
  return `UTR${Date.now()}${randomBetween(100, 999)}`;
}

function generateBankRef(): string {
  return `NEFT${randomBetween(100000000, 999999999)}`;
}

function calcCommission(amount: number, rate = 0.02) {
  const commission = parseFloat((amount * rate).toFixed(2));
  const gstOnCommission = parseFloat((commission * 0.18).toFixed(2));
  const netSettled = parseFloat((amount - commission - gstOnCommission).toFixed(2));
  return { commission, gstOnCommission, netSettled };
}

export async function POST() {
  const supabase = createAdminClient();

  try {
    // Clean existing data
    await supabase.from('exceptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('reconciliation_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('gst_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('bank_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('razorpay_settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('merchants').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Create merchant
    const { data: merchant, error: mErr } = await supabase
      .from('merchants')
      .insert({ name: 'Priya Crafts Store', razorpay_merchant_id: 'acc_PriyaCrafts2025', gstin: '27AABCP1234Q1Z5' })
      .select().single();
    if (mErr || !merchant) return NextResponse.json({ error: 'Merchant creation failed: ' + mErr?.message }, { status: 500 });

    // Generate 80 orders
    const baseDate = new Date('2025-07-01');
    const ordersData: any[] = [];
    for (let i = 0; i < 80; i++) {
      ordersData.push({
        merchant_id: merchant.id,
        order_id: `ORD${String(10000 + i).padStart(5, '0')}`,
        amount: randomAmount(),
        customer_ref: `CUST${randomBetween(1000, 9999)}`,
        order_date: formatDate(addDays(baseDate, randomBetween(0, 61))),
        status: 'completed',
      });
    }
    ordersData.sort((a, b) => a.order_date.localeCompare(b.order_date));

    const { data: orders, error: oErr } = await supabase.from('orders').insert(ordersData).select();
    if (oErr || !orders) return NextResponse.json({ error: 'Orders failed: ' + oErr?.message }, { status: 500 });

    // Split orders: 68 normal, 12 exceptions
    const normalOrders = orders.slice(0, 68);
    const exceptionOrders = orders.slice(68);

    // Generate settlements
    const settlementsData: any[] = [];

    for (const order of normalOrders) {
      const { commission, gstOnCommission, netSettled } = calcCommission(order.amount);
      settlementsData.push({
        merchant_id: merchant.id, settlement_id: generateSettlementId(),
        order_id_linked: order.order_id, gross_amount: order.amount,
        commission, gst_on_commission: gstOnCommission, net_settled_amount: netSettled,
        settlement_date: formatDate(addDays(new Date(order.order_date), randomBetween(2, 5))),
        utr: generateUTR(),
        raw_payload: { type: 'payment', amount: order.amount * 100 },
      });
    }

    // Exception: short settlement (2 orders)
    for (let i = 0; i < 2; i++) {
      const order = exceptionOrders[i];
      const { commission, gstOnCommission, netSettled } = calcCommission(order.amount, 0.03);
      settlementsData.push({
        merchant_id: merchant.id, settlement_id: generateSettlementId(),
        order_id_linked: order.order_id, gross_amount: order.amount,
        commission, gst_on_commission: gstOnCommission, net_settled_amount: netSettled,
        settlement_date: formatDate(addDays(new Date(order.order_date), randomBetween(2, 5))),
        utr: generateUTR(),
        raw_payload: { type: 'payment', amount: order.amount * 100, exception: 'inflated_commission' },
      });
    }

    // Exception: double commission (2 orders)
    for (let i = 2; i < 4; i++) {
      const order = exceptionOrders[i];
      const { commission, gstOnCommission } = calcCommission(order.amount);
      settlementsData.push({
        merchant_id: merchant.id, settlement_id: generateSettlementId(),
        order_id_linked: order.order_id, gross_amount: order.amount,
        commission: commission * 2, gst_on_commission: gstOnCommission * 2,
        net_settled_amount: parseFloat((order.amount - commission * 2 - gstOnCommission * 2).toFixed(2)),
        settlement_date: formatDate(addDays(new Date(order.order_date), randomBetween(2, 5))),
        utr: generateUTR(),
        raw_payload: { type: 'payment', amount: order.amount * 100, exception: 'double_commission' },
      });
    }

    // Exception: missing invoice (2 orders) — settlement exists but no invoice will be created
    for (let i = 4; i < 6; i++) {
      const order = exceptionOrders[i];
      const { commission, gstOnCommission, netSettled } = calcCommission(order.amount);
      settlementsData.push({
        merchant_id: merchant.id, settlement_id: generateSettlementId(),
        order_id_linked: order.order_id, gross_amount: order.amount,
        commission, gst_on_commission: gstOnCommission, net_settled_amount: netSettled,
        settlement_date: formatDate(addDays(new Date(order.order_date), randomBetween(2, 5))),
        utr: generateUTR(),
        raw_payload: { type: 'payment', amount: order.amount * 100, exception: 'missing_invoice_marker' },
      });
    }

    // Exception: timing mismatch (2 orders)
    for (let i = 6; i < 8; i++) {
      const order = exceptionOrders[i];
      const { commission, gstOnCommission, netSettled } = calcCommission(order.amount);
      settlementsData.push({
        merchant_id: merchant.id, settlement_id: generateSettlementId(),
        order_id_linked: order.order_id, gross_amount: order.amount,
        commission, gst_on_commission: gstOnCommission, net_settled_amount: netSettled,
        settlement_date: formatDate(addDays(new Date(order.order_date), randomBetween(8, 12))),
        utr: generateUTR(),
        raw_payload: { type: 'payment', amount: order.amount * 100, exception: 'timing_mismatch' },
      });
    }
    // exceptionOrders[8] and [9] intentionally get NO settlement (unmatched)

    const { data: settlements, error: sErr } = await supabase.from('razorpay_settlements').insert(settlementsData).select();
    if (sErr || !settlements) return NextResponse.json({ error: 'Settlements failed: ' + sErr?.message }, { status: 500 });

    // Generate bank transactions (batched)
    const bankData: any[] = [];
    let si = 0;
    while (si < settlements.length) {
      const batch = settlements.slice(si, si + randomBetween(2, 5));
      const total = batch.reduce((sum, s) => sum + s.net_settled_amount, 0);
      const latestDate = batch.reduce((max, s) => s.settlement_date > max ? s.settlement_date : max, batch[0].settlement_date);
      bankData.push({
        merchant_id: merchant.id, bank_ref: generateBankRef(),
        credit_amount: parseFloat(total.toFixed(2)),
        txn_date: latestDate,
        description: `NEFT CR-RAZORPAY ${batch.map(s => s.utr).join(' ')}`.substring(0, 200),
        matched_settlement_id: null,
      });
      si += batch.length;
    }

    const { data: bankTxns, error: bErr } = await supabase.from('bank_transactions').insert(bankData).select();
    if (bErr || !bankTxns) return NextResponse.json({ error: 'Bank txns failed: ' + bErr?.message }, { status: 500 });

    // Generate GST invoices
    const invoiceData: any[] = [];
    const GST_RATE = 0.18;
    let invIdx = 0;

    for (const order of normalOrders) {
      invoiceData.push({
        merchant_id: merchant.id,
        invoice_number: `INV/2025-26/${String(++invIdx).padStart(4, '0')}`,
        order_id_linked: order.order_id,
        invoice_amount: order.amount,
        invoice_date: order.order_date,
        gst_amount: parseFloat((order.amount * GST_RATE).toFixed(2)),
        hsn_code: '998314', status: 'active',
      });
    }
    // Short settlement + double commission exception orders get invoices
    for (let i = 0; i < 4; i++) {
      const order = exceptionOrders[i];
      invoiceData.push({
        merchant_id: merchant.id,
        invoice_number: `INV/2025-26/${String(++invIdx).padStart(4, '0')}`,
        order_id_linked: order.order_id,
        invoice_amount: order.amount,
        invoice_date: order.order_date,
        gst_amount: parseFloat((order.amount * GST_RATE).toFixed(2)),
        hsn_code: '998314', status: 'active',
      });
    }
    // exceptionOrders[4] & [5]: NO invoice (missing_invoice case)
    // exceptionOrders[6..11]: invoices
    for (let i = 6; i < exceptionOrders.length; i++) {
      const order = exceptionOrders[i];
      invoiceData.push({
        merchant_id: merchant.id,
        invoice_number: `INV/2025-26/${String(++invIdx).padStart(4, '0')}`,
        order_id_linked: order.order_id,
        invoice_amount: order.amount,
        invoice_date: order.order_date,
        gst_amount: parseFloat((order.amount * GST_RATE).toFixed(2)),
        hsn_code: '998314', status: 'active',
      });
    }

    const { data: invoices, error: iErr } = await supabase.from('gst_invoices').insert(invoiceData).select();
    if (iErr || !invoices) return NextResponse.json({ error: 'Invoices failed: ' + iErr?.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      merchant: merchant.name,
      orders: orders.length,
      settlements: settlements.length,
      bankTransactions: bankTxns.length,
      gstInvoices: invoices.length,
      message: 'Demo data loaded! Now call POST /api/reconcile to run reconciliation.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
