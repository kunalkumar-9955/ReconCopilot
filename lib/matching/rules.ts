// lib/matching/rules.ts
// Rule-based matching engine for reconciliation

export interface Order {
  id: string;
  order_id: string;
  amount: number;
  order_date: string;
  merchant_id: string;
}

export interface Settlement {
  id: string;
  settlement_id: string;
  order_id_linked: string | null;
  gross_amount: number;
  commission: number;
  gst_on_commission: number;
  net_settled_amount: number;
  settlement_date: string;
  utr: string | null;
  merchant_id: string;
}

export interface BankTransaction {
  id: string;
  bank_ref: string;
  credit_amount: number;
  txn_date: string;
  description: string | null;
  matched_settlement_id: string | null;
  merchant_id: string;
}

export interface GstInvoice {
  id: string;
  invoice_number: string;
  order_id_linked: string | null;
  invoice_amount: number;
  invoice_date: string;
  gst_amount: number;
  merchant_id: string;
}

export interface MatchResult {
  orderId: string;
  orderDbId: string;
  settlementId: string | null;
  bankTxnId: string | null;
  invoiceId: string | null;
  status: 'matched' | 'partial' | 'exception';
  confidence: number;
  method: 'rule' | 'llm';
  exceptionType?: 'short_settlement' | 'double_commission' | 'missing_invoice' | 'timing_mismatch' | 'unmatched';
  exceptionDescription?: string;
  amountDelta?: number;
  ambiguousCandidates?: Settlement[]; // for LLM assist
}

const COMMISSION_RATE = 0.02;
const GST_ON_COMMISSION_RATE = 0.18;
const AMOUNT_TOLERANCE = 5; // ±₹5
const TIMING_WINDOW_MIN = 2; // T+2 days minimum
const TIMING_WINDOW_MAX = 5; // T+5 days normal window
const TIMING_WINDOW_EXTENDED = 10; // beyond this = timing mismatch

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.abs((d2 - d1) / (1000 * 60 * 60 * 24));
}

function calcExpectedNet(orderAmount: number): number {
  const commission = orderAmount * COMMISSION_RATE;
  const gst = commission * GST_ON_COMMISSION_RATE;
  return parseFloat((orderAmount - commission - gst).toFixed(2));
}

function calcExpectedCommission(orderAmount: number): number {
  return parseFloat((orderAmount * COMMISSION_RATE).toFixed(2));
}

