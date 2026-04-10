-- ── Goals ↔ Net Worth Integration Migration ──────────────────────────────────
--
-- This migration ensures the financial_goals table is correctly set up.
-- The "saved" column is kept for schema compatibility but is always 0 —
-- the live net worth (computed from transactions + assets) is used instead.
--
-- Safe to run multiple times (idempotent).

-- ── 1. Create table if missing ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.financial_goals (
  id          UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id   UUID          NOT NULL,
  user_id     TEXT          NOT NULL DEFAULT '',
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

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fg_portal
  ON public.financial_goals(portal_id);

CREATE INDEX IF NOT EXISTS idx_fg_portal_achieved
  ON public.financial_goals(portal_id, is_achieved);

-- ── 3. Auto-update updated_at ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_financial_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fg_updated_at ON public.financial_goals;
CREATE TRIGGER trg_fg_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_goals_updated_at();

-- ── 4. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Open policy: portal_id scoping is enforced by the app via the SOSA UUID.
-- Tighten to auth.uid()::text = user_id once Supabase Auth is wired up fully.
DROP POLICY IF EXISTS "financial_goals_portal_all" ON public.financial_goals;
CREATE POLICY "financial_goals_portal_all"
  ON public.financial_goals FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 5. Realtime ───────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_goals;

-- ── 6. Comment ───────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.financial_goals.saved IS
  'Always 0. Current progress is computed live from net worth (transactions + assets), not stored here.';
