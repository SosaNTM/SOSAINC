-- ============================================================================
-- MIGRATION: Add portal_id to tables missing multi-portal isolation
-- Date: 2026-04-04
-- ============================================================================
--
-- PROBLEM: Four tables were designed with user_id-only scoping but the
-- application code queries them with portal_id (UUID). All Supabase operations
-- for these tables silently fail and fall back to localStorage.
--
-- AFFECTED TABLES:
--   1. personal_transactions  — user_id TEXT, no portal_id
--   2. gift_cards             — user_id UUID, no portal_id
--   3. gift_card_transactions — user_id UUID, no portal_id
--   4. crypto_holdings        — user_id UUID, no portal_id
--
-- PORTAL UUID MAP (from portalUUID.ts):
--   sosa     → 00000000-0000-0000-0000-000000000001
--   keylo    → 00000000-0000-0000-0000-000000000002
--   redx     → 00000000-0000-0000-0000-000000000003
--   trustme  → 00000000-0000-0000-0000-000000000004
-- ============================================================================

BEGIN;

-- ── 1. personal_transactions ─────────────────────────────────────────────────

ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS portal_id UUID;

-- Indexes for portal-scoped queries (mirrors service query patterns)
CREATE INDEX IF NOT EXISTS idx_ptx_portal_date
  ON personal_transactions(portal_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ptx_portal_category
  ON personal_transactions(portal_id, category);
CREATE INDEX IF NOT EXISTS idx_ptx_portal_type
  ON personal_transactions(portal_id, type);

-- Enable anon access (mock auth — no real auth.uid())
ALTER TABLE personal_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personal_transactions_anon_all" ON personal_transactions;
CREATE POLICY "personal_transactions_anon_all"
  ON personal_transactions FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ── 2. gift_cards ─────────────────────────────────────────────────────────────

ALTER TABLE gift_cards
  ADD COLUMN IF NOT EXISTS portal_id UUID;

-- Drop old user-only indexes, replace with portal-scoped ones
DROP INDEX IF EXISTS idx_gift_cards_status;
DROP INDEX IF EXISTS idx_gift_cards_brand;

CREATE INDEX IF NOT EXISTS idx_gift_cards_portal
  ON gift_cards(portal_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_portal_status
  ON gift_cards(portal_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_portal_brand
  ON gift_cards(portal_id, brand_key);

-- Replace authenticated-only policy with anon+authenticated
DROP POLICY IF EXISTS "Users can CRUD their own gift cards" ON gift_cards;
CREATE POLICY "gift_cards_anon_all"
  ON gift_cards FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ── 3. gift_card_transactions ────────────────────────────────────────────────

ALTER TABLE gift_card_transactions
  ADD COLUMN IF NOT EXISTS portal_id UUID;

CREATE INDEX IF NOT EXISTS idx_gc_transactions_portal
  ON gift_card_transactions(portal_id);

-- Replace authenticated-only policy with anon+authenticated
DROP POLICY IF EXISTS "Users can CRUD their own gc transactions" ON gift_card_transactions;
CREATE POLICY "gc_transactions_anon_all"
  ON gift_card_transactions FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ── 4. crypto_holdings ───────────────────────────────────────────────────────

ALTER TABLE crypto_holdings
  ADD COLUMN IF NOT EXISTS portal_id UUID;

-- Update the unique constraint: holdings are now unique per portal+coin
-- (one user can hold BTC in sosa portal and BTC in keylo portal independently)
ALTER TABLE crypto_holdings DROP CONSTRAINT IF EXISTS unique_user_coin;
ALTER TABLE crypto_holdings
  ADD CONSTRAINT unique_portal_coin UNIQUE (portal_id, coin_id);

CREATE INDEX IF NOT EXISTS idx_crypto_holdings_portal
  ON crypto_holdings(portal_id);

-- Replace authenticated-only policy with anon+authenticated
DROP POLICY IF EXISTS "Users can CRUD their own holdings" ON crypto_holdings;
CREATE POLICY "crypto_holdings_anon_all"
  ON crypto_holdings FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ── Also open anon access for related read-only tables ────────────────────────

-- crypto_prices — seeded market data, should be readable by anon
DROP POLICY IF EXISTS "Authenticated users can read crypto prices" ON crypto_prices;
CREATE POLICY "crypto_prices_anon_read"
  ON crypto_prices FOR SELECT TO anon, authenticated
  USING (true);

-- crypto_price_history — read-only chart data
DROP POLICY IF EXISTS "Authenticated users can read price history" ON crypto_price_history;
CREATE POLICY "crypto_price_history_anon_read"
  ON crypto_price_history FOR SELECT TO anon, authenticated
  USING (true);

-- gift_card_brands — catalog, read-only for everyone
DROP POLICY IF EXISTS "Authenticated users can read brands" ON gift_card_brands;
CREATE POLICY "gift_card_brands_anon_read"
  ON gift_card_brands FOR SELECT TO anon, authenticated
  USING (true);

COMMIT;