export function runRuleBasedMatching(
  orders: Order[],
  settlements: Settlement[],
  bankTxns: BankTransaction[],
  invoices: GstInvoice[]
): {
  definiteMatches: MatchResult[];
  ambiguous: { order: Order; candidates: Settlement[] }[];
  unmatched: Order[];
} {
  const definiteMatches: MatchResult[] = [];
  const ambiguous: { order: Order; candidates: Settlement[] }[] = [];
  const unmatched: Order[] = [];
  const usedSettlementIds = new Set<string>();

  for (const order of orders) {
    // ── Rule 1: Exact order_id match in settlement.order_id_linked ──────────
    const exactMatch = settlements.find(
      s => !usedSettlementIds.has(s.id) && s.order_id_linked === order.order_id
    );

    if (exactMatch) {
      usedSettlementIds.add(exactMatch.id);
      const expectedNet = calcExpectedNet(order.amount);
      const expectedCommission = calcExpectedCommission(order.amount);
      const actualCommission = exactMatch.commission;
      const amountDelta = parseFloat((exactMatch.net_settled_amount - expectedNet).toFixed(2));
      const daysDiff = daysBetween(order.order_date, exactMatch.settlement_date);

      // Find bank transaction
      const bankTxn = bankTxns.find(bt =>
        bt.description?.includes(exactMatch.utr || '') ||
        Math.abs(bt.credit_amount - exactMatch.net_settled_amount) < AMOUNT_TOLERANCE
      );

      // Find invoice
      const invoice = invoices.find(inv =>
        inv.order_id_linked === order.order_id ||
        (Math.abs(inv.invoice_amount - order.amount) < AMOUNT_TOLERANCE &&
          daysBetween(inv.invoice_date, order.order_date) <= 2)
      );

      // Check for exception types
      const doubleCommissionExpected = expectedCommission;
      const isDoubleCommission = Math.abs(actualCommission - doubleCommissionExpected * 2) < AMOUNT_TOLERANCE;
      const isShortSettlement = amountDelta < -AMOUNT_TOLERANCE && !isDoubleCommission;
      const isMissingInvoice = !invoice;
      const isTimingMismatch = daysDiff > TIMING_WINDOW_MAX && daysDiff <= TIMING_WINDOW_EXTENDED;
      const isTimingBad = daysDiff > TIMING_WINDOW_EXTENDED;

      if (isDoubleCommission) {
        definiteMatches.push({
          orderId: order.order_id,
          orderDbId: order.id,
          settlementId: exactMatch.id,
          bankTxnId: bankTxn?.id ?? null,
          invoiceId: invoice?.id ?? null,
          status: 'exception',
          confidence: 0.97,
          method: 'rule',
          exceptionType: 'double_commission',
          exceptionDescription: `Commission deducted twice: ₹${actualCommission.toFixed(2)} instead of expected ₹${doubleCommissionExpected.toFixed(2)}. Extra deduction: ₹${(actualCommission - doubleCommissionExpected).toFixed(2)}.`,
          amountDelta,
        });
      } else if (isShortSettlement) {
        definiteMatches.push({
          orderId: order.order_id,
          orderDbId: order.id,
          settlementId: exactMatch.id,
          bankTxnId: bankTxn?.id ?? null,
          invoiceId: invoice?.id ?? null,
          status: 'exception',
          confidence: 0.95,
          method: 'rule',
          exceptionType: 'short_settlement',
          exceptionDescription: `Net settled ₹${exactMatch.net_settled_amount.toFixed(2)} is ₹${Math.abs(amountDelta).toFixed(2)} less than expected ₹${expectedNet.toFixed(2)}. Commission rate appears higher than standard 2%.`,
          amountDelta,
        });
      } else if (isTimingBad || isTimingMismatch) {
        definiteMatches.push({
          orderId: order.order_id,
          orderDbId: order.id,
          settlementId: exactMatch.id,
          bankTxnId: bankTxn?.id ?? null,
          invoiceId: invoice?.id ?? null,
          status: isMissingInvoice ? 'exception' : 'partial',
          confidence: 0.88,
          method: 'rule',
          exceptionType: 'timing_mismatch',
          exceptionDescription: `Settlement arrived T+${Math.round(daysDiff)} days after order (expected T+2 to T+5). ${isMissingInvoice ? 'GST invoice also missing.' : 'Low severity — amounts match.'}`,
          amountDelta: 0,
        });
      } else if (isMissingInvoice) {
        definiteMatches.push({
          orderId: order.order_id,
          orderDbId: order.id,
          settlementId: exactMatch.id,
          bankTxnId: bankTxn?.id ?? null,
          invoiceId: null,
          status: 'exception',
          confidence: 0.93,
          method: 'rule',
          exceptionType: 'missing_invoice',
          exceptionDescription: `Settlement and bank credit matched, but no GST invoice found for order ${order.order_id}. Upload Tally/Zoho export or generate e-invoice on IRP portal.`,
          amountDelta: 0,
        });
      } else {
        // Clean match
        definiteMatches.push({
          orderId: order.order_id,
          orderDbId: order.id,
          settlementId: exactMatch.id,
          bankTxnId: bankTxn?.id ?? null,
          invoiceId: invoice?.id ?? null,
          status: 'matched',
          confidence: 1.0,
          method: 'rule',
          amountDelta: 0,
        });
      }
      continue;
    }

    // ── Rule 2: Amount + date proximity (no order_id link) ─────────────────
    const expectedNet = calcExpectedNet(order.amount);
    const orderDate = new Date(order.order_date);

    const proximityCandidates = settlements.filter(s => {
      if (usedSettlementIds.has(s.id)) return false;
      const amountMatch = Math.abs(s.net_settled_amount - expectedNet) <= AMOUNT_TOLERANCE + 50; // loose tolerance
      const days = daysBetween(order.order_date, s.settlement_date);
      const dateInWindow = days >= 1 && days <= TIMING_WINDOW_EXTENDED;
      return amountMatch && dateInWindow;
    });

    if (proximityCandidates.length === 1) {
      // Single candidate → definite match
      const candidate = proximityCandidates[0];
      usedSettlementIds.add(candidate.id);
      const invoice = invoices.find(inv => inv.order_id_linked === order.order_id);
      const bankTxn = bankTxns.find(bt =>
        Math.abs(bt.credit_amount - candidate.net_settled_amount) < AMOUNT_TOLERANCE * 3
      );

      definiteMatches.push({
        orderId: order.order_id,
        orderDbId: order.id,
        settlementId: candidate.id,
        bankTxnId: bankTxn?.id ?? null,
        invoiceId: invoice?.id ?? null,
        status: invoice ? 'matched' : 'partial',
        confidence: 0.85,
        method: 'rule',
        exceptionType: invoice ? undefined : 'missing_invoice',
        exceptionDescription: invoice ? undefined : `Amount and date matched but no GST invoice found.`,
        amountDelta: 0,
      });
      continue;
    }

    if (proximityCandidates.length > 1) {
      // Multiple candidates → send to LLM
      ambiguous.push({ order, candidates: proximityCandidates });
      continue;
    }

    // ── No candidate found ──────────────────────────────────────────────────
    unmatched.push(order);
  }

  return { definiteMatches, ambiguous, unmatched };
}
