-- ── Personal Finance: transactions + categories ───────────────────────────────
--
-- Run this in the Supabase SQL editor.
-- user_id is TEXT (matches mock auth IDs like "usr_001").
-- RLS policies use auth.uid() — enable when real Supabase auth is wired up.

-- ── personal_transactions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS personal_transactions (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            TEXT        NOT NULL,
  type               TEXT        NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount             NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency           TEXT        NOT NULL DEFAULT 'EUR',
  category           TEXT        NOT NULL,
  subcategory        TEXT,
  description        TEXT,
  date               DATE        NOT NULL DEFAULT CURRENT_DATE,
  payment_method     TEXT        CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'crypto', 'other')),
  is_recurring       BOOLEAN     NOT NULL DEFAULT false,
  recurring_interval TEXT        CHECK (recurring_interval IN ('weekly', 'monthly', 'yearly')),
  tags               TEXT[],
  receipt_url        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast queries by user + date (most common filter)
CREATE INDEX IF NOT EXISTS idx_ptx_user_date     ON personal_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ptx_user_category ON personal_transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_ptx_user_type     ON personal_transactions(user_id, type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ptx_updated_at
  BEFORE UPDATE ON personal_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── transaction_categories ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transaction_categories (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  icon       TEXT,
  color      TEXT,
  type       TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  is_default BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tcat_user ON transaction_categories(user_id);

-- ── Default categories (seed once per user) ───────────────────────────────────
-- Run this separately for each user, replacing 'YOUR_USER_ID' with the actual user_id.
-- Example:
--   INSERT INTO transaction_categories (user_id, name, icon, color, type, is_default) VALUES
--   ('usr_001', 'Stipendio', 'Landmark', '#4ade80', 'income', true),
--   ...

-- ── RLS (enable when real Supabase auth is active) ────────────────────────────
-- ALTER TABLE personal_transactions   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transaction_categories  ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Users manage own transactions"
--   ON personal_transactions FOR ALL
--   USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
--
-- CREATE POLICY "Users manage own categories"
--   ON transaction_categories FOR ALL
--   USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
