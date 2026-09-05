// app/api/export/route.ts
// GST-ready CSV and Preview export
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const searchParams = req.nextUrl.searchParams;
  const isPreview = searchParams.get('preview') === 'true';
  const filterStatus = searchParams.get('status') || 'all';

  try {
    const { data: merchants } = await supabase.from('merchants').select('*').limit(1);
    const merchant = merchants?.[0];
    if (!merchant) return NextResponse.json({ error: 'No merchant found' }, { status: 400 });

    // Fetch reconciliation data with joins
    let query = supabase
      .from('reconciliation_matches')
      .select(`
        id, match_status, match_confidence,
        orders!inner(order_id, amount, order_date, customer_ref),
        razorpay_settlements(settlement_id, gross_amount, commission, gst_on_commission, net_settled_amount, settlement_date, utr),
        bank_transactions(bank_ref, credit_amount, txn_date),
        gst_invoices(invoice_number, invoice_amount, invoice_date, gst_amount, hsn_code)
      `)
      .eq('merchant_id', merchant.id)
      .order('id');

    if (filterStatus !== 'all') {
      query = query.eq('match_status', filterStatus);
    }

    const { data: matches, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items = matches || [];

    // If client requested JSON preview
    if (isPreview) {
      const previewRows = items.map((m: any) => {
        const order = m.orders;
        const settlement = m.razorpay_settlements;
        const bank = m.bank_transactions;
        const invoice = m.gst_invoices;

        return {
          id: m.id,
          invoiceNumber: invoice?.invoice_number || 'Pending',
          orderId: order?.order_id || '—',
          customer: order?.customer_ref || 'Customer',
          date: order?.order_date || '—',
          amount: Number(order?.amount) || 0,
          gstAmount: Number(invoice?.gst_amount) || 0,
          hsnCode: invoice?.hsn_code || '998314',
          settlementId: settlement?.settlement_id || '—',
          fee: settlement ? Number(settlement.commission) + Number(settlement.gst_on_commission) : 0,
          commission: Number(settlement?.commission) || 0,
          gstOnCommission: Number(settlement?.gst_on_commission) || 0,
          netSettled: Number(settlement?.net_settled_amount) || 0,
          utr: settlement?.utr || bank?.bank_ref || '—',
          status: m.match_status,
        };
      });

      const totalValue = previewRows.reduce((s, r) => s + r.amount, 0);
      const totalGst = previewRows.reduce((s, r) => s + r.gstAmount, 0);
      const totalItc = previewRows.reduce((s, r) => s + r.gstOnCommission, 0);

      return NextResponse.json({
        total: previewRows.length,
        summary: {
          totalValue,
          totalGst,
          totalItc,
        },
        rows: previewRows,
      });
    }

    // Build CSV
    const headers = [
      'Invoice Number', 'Order ID', 'Customer Ref', 'Order Date',
      'Order Amount (₹)', 'GST on Sale (₹)', 'HSN Code',
      'Settlement ID', 'Commission (₹)', 'GST on Commission (₹)',
      'Net Settled (₹)', 'Settlement Date',
      'Bank Ref / UTR', 'Bank Credit (₹)', 'Bank Credit Date',
      'Match Status', 'Confidence',
    ];

    const rows: string[][] = [headers];

    for (const m of items) {
      const order = m.orders as any;
      const settlement = m.razorpay_settlements as any;
      const bank = m.bank_transactions as any;
      const invoice = m.gst_invoices as any;

      rows.push([
        invoice?.invoice_number || '',
        order?.order_id || '',
        order?.customer_ref || '',
        order?.order_date || '',
        order?.amount ? Number(order.amount).toFixed(2) : '',
        invoice?.gst_amount ? Number(invoice.gst_amount).toFixed(2) : '',
        invoice?.hsn_code || '998314',
        settlement?.settlement_id || '',
        settlement?.commission ? Number(settlement.commission).toFixed(2) : '',
        settlement?.gst_on_commission ? Number(settlement.gst_on_commission).toFixed(2) : '',
        settlement?.net_settled_amount ? Number(settlement.net_settled_amount).toFixed(2) : '',
        settlement?.settlement_date || '',
        settlement?.utr || bank?.bank_ref || '',
        bank?.credit_amount ? Number(bank.credit_amount).toFixed(2) : '',
        bank?.txn_date || '',
        m.match_status || '',
        m.match_confidence?.toString() || '',
      ]);
    }

    const csvContent = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const filename = `GST_Reconciliation_${merchant.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
