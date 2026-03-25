-- ═══════════════════════════════════════════════════════════════════════════════
-- FINANCE TRANSACTION CATEGORIES — shared table with portal_id isolation
-- Used by Keylo, RedX, TrustME for business-oriented cost classification
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS finance_transaction_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('revenue', 'cogs', 'opex', 'other')),
  color       TEXT DEFAULT '#c9a96e',
  icon        TEXT DEFAULT 'tag',
  is_default  BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(portal_id, slug)
);

CREATE INDEX idx_ftc_portal ON finance_transaction_categories(portal_id);
CREATE INDEX idx_ftc_portal_type ON finance_transaction_categories(portal_id, type);

ALTER TABLE finance_transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ftc_select" ON finance_transaction_categories
  FOR SELECT USING (true);
CREATE POLICY "ftc_insert" ON finance_transaction_categories
  FOR INSERT WITH CHECK (true);
CREATE POLICY "ftc_update" ON finance_transaction_categories
  FOR UPDATE USING (true);
CREATE POLICY "ftc_delete" ON finance_transaction_categories
  FOR DELETE USING (true);

-- ── Updated_at trigger ───────────────────────────────────────────────────────
CREATE TRIGGER trg_ftc_updated BEFORE UPDATE ON finance_transaction_categories
  FOR EACH ROW EXECUTE FUNCTION update_biz_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DEFAULT CATEGORIES for each portal
-- ═══════════════════════════════════════════════════════════════════════════════

-- Helper function to seed categories for a portal
CREATE OR REPLACE FUNCTION seed_finance_categories(p_portal TEXT)
RETURNS VOID AS $$
BEGIN
  -- Revenue
  INSERT INTO finance_transaction_categories (portal_id, name, slug, type, color, icon, is_default, sort_order) VALUES
    (p_portal, 'Vendite Prodotti',       'vendite-prodotti',       'revenue', '#4ade80', 'ShoppingBag',  true, 1),
    (p_portal, 'Servizi / Consulenze',   'servizi-consulenze',     'revenue', '#22c55e', 'Briefcase',    true, 2),
    (p_portal, 'Commissioni',            'commissioni-revenue',    'revenue', '#86efac', 'Percent',      true, 3),
    (p_portal, 'Altri Ricavi',           'altri-ricavi',           'revenue', '#16a34a', 'TrendingUp',   true, 4)
  ON CONFLICT (portal_id, slug) DO NOTHING;

  -- COGS
  INSERT INTO finance_transaction_categories (portal_id, name, slug, type, color, icon, is_default, sort_order) VALUES
    (p_portal, 'Acquisto Merce',              'acquisto-merce',          'cogs', '#fb923c', 'Package',    true, 1),
    (p_portal, 'Spedizioni / Logistica',      'spedizioni-logistica',    'cogs', '#f97316', 'Truck',      true, 2),
    (p_portal, 'Packaging',                   'packaging',               'cogs', '#fdba74', 'Box',        true, 3),
    (p_portal, 'Commissioni Piattaforma',     'commissioni-piattaforma', 'cogs', '#ea580c', 'CreditCard', true, 4)
  ON CONFLICT (portal_id, slug) DO NOTHING;

  -- OPEX
  INSERT INTO finance_transaction_categories (portal_id, name, slug, type, color, icon, is_default, sort_order) VALUES
    (p_portal, 'Affitto / Utenze',            'affitto-utenze',          'opex', '#f87171', 'Home',       true, 1),
    (p_portal, 'Software & Abbonamenti',      'software-abbonamenti',    'opex', '#ef4444', 'Monitor',    true, 2),
    (p_portal, 'Marketing & Pubblicità',      'marketing-pubblicita',    'opex', '#fca5a5', 'Megaphone',  true, 3),
    (p_portal, 'Stipendi / Collaboratori',    'stipendi-collaboratori',  'opex', '#dc2626', 'Users',      true, 4),
    (p_portal, 'Tasse & Contributi',          'tasse-contributi',        'opex', '#b91c1c', 'Receipt',    true, 5),
    (p_portal, 'Spese Legali / Commercialista','spese-legali',           'opex', '#991b1b', 'Scale',      true, 6),
    (p_portal, 'Altro OPEX',                  'altro-opex',              'opex', '#7f1d1d', 'MoreHorizontal', true, 7)
  ON CONFLICT (portal_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Seed for all 3 business portals
SELECT seed_finance_categories('keylo');
SELECT seed_finance_categories('redx');
SELECT seed_finance_categories('trustme');

-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTER personal_transactions to add cost_classification + category_id
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS cost_classification TEXT CHECK (cost_classification IN ('revenue', 'cogs', 'opex', 'other')),
  ADD COLUMN IF NOT EXISTS category_id UUID;
