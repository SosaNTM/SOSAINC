-- D-02: add year_month to budget_limits for per-month limit tracking
--
-- Before: UNIQUE(portal_id, category) — one limit per category forever
-- After:  UNIQUE(portal_id, category, year_month) — one limit per category per month

ALTER TABLE budget_limits
  DROP CONSTRAINT IF EXISTS budget_limits_portal_id_category_key;

ALTER TABLE budget_limits
  ADD COLUMN IF NOT EXISTS year_month VARCHAR(7)
    NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM');

-- Backfill: existing rows get current month so they remain valid
UPDATE budget_limits
  SET year_month = TO_CHAR(created_at, 'YYYY-MM')
  WHERE year_month = TO_CHAR(NOW(), 'YYYY-MM');

ALTER TABLE budget_limits
  ADD CONSTRAINT budget_limits_portal_category_month_key
  UNIQUE (portal_id, category, year_month);

CREATE INDEX IF NOT EXISTS idx_budget_limits_portal_month
  ON budget_limits (portal_id, year_month);
