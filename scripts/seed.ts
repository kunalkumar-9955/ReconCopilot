// scripts/seed.ts
// Run with: npx ts-node --project tsconfig.seed.json scripts/seed.ts
// Or: npx tsx scripts/seed.ts
//
// Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function generateOrderId(index: number): string {
  return `ORD${String(10000 + index).padStart(5, '0')}`;
}

function generateSettlementId(index: number): string {
  return `setl_${Math.random().toString(36).substring(2, 18).toUpperCase()}`;
}

function generateUTR(): string {
  return `UTR${Date.now()}${randomBetween(100, 999)}`;
}

function generateBankRef(): string {
  return `NEFT${randomBetween(100000000, 999999999)}`;
}

function generateInvoiceNumber(index: number): string {
  return `INV/2025-26/${String(index + 1).padStart(4, '0')}`;
}

// Standard Razorpay commission rate: 2% + 18% GST on commission
function calcCommission(amount: number, rate = 0.02) {
  const commission = parseFloat((amount * rate).toFixed(2));
  const gstOnCommission = parseFloat((commission * 0.18).toFixed(2));
  const netSettled = parseFloat((amount - commission - gstOnCommission).toFixed(2));
  return { commission, gstOnCommission, netSettled };
}

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await supabase.from('exceptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reconciliation_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gst_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('bank_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('razorpay_settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('merchants').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // ─── Create Merchant ─────────────────────────────────────────────────────
  console.log('👤 Creating merchant...');
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .insert({
      name: 'Priya Crafts Store',
      razorpay_merchant_id: 'acc_PriyaCrafts2025',
      gstin: '27AABCP1234Q1Z5',
    })
    .select()
    .single();

  if (merchantError || !merchant) {
    console.error('Failed to create merchant:', merchantError);
    process.exit(1);
  }
  console.log('✅ Merchant created:', merchant.id);

  // ─── Generate Orders ─────────────────────────────────────────────────────
  console.log('📦 Generating 80 orders...');

  const baseDate = new Date('2025-07-01');
  const orders: any[] = [];

  for (let i = 0; i < 80; i++) {
    const daysOffset = randomBetween(0, 61); // July + August = 62 days
    const orderDate = addDays(baseDate, daysOffset);
    const amount = randomAmount();

    orders.push({
      merchant_id: merchant.id,
      order_id: generateOrderId(i),
      amount,
      customer_ref: `CUST${randomBetween(1000, 9999)}`,
      order_date: formatDate(orderDate),
      status: 'completed',
    });
  }

  // Sort by date
  orders.sort((a, b) => a.order_date.localeCompare(b.order_date));

  const { data: insertedOrders, error: ordersError } = await supabase
    .from('orders')
    .insert(orders)
    .select();

  if (ordersError || !insertedOrders) {
    console.error('Failed to insert orders:', ordersError);
    process.exit(1);
  }
  console.log(`✅ Inserted ${insertedOrders.length} orders`);

  // ─── Generate Settlements ─────────────────────────────────────────────────
  // 68 "normal" orders → clean settlements
  // 10 orders → exception cases (injected deliberately)
  console.log('💳 Generating settlements with deliberate exceptions...');

  const normalOrders = insertedOrders.slice(0, 68);
  const exceptionOrders = insertedOrders.slice(68); // last 12 for exceptions

  const settlements: any[] = [];

  // Normal settlements (68 orders)
  for (const order of normalOrders) {
    const orderDate = new Date(order.order_date);
    const settlementDate = addDays(orderDate, randomBetween(2, 5)); // T+2 to T+5
    const { commission, gstOnCommission, netSettled } = calcCommission(order.amount);

    settlements.push({
      merchant_id: merchant.id,
      settlement_id: generateSettlementId(settlements.length),
      order_id_linked: order.order_id,
      gross_amount: order.amount,
      commission,
      gst_on_commission: gstOnCommission,
      net_settled_amount: netSettled,
      settlement_date: formatDate(settlementDate),
      utr: generateUTR(),
      raw_payload: {
        entity_id: `pay_${Math.random().toString(36).substring(2, 16)}`,
        type: 'payment',
        amount: order.amount * 100, // paise
        currency: 'INR',
        fee: commission * 100,
        tax: gstOnCommission * 100,
        settled: true,
      },
    });
  }

  // Exception 1 & 2: Short settlement (commission charged at 3% instead of 2%)
  for (let i = 0; i < 2; i++) {
    const order = exceptionOrders[i];
    const orderDate = new Date(order.order_date);
    const settlementDate = addDays(orderDate, randomBetween(2, 5));
    const { commission, gstOnCommission, netSettled } = calcCommission(order.amount, 0.03); // 3% rate!

    settlements.push({
      merchant_id: merchant.id,
      settlement_id: generateSettlementId(settlements.length),
      order_id_linked: order.order_id,
      gross_amount: order.amount,
      commission,
      gst_on_commission: gstOnCommission,
      net_settled_amount: netSettled,
      settlement_date: formatDate(settlementDate),
      utr: generateUTR(),
      raw_payload: { type: 'payment', amount: order.amount * 100, fee: commission * 100, exception: 'inflated_commission' },
    });
  }

  // Exception 3 & 4: Double commission cut (deducted twice)
  for (let i = 2; i < 4; i++) {
    const order = exceptionOrders[i];
    const orderDate = new Date(order.order_date);
    const settlementDate = addDays(orderDate, randomBetween(2, 5));
    const { commission, gstOnCommission } = calcCommission(order.amount);
    const doubleCommission = commission * 2;
    const doubleGst = gstOnCommission * 2;
    const netSettled = parseFloat((order.amount - doubleCommission - doubleGst).toFixed(2));

    settlements.push({
      merchant_id: merchant.id,
      settlement_id: generateSettlementId(settlements.length),
      order_id_linked: order.order_id,
      gross_amount: order.amount,
      commission: doubleCommission,
      gst_on_commission: doubleGst,
      net_settled_amount: netSettled,
      settlement_date: formatDate(settlementDate),
      utr: generateUTR(),
      raw_payload: { type: 'payment', amount: order.amount * 100, fee: doubleCommission * 100, exception: 'double_commission' },
    });
  }

  // Exception 5 & 6: Missing invoice (settlement is normal, but we won't create GST invoice)
  for (let i = 4; i < 6; i++) {
    const order = exceptionOrders[i];
    const orderDate = new Date(order.order_date);
    const settlementDate = addDays(orderDate, randomBetween(2, 5));
    const { commission, gstOnCommission, netSettled } = calcCommission(order.amount);

    settlements.push({
      merchant_id: merchant.id,
      settlement_id: generateSettlementId(settlements.length),
      order_id_linked: order.order_id,
      gross_amount: order.amount,
      commission,
      gst_on_commission: gstOnCommission,
      net_settled_amount: netSettled,
      settlement_date: formatDate(settlementDate),
      utr: generateUTR(),
      raw_payload: { type: 'payment', amount: order.amount * 100, exception: 'missing_invoice_marker' },
    });
  }

  // Exception 7 & 8: Timing mismatch (settlement arrives T+8 instead of T+2–5)
  for (let i = 6; i < 8; i++) {
    const order = exceptionOrders[i];
    const orderDate = new Date(order.order_date);
    const settlementDate = addDays(orderDate, randomBetween(8, 12)); // too late!
    const { commission, gstOnCommission, netSettled } = calcCommission(order.amount);

    settlements.push({
      merchant_id: merchant.id,
      settlement_id: generateSettlementId(settlements.length),
      order_id_linked: order.order_id,
      gross_amount: order.amount,
      commission,
      gst_on_commission: gstOnCommission,
      net_settled_amount: netSettled,
      settlement_date: formatDate(settlementDate),
      utr: generateUTR(),
      raw_payload: { type: 'payment', amount: order.amount * 100, exception: 'timing_mismatch' },
    });
  }

  // Exception 9 & 10: Unmatched (no settlement created for these orders at all)
  // exceptionOrders[8] and exceptionOrders[9] intentionally get no settlement

  const { data: insertedSettlements, error: settlError } = await supabase
    .from('razorpay_settlements')
    .insert(settlements)
    .select();

  if (settlError || !insertedSettlements) {
    console.error('Failed to insert settlements:', settlError);
    process.exit(1);
  }
  console.log(`✅ Inserted ${insertedSettlements.length} settlements`);

  // ─── Bank Transactions ────────────────────────────────────────────────────
  // Group settlements into batched bank credits (every 3–5 settlements → 1 bank credit)
  console.log('🏦 Generating bank transactions (batched credits)...');

  const bankTxns: any[] = [];
  let i = 0;
  while (i < insertedSettlements.length) {
    const batchSize = randomBetween(2, 5);
    const batch = insertedSettlements.slice(i, i + batchSize);
    const totalCredit = batch.reduce((sum, s) => sum + s.net_settled_amount, 0);
    const latestDate = batch.reduce((max, s) => s.settlement_date > max ? s.settlement_date : max, batch[0].settlement_date);

    bankTxns.push({
      merchant_id: merchant.id,
      bank_ref: generateBankRef(),
      credit_amount: parseFloat(totalCredit.toFixed(2)),
      txn_date: latestDate,
      description: `NEFT CR-RAZORPAY SETTLEMENTS ${batch.map(s => s.utr).join(' ')}`.substring(0, 200),
      matched_settlement_id: null,
    });

    i += batchSize;
  }

  const { data: insertedBankTxns, error: bankError } = await supabase
    .from('bank_transactions')
    .insert(bankTxns)
    .select();

  if (bankError || !insertedBankTxns) {
    console.error('Failed to insert bank transactions:', bankError);
    process.exit(1);
  }
  console.log(`✅ Inserted ${insertedBankTxns.length} bank transactions`);

  // ─── GST Invoices ─────────────────────────────────────────────────────────
  // Create invoices for all normal orders + exception orders 5,6 skipped (missing_invoice)
  console.log('🧾 Generating GST invoices...');

  const gstInvoices: any[] = [];
  const GST_RATE = 0.18;

  // Normal orders get invoices
  for (let idx = 0; idx < normalOrders.length; idx++) {
    const order = normalOrders[idx];
    const gstAmount = parseFloat((order.amount * GST_RATE).toFixed(2));

    gstInvoices.push({
      merchant_id: merchant.id,
      invoice_number: generateInvoiceNumber(idx),
      order_id_linked: order.order_id,
      invoice_amount: order.amount,
      invoice_date: order.order_date,
      gst_amount: gstAmount,
      hsn_code: '998314',
      status: 'active',
    });
  }

  // Exception orders 0–3 (short settlement, double commission) also get invoices
  for (let idx = 0; idx < 4; idx++) {
    const order = exceptionOrders[idx];
    const gstAmount = parseFloat((order.amount * GST_RATE).toFixed(2));
    gstInvoices.push({
      merchant_id: merchant.id,
      invoice_number: generateInvoiceNumber(normalOrders.length + idx),
      order_id_linked: order.order_id,
      invoice_amount: order.amount,
      invoice_date: order.order_date,
      gst_amount: gstAmount,
      hsn_code: '998314',
      status: 'active',
    });
  }

  // exceptionOrders[4] and [5] → NO invoice (missing_invoice exception)
  // exceptionOrders[6], [7] → invoices for timing mismatch orders
  for (let idx = 6; idx < exceptionOrders.length; idx++) {
    const order = exceptionOrders[idx];
    const gstAmount = parseFloat((order.amount * GST_RATE).toFixed(2));
    gstInvoices.push({
      merchant_id: merchant.id,
      invoice_number: generateInvoiceNumber(normalOrders.length + idx),
      order_id_linked: order.order_id,
      invoice_amount: order.amount,
      invoice_date: order.order_date,
      gst_amount: gstAmount,
      hsn_code: '998314',
      status: 'active',
    });
  }

  const { data: insertedInvoices, error: invoiceError } = await supabase
    .from('gst_invoices')
    .insert(gstInvoices)
    .select();

  if (invoiceError || !insertedInvoices) {
    console.error('Failed to insert GST invoices:', invoiceError);
    process.exit(1);
  }
  console.log(`✅ Inserted ${insertedInvoices.length} GST invoices`);

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!');
  console.log(`  Merchant:           ${merchant.name}`);
  console.log(`  Orders:             ${insertedOrders.length}`);
  console.log(`  Settlements:        ${insertedSettlements.length}`);
  console.log(`  Bank Transactions:  ${insertedBankTxns.length}`);
  console.log(`  GST Invoices:       ${insertedInvoices.length}`);
  console.log('\n  Exceptions seeded:');
  console.log('  - 2× Short settlement (3% commission charged instead of 2%)');
  console.log('  - 2× Double commission (fee deducted twice)');
  console.log('  - 2× Missing GST invoice');
  console.log('  - 2× Timing mismatch (T+8 instead of T+2–5)');
  console.log('  - 2× Unmatched orders (no settlement)');
  console.log('\n  Run reconciliation now: POST /api/reconcile');
}

seed().catch(console.error);
