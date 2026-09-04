-- Settlement & GST Reconciliation Copilot
-- Supabase / Postgres Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Merchants
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  razorpay_merchant_id TEXT,
  gstin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (own system / Tally / Zoho)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  customer_ref TEXT,
  order_date DATE NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Razorpay Settlements
CREATE TABLE IF NOT EXISTS razorpay_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  settlement_id TEXT NOT NULL UNIQUE,
  order_id_linked TEXT,             -- raw order reference from Razorpay notes
  gross_amount NUMERIC(12,2) NOT NULL,
  commission NUMERIC(12,2) NOT NULL,
  gst_on_commission NUMERIC(12,2) NOT NULL,
  net_settled_amount NUMERIC(12,2) NOT NULL,
  settlement_date DATE NOT NULL,
  utr TEXT,                          -- bank UTR reference
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  bank_ref TEXT NOT NULL,
  credit_amount NUMERIC(12,2) NOT NULL,
  txn_date DATE NOT NULL,
  description TEXT,
  matched_settlement_id UUID REFERENCES razorpay_settlements(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GST Invoices
CREATE TABLE IF NOT EXISTS gst_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  order_id_linked TEXT,
  invoice_amount NUMERIC(12,2) NOT NULL,
  invoice_date DATE NOT NULL,
  gst_amount NUMERIC(12,2) NOT NULL,
  hsn_code TEXT DEFAULT '998314',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliation Matches
CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  settlement_id UUID REFERENCES razorpay_settlements(id),
  bank_txn_id UUID REFERENCES bank_transactions(id),
  invoice_id UUID REFERENCES gst_invoices(id),
  match_status TEXT NOT NULL CHECK (match_status IN ('matched', 'partial', 'exception')),
  match_confidence NUMERIC(4,3) DEFAULT 1.0,
  match_method TEXT DEFAULT 'rule',   -- 'rule' | 'llm'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exceptions
CREATE TABLE IF NOT EXISTS exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  match_id UUID REFERENCES reconciliation_matches(id),
  order_id UUID REFERENCES orders(id),
  exception_type TEXT NOT NULL CHECK (exception_type IN (
    'short_settlement', 'double_commission', 'missing_invoice',
    'timing_mismatch', 'unmatched'
  )),
  description TEXT NOT NULL,
  amount_delta NUMERIC(12,2) DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_settlements_merchant ON razorpay_settlements(merchant_id);
CREATE INDEX IF NOT EXISTS idx_settlements_order_linked ON razorpay_settlements(order_id_linked);
CREATE INDEX IF NOT EXISTS idx_bank_txns_merchant ON bank_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_merchant ON gst_invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_matches_merchant ON reconciliation_matches(merchant_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_merchant ON exceptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_type ON exceptions(exception_type);

-- Dashboard summary view
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  m.id AS merchant_id,
  m.name AS merchant_name,
  COUNT(DISTINCT o.id) AS total_orders,
  COALESCE(SUM(o.amount), 0) AS total_order_value,
  COUNT(DISTINCT CASE WHEN rm.match_status = 'matched' THEN o.id END) AS matched_orders,
  COUNT(DISTINCT CASE WHEN rm.match_status IN ('partial','exception') THEN o.id END) AS partial_orders,
  COUNT(DISTINCT CASE WHEN rm.id IS NULL THEN o.id END) AS unmatched_orders,
  COALESCE(SUM(rs.commission), 0) AS total_commission,
  COALESCE(SUM(rs.gst_on_commission), 0) AS total_gst_on_commission,
  COUNT(DISTINCT e.id) AS total_exceptions
FROM merchants m
LEFT JOIN orders o ON o.merchant_id = m.id
LEFT JOIN reconciliation_matches rm ON rm.order_id = o.id
LEFT JOIN razorpay_settlements rs ON rs.id = rm.settlement_id
LEFT JOIN exceptions e ON e.merchant_id = m.id AND e.resolved = FALSE
GROUP BY m.id, m.name;
