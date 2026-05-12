-- ── Migration: fix_finance_schema ────────────────────────────────────────────
-- Fixes critical schema mismatches found during Finance audit 2026-05-12

-- ── 1. personal_transactions.cost_classification CHECK ───────────────────────
-- Old CHECK allowed: fixed / variable / semi-variable / one-time
-- App uses:         revenue / cogs / opex / other
ALTER TABLE personal_transactions
  DROP CONSTRAINT IF EXISTS personal_transactions_cost_classification_check;

ALTER TABLE personal_transactions
  ADD CONSTRAINT personal_transactions_cost_classification_check
  CHECK (cost_classification IN ('revenue', 'cogs', 'opex', 'other'));

-- ── 2. personal_transactions: add recurring_interval ─────────────────────────
ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS recurring_interval VARCHAR(20)
  CHECK (recurring_interval IN ('weekly', 'monthly', 'yearly'));

-- ── 3. subscriptions: add missing columns ────────────────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS billing_day INTEGER NOT NULL DEFAULT 1
    CHECK (billing_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon VARCHAR(10),
  ADD COLUMN IF NOT EXISTS account_id UUID;

-- Backfill is_active from existing status column
UPDATE subscriptions SET is_active = (status = 'active') WHERE is_active = true;

-- ── 4. subscriptions.billing_cycle CHECK ─────────────────────────────────────
-- Old CHECK: weekly / monthly / quarterly / yearly
-- App uses:  monthly / quarterly / quadrimestral / biannual / annual
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle IN ('monthly', 'quarterly', 'quadrimestral', 'biannual', 'annual'));

-- ── 5. subscription_transactions: add user_id + idempotency constraint ────────
ALTER TABLE subscription_transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Idempotency: prevent duplicate charges for the same sub + billing date
ALTER TABLE subscription_transactions
  DROP CONSTRAINT IF EXISTS subscription_transactions_sub_date_unique;

ALTER TABLE subscription_transactions
  ADD CONSTRAINT subscription_transactions_sub_date_unique
  UNIQUE (subscription_id, billing_date);

-- Index for fast lookup by subscription
CREATE INDEX IF NOT EXISTS idx_subtx_subscription
  ON subscription_transactions (subscription_id, billing_date DESC);
