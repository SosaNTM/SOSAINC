-- ============================================================================
-- MIGRATION: Create missing finance tables + fix existing table gaps
-- Date: 2026-04-08
-- ============================================================================
--
-- PROBLEM SUMMARY (discovered in audit 2026-04-08):
--
-- 1. financial_goals  — table missing entirely; frontend queries it.
-- 2. investments      — table missing entirely; frontend queries it.
-- 3. budget_limits    — table missing entirely; frontend queries it.
-- 4. personal_transactions — missing columns: category_id, cost_classification,
--                            subcategory, reference (causes insert errors → LS fallback).
-- 5. Four tables have NULL portal_id for rows created before the 20260404 migration
--    (personal_transactions, crypto_holdings, gift_cards, gift_card_transactions).
--    Backfilling all NULL rows to SOSA portal (all pre-portal-split data belongs there).
--
-- PORTAL UUID MAP:
--   sosa    → 00000000-0000-0000-0000-000000000001
--   keylo   → 00000000-0000-0000-0000-000000000002
--   redx    → 00000000-0000-0000-0000-000000000003
--   trustme → 00000000-0000-0000-0000-000000000004
-- ============================================================================

BEGIN;

-- ── 1. financial_goals ───────────────────────────────────────────────────────
-- Schema matches DbFinancialGoal in src/types/database.ts and goalsService.ts

CREATE TABLE IF NOT EXISTS financial_goals (
  id          UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id   UUID          NOT NULL,
  user_id     TEXT          NOT NULL,
  name        TEXT          NOT NULL,
  target      NUMERIC(12,2) NOT NULL CHECK (target > 0),
  saved       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (saved >= 0),
  deadline    DATE,
  category    TEXT,
  color       TEXT          DEFAULT '#6b7280',
  emoji       TEXT          DEFAULT '🎯',
  is_achieved BOOLEAN       NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fg_portal
  ON financial_goals(portal_id);
CREATE INDEX IF NOT EXISTS idx_fg_portal_achieved
  ON financial_goals(portal_id, is_achieved);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_financial_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fg_updated_at ON financial_goals;
CREATE TRIGGER trg_fg_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW EXECUTE FUNCTION update_financial_goals_updated_at();

ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "financial_goals_anon_all" ON financial_goals;
CREATE POLICY "financial_goals_anon_all"
  ON financial_goals FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);


-- ── 2. investments ───────────────────────────────────────────────────────────
-- Schema matches DbInvestment in src/types/database.ts and investmentService.ts

CREATE TABLE IF NOT EXISTS investments (
  id             UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id      UUID          NOT NULL,
  user_id        TEXT          NOT NULL,
  name           TEXT          NOT NULL,
  ticker         TEXT,
  type           TEXT          NOT NULL DEFAULT 'other'
                   CHECK (type IN ('stock','etf','crypto','bonds','real_estate','other')),
  units          NUMERIC(18,8) NOT NULL DEFAULT 0,
  avg_buy_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_price  NUMERIC(12,2),
  currency       TEXT          NOT NULL DEFAULT 'EUR',
  color          TEXT          DEFAULT '#6b7280',
  emoji          TEXT          DEFAULT '💼',
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_portal
  ON investments(portal_id);
CREATE INDEX IF NOT EXISTS idx_inv_portal_type
  ON investments(portal_id, type);

CREATE OR REPLACE FUNCTION update_investments_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inv_updated_at ON investments;
CREATE TRIGGER trg_inv_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION update_investments_updated_at();

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "investments_anon_all" ON investments;
CREATE POLICY "investments_anon_all"
  ON investments FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);


-- ── 3. budget_limits ─────────────────────────────────────────────────────────
-- Schema matches DbBudgetLimit in src/types/database.ts and budgetService.ts
-- upsertBudgetLimit uses ON CONFLICT on (portal_id, category)

CREATE TABLE IF NOT EXISTS budget_limits (
  id            UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id     UUID          NOT NULL,
  user_id       TEXT,
  category      TEXT          NOT NULL,
  category_id   UUID,
  monthly_limit NUMERIC(12,2) NOT NULL CHECK (monthly_limit >= 0),
  color         TEXT,
  icon_name     TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (portal_id, category)
);

CREATE INDEX IF NOT EXISTS idx_bl_portal
  ON budget_limits(portal_id);

CREATE OR REPLACE FUNCTION update_budget_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bl_updated_at ON budget_limits;
CREATE TRIGGER trg_bl_updated_at
  BEFORE UPDATE ON budget_limits
  FOR EACH ROW EXECUTE FUNCTION update_budget_limits_updated_at();

ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budget_limits_anon_all" ON budget_limits;
CREATE POLICY "budget_limits_anon_all"
  ON budget_limits FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);


-- ── 4. personal_transactions — add missing columns ────────────────────────────
-- The original 20260318 migration did not include these columns.
-- cost_classification is used for business portal P&L analysis.

ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS category_id        UUID,
  ADD COLUMN IF NOT EXISTS cost_classification TEXT
    CHECK (cost_classification IN ('revenue','cogs','opex','fixed','variable','semi-variable','one-time')),
  ADD COLUMN IF NOT EXISTS subcategory        TEXT,
  ADD COLUMN IF NOT EXISTS reference          TEXT;

CREATE INDEX IF NOT EXISTS idx_ptx_portal_classification
  ON personal_transactions(portal_id, cost_classification)
  WHERE cost_classification IS NOT NULL;


-- ── 5. Backfill NULL portal_id rows → SOSA portal ────────────────────────────
-- All rows created before the 20260404 migration have portal_id = NULL.
-- These belong to the original SOSA INC. portal (the first and only portal
-- that existed when these rows were created).

-- 5a. personal_transactions
UPDATE personal_transactions
  SET portal_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE portal_id IS NULL;

-- 5b. gift_cards
UPDATE gift_cards
  SET portal_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE portal_id IS NULL;

-- 5c. gift_card_transactions
UPDATE gift_card_transactions
  SET portal_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE portal_id IS NULL;

-- 5d. crypto_holdings — handle duplicate coin_ids before backfilling
--     (the unique constraint is now portal_id + coin_id, so duplicates per coin
--      in the NULL-portal set must be de-duplicated first — keep most recent)
DELETE FROM crypto_holdings
  WHERE portal_id IS NULL
    AND id NOT IN (
      SELECT DISTINCT ON (coin_id) id
      FROM crypto_holdings
      WHERE portal_id IS NULL
      ORDER BY coin_id, created_at DESC NULLS LAST
    );

UPDATE crypto_holdings
  SET portal_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE portal_id IS NULL;


-- ── 6. Ensure financial_goals RLS also covers the realtime channel ────────────
-- The useRealtimeTable hook subscribes to postgres_changes on financial_goals.
-- The permissive policy above is sufficient; no extra grants needed for anon realtime.

COMMIT;
