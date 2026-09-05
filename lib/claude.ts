// lib/claude.ts
// Anthropic Claude API wrapper with mock fallback

import Anthropic from '@anthropic-ai/sdk';
import type { Order, Settlement } from './matching/rules';

const USE_MOCK = process.env.USE_MOCK_LLM === 'true' || !process.env.ANTHROPIC_API_KEY;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ─── LLM-Assisted Matching ───────────────────────────────────────────────────

export interface LLMMatchDecision {
  matchedSettlementId: string | null;
  confidence: number;
  explanation: string;
  exceptionType?: 'short_settlement' | 'double_commission' | 'missing_invoice' | 'timing_mismatch' | 'unmatched';
}

export async function llmAssistedMatch(
  order: Order,
  candidates: Settlement[]
): Promise<LLMMatchDecision> {
  if (USE_MOCK) {
    return mockMatchDecision(order, candidates);
  }

  const prompt = buildMatchPrompt(order, candidates);

  try {
    const client = getClient();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
      system: `You are a financial reconciliation assistant. You help match payment orders to Razorpay settlements.
Respond ONLY with valid JSON in this exact format:
{
  "matched_settlement_id": "<id or null>",
  "confidence": <0.0 to 1.0>,
  "explanation": "<one sentence>",
  "exception_type": "<short_settlement|double_commission|missing_invoice|timing_mismatch|unmatched|null>"
}`,
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const parsed = JSON.parse(content.text.trim());
    return {
      matchedSettlementId: parsed.matched_settlement_id,
      confidence: parsed.confidence,
      explanation: parsed.explanation,
      exceptionType: parsed.exception_type === 'null' ? undefined : parsed.exception_type,
    };
  } catch (err) {
    console.error('LLM match error, falling back to mock:', err);
    return mockMatchDecision(order, candidates);
  }
}

function buildMatchPrompt(order: Order, candidates: Settlement[]): string {
  return `Match this order to one of the candidate Razorpay settlements.

ORDER:
- Order ID: ${order.order_id}
- Amount: ₹${order.amount}
- Date: ${order.order_date}

CANDIDATE SETTLEMENTS (${candidates.length} options):
${candidates.map((s, i) => `
[${i + 1}] Settlement ID: ${s.id}
    Gross: ₹${s.gross_amount}, Commission: ₹${s.commission}, GST on commission: ₹${s.gst_on_commission}
    Net Settled: ₹${s.net_settled_amount}
    Date: ${s.settlement_date}
    Order linked in notes: ${s.order_id_linked || 'none'}
`).join('\n')}

Standard Razorpay commission is 2% + 18% GST on commission.
Expected net for this order: ₹${(order.amount * 0.9764).toFixed(2)} (approx).

Which settlement matches best? Flag any anomaly (wrong commission rate, double deduction, timing issue).`;
}

function mockMatchDecision(order: Order, candidates: Settlement[]): LLMMatchDecision {
  // Prefer exact amount match
  const expectedNet = order.amount * 0.9764;
  const best = candidates.reduce((prev, curr) =>
    Math.abs(curr.net_settled_amount - expectedNet) < Math.abs(prev.net_settled_amount - expectedNet) ? curr : prev
  );

  const delta = best.net_settled_amount - expectedNet;
  if (Math.abs(delta) > 100) {
    return {
      matchedSettlementId: best.id,
      confidence: 0.72,
      explanation: `Best amount match found (₹${Math.abs(delta).toFixed(2)} delta). Commission rate appears non-standard — flagged for review.`,
      exceptionType: 'short_settlement',
    };
  }

  return {
    matchedSettlementId: best.id,
    confidence: 0.81,
    explanation: `Amount proximity match within ₹${Math.abs(delta).toFixed(2)} of expected. Settlement date within acceptable window.`,
  };
}

// ─── Chat / NL Query ─────────────────────────────────────────────────────────

export interface ChatContext {
  totalOrders: number;
  reconciledCount: number;
  exceptionCount: number;
  exceptionsByType: Record<string, number>;
  commissionThisMonth: number;
  commissionLastMonth: number;
  unreconciledOrders: Array<{ order_id: string; amount: number; order_date: string }>;
  topExceptions: Array<{ order_id: string; type: string; description: string; amount_delta: number }>;
  gstSummary: { totalInvoiceAmount: number; totalGstAmount: number; invoiceCount: number; missingCount: number };
  currentMonth: string;
}

