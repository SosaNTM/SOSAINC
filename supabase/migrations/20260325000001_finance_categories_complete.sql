-- ═══════════════════════════════════════════════════════════════════════════════
-- FINANCE CATEGORIES — Complete: sosa seed + audit columns + tighter RLS
-- Depends on: 20260324000001_finance_categories.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add audit columns ────────────────────────────────────────────────────
ALTER TABLE finance_transaction_categories
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ── 2. Seed sosa portal (other portals already seeded) ──────────────────────
SELECT seed_finance_categories('sosa');

-- ── 3. Tighten RLS policies ─────────────────────────────────────────────────
-- Drop the wide-open policies
DROP POLICY IF EXISTS "ftc_select" ON finance_transaction_categories;
DROP POLICY IF EXISTS "ftc_insert" ON finance_transaction_categories;
DROP POLICY IF EXISTS "ftc_update" ON finance_transaction_categories;
DROP POLICY IF EXISTS "ftc_delete" ON finance_transaction_categories;

-- Recreate with portal-based access
CREATE POLICY "ftc_portal_read" ON finance_transaction_categories
  FOR SELECT USING (
    portal_id IN (SELECT unnest(public.get_my_portal_ids())::text)
  );

CREATE POLICY "ftc_portal_insert" ON finance_transaction_categories
  FOR INSERT WITH CHECK (
    portal_id IN (SELECT unnest(public.get_my_portal_ids())::text)
  );

CREATE POLICY "ftc_portal_update" ON finance_transaction_categories
  FOR UPDATE USING (
    portal_id IN (SELECT unnest(public.get_my_portal_ids())::text)
  );

CREATE POLICY "ftc_portal_delete" ON finance_transaction_categories
  FOR DELETE USING (
    portal_id IN (SELECT unnest(public.get_my_portal_ids())::text)
    AND is_default = false
  );

-- ── 4. Add cost_classification + category_id to personal_transactions if missing
ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS portal_id TEXT;

-- ── 5. Index for category-based queries ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pt_classification
  ON personal_transactions(portal_id, cost_classification);
CREATE INDEX IF NOT EXISTS idx_pt_category_id
  ON personal_transactions(category_id);

-- ── 6. Enable realtime on categories ────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE finance_transaction_categories;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already added
END $$;