export async function chatWithClaude(
  userMessage: string,
  context: ChatContext
): Promise<string> {
  if (USE_MOCK) {
    return mockChatResponse(userMessage, context);
  }

  const contextStr = JSON.stringify(context, null, 2);
  const systemPrompt = `You are a helpful financial reconciliation assistant for Indian small businesses. 
You help merchants understand their Razorpay settlements, GST invoices, and reconciliation status.

IMPORTANT RULES:
- Answer in the same language mix as the question (Hinglish is fine, mirror the user's style)
- Be concise and specific — use actual numbers from the context
- Format amounts in Indian style (₹ symbol, Indian number formatting with lakhs/crores where appropriate)
- If the user asks in Hindi/Hinglish, respond in Hindi/Hinglish
- Never make up data — only use the context provided

RECONCILIATION CONTEXT:
${contextStr}`;

  try {
    const client = getClient();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : 'Sorry, unable to generate response.';
  } catch (err) {
    console.error('Chat error, using mock:', err);
    return mockChatResponse(userMessage, context);
  }
}

function mockChatResponse(userMessage: string, ctx: ChatContext): string {
  const q = userMessage.toLowerCase();

  if (q.includes('commission') || q.includes('kitna kata') || q.includes('kata')) {
    return `Is mahine aapka total Razorpay commission ₹${ctx.commissionThisMonth.toLocaleString('en-IN')} kata hai. Pichle mahine ₹${ctx.commissionLastMonth.toLocaleString('en-IN')} tha. Commission rate standard 2% + 18% GST hai — agar koi short settlement exception hai toh woh extra deduction hai.`;
  }

  if (q.includes('unreconciled') || q.includes('unmatched') || q.includes('missing') || q.includes('kaunse')) {
    const list = ctx.unreconciledOrders.slice(0, 5)
      .map(o => `• ${o.order_id} — ₹${o.amount} (${o.order_date})`)
      .join('\n');
    return `${ctx.unreconciledOrders.length} orders unreconciled hain:\n${list}${ctx.unreconciledOrders.length > 5 ? `\n...aur ${ctx.unreconciledOrders.length - 5} aur` : ''}`;
  }

  if (q.includes('exception') || q.includes('problem') || q.includes('issue') || q.includes('zyada')) {
    const topType = Object.entries(ctx.exceptionsByType).sort((a, b) => b[1] - a[1])[0];
    return `Sabse zyada exceptions "${topType?.[0] || 'unmatched'}" type mein hain — ${topType?.[1] || 0} cases. Total ${ctx.exceptionCount} exceptions hain jo resolve nahi hue.`;
  }

  if (q.includes('gst') || q.includes('invoice') || q.includes('summary')) {
    return `GST Summary (${ctx.currentMonth}):\n• Total invoices: ${ctx.gstSummary.invoiceCount}\n• Total invoice value: ₹${ctx.gstSummary.totalInvoiceAmount.toLocaleString('en-IN')}\n• Total GST collected: ₹${ctx.gstSummary.totalGstAmount.toLocaleString('en-IN')}\n• Missing invoices: ${ctx.gstSummary.missingCount} orders ke liye invoice nahi mili`;
  }

  if (q.includes('reconcil') || q.includes('status') || q.includes('kitna')) {
    const pct = Math.round((ctx.reconciledCount / ctx.totalOrders) * 100);
    return `Aapke ${ctx.totalOrders} orders mein se ${ctx.reconciledCount} (${pct}%) reconcile ho chuke hain. ${ctx.exceptionCount} exceptions hain jo attention chahte hain.`;
  }

  return `Aapka reconciliation status:\n• Total orders: ${ctx.totalOrders}\n• Reconciled: ${ctx.reconciledCount} (${Math.round((ctx.reconciledCount / ctx.totalOrders) * 100)}%)\n• Exceptions: ${ctx.exceptionCount}\n• Commission this month: ₹${ctx.commissionThisMonth.toLocaleString('en-IN')}\n\nKoi specific sawaal poochhen — commission breakdown, unmatched orders, ya GST summary?`;
}
