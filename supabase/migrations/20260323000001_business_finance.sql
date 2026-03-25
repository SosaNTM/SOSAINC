-- ═══════════════════════════════════════════════════════════════════════════════
-- BUSINESS FINANCE MODULE — Revenue, COGS, OPEX, Summary
-- Shared tables with portal_id isolation (keylo, redx, trustme)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Revenue ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_revenue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id     UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL DEFAULT auth.uid(),
  date          DATE NOT NULL,
  category      TEXT NOT NULL,
  subcategory   TEXT,
  description   TEXT,
  gross_amount  DECIMAL(12,2) NOT NULL,
  discounts     DECIMAL(12,2) DEFAULT 0,
  net_amount    DECIMAL(12,2) GENERATED ALWAYS AS (gross_amount - discounts) STORED,
  currency      TEXT DEFAULT 'EUR',
  client        TEXT,
  invoice_ref   TEXT,
  status        TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','projected')),
  is_deleted    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_biz_revenue_portal ON business_revenue(portal_id);
CREATE INDEX idx_biz_revenue_date   ON business_revenue(portal_id, date);

ALTER TABLE business_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biz_revenue_select" ON business_revenue
  FOR SELECT USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_revenue_insert" ON business_revenue
  FOR INSERT WITH CHECK (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_revenue_update" ON business_revenue
  FOR UPDATE USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_revenue_delete" ON business_revenue
  FOR DELETE USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));

-- ── COGS (Cost of Goods Sold) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_cogs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id         UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL DEFAULT auth.uid(),
  date              DATE NOT NULL,
  category          TEXT NOT NULL,
  description       TEXT,
  amount            DECIMAL(12,2) NOT NULL,
  linked_revenue_id UUID REFERENCES business_revenue(id) ON DELETE SET NULL,
  vendor            TEXT,
  currency          TEXT DEFAULT 'EUR',
  is_deleted        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_biz_cogs_portal ON business_cogs(portal_id);
CREATE INDEX idx_biz_cogs_date   ON business_cogs(portal_id, date);

ALTER TABLE business_cogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biz_cogs_select" ON business_cogs
  FOR SELECT USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_cogs_insert" ON business_cogs
  FOR INSERT WITH CHECK (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_cogs_update" ON business_cogs
  FOR UPDATE USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_cogs_delete" ON business_cogs
  FOR DELETE USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));

-- ── OPEX (Operating Expenses) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_opex (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id    UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL DEFAULT auth.uid(),
  date         DATE NOT NULL,
  category     TEXT NOT NULL,
  subcategory  TEXT,
  description  TEXT,
  amount       DECIMAL(12,2) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  frequency    TEXT CHECK (frequency IN ('monthly','quarterly','annual','one_time')),
  vendor       TEXT,
  currency     TEXT DEFAULT 'EUR',
  is_deleted   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_biz_opex_portal ON business_opex(portal_id);
CREATE INDEX idx_biz_opex_date   ON business_opex(portal_id, date);

ALTER TABLE business_opex ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biz_opex_select" ON business_opex
  FOR SELECT USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_opex_insert" ON business_opex
  FOR INSERT WITH CHECK (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_opex_update" ON business_opex
  FOR UPDATE USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_opex_delete" ON business_opex
  FOR DELETE USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));

-- ── Finance Summary (computed per period) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_finance_summary (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id        UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  period           TEXT NOT NULL,
  period_type      TEXT NOT NULL CHECK (period_type IN ('monthly','quarterly','annual')),
  gross_revenue    DECIMAL(12,2) DEFAULT 0,
  net_revenue      DECIMAL(12,2) DEFAULT 0,
  total_cogs       DECIMAL(12,2) DEFAULT 0,
  gross_profit     DECIMAL(12,2) DEFAULT 0,
  gross_margin_pct DECIMAL(5,2) DEFAULT 0,
  total_opex       DECIMAL(12,2) DEFAULT 0,
  ebitda           DECIMAL(12,2) DEFAULT 0,
  ebitda_margin_pct DECIMAL(5,2) DEFAULT 0,
  net_income       DECIMAL(12,2) DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portal_id, period, period_type)
);

CREATE INDEX idx_biz_summary_portal ON business_finance_summary(portal_id, period_type);

ALTER TABLE business_finance_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biz_summary_select" ON business_finance_summary
  FOR SELECT USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));
CREATE POLICY "biz_summary_upsert" ON business_finance_summary
  FOR ALL USING (portal_id IN (SELECT id FROM portal_members pm WHERE pm.user_id = auth.uid()));

-- ── Summary Calculation Function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_finance_summary(
  p_portal_id UUID,
  p_period TEXT,
  p_period_type TEXT DEFAULT 'monthly'
)
RETURNS VOID AS $$
DECLARE
  v_start DATE;
  v_end   DATE;
  v_gross DECIMAL(12,2);
  v_net   DECIMAL(12,2);
  v_cogs  DECIMAL(12,2);
  v_opex  DECIMAL(12,2);
  v_gp    DECIMAL(12,2);
  v_gm    DECIMAL(5,2);
  v_ebitda DECIMAL(12,2);
  v_em    DECIMAL(5,2);
BEGIN
  -- Derive date range from period string
  IF p_period_type = 'monthly' THEN
    v_start := (p_period || '-01')::DATE;
    v_end   := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSIF p_period_type = 'quarterly' THEN
    v_start := (SUBSTRING(p_period FROM 1 FOR 4) || '-' ||
      CASE SUBSTRING(p_period FROM 7)
        WHEN '1' THEN '01' WHEN '2' THEN '04'
        WHEN '3' THEN '07' WHEN '4' THEN '10'
      END || '-01')::DATE;
    v_end := (v_start + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
  ELSIF p_period_type = 'annual' THEN
    v_start := (p_period || '-01-01')::DATE;
    v_end   := (p_period || '-12-31')::DATE;
  END IF;

  -- Aggregate
  SELECT COALESCE(SUM(gross_amount), 0), COALESCE(SUM(net_amount), 0)
    INTO v_gross, v_net
    FROM business_revenue
    WHERE portal_id = p_portal_id AND date BETWEEN v_start AND v_end
      AND is_deleted = false AND status != 'projected';

  SELECT COALESCE(SUM(amount), 0) INTO v_cogs
    FROM business_cogs
    WHERE portal_id = p_portal_id AND date BETWEEN v_start AND v_end AND is_deleted = false;

  SELECT COALESCE(SUM(amount), 0) INTO v_opex
    FROM business_opex
    WHERE portal_id = p_portal_id AND date BETWEEN v_start AND v_end AND is_deleted = false;

  v_gp := v_net - v_cogs;
  v_gm := CASE WHEN v_net > 0 THEN ROUND((v_gp / v_net) * 100, 2) ELSE 0 END;
  v_ebitda := v_gp - v_opex;
  v_em := CASE WHEN v_net > 0 THEN ROUND((v_ebitda / v_net) * 100, 2) ELSE 0 END;

  INSERT INTO business_finance_summary
    (portal_id, period, period_type, gross_revenue, net_revenue, total_cogs,
     gross_profit, gross_margin_pct, total_opex, ebitda, ebitda_margin_pct, net_income, updated_at)
  VALUES
    (p_portal_id, p_period, p_period_type, v_gross, v_net, v_cogs,
     v_gp, v_gm, v_opex, v_ebitda, v_em, v_ebitda, NOW())
  ON CONFLICT (portal_id, period, period_type)
  DO UPDATE SET
    gross_revenue = EXCLUDED.gross_revenue,
    net_revenue = EXCLUDED.net_revenue,
    total_cogs = EXCLUDED.total_cogs,
    gross_profit = EXCLUDED.gross_profit,
    gross_margin_pct = EXCLUDED.gross_margin_pct,
    total_opex = EXCLUDED.total_opex,
    ebitda = EXCLUDED.ebitda,
    ebitda_margin_pct = EXCLUDED.ebitda_margin_pct,
    net_income = EXCLUDED.net_income,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Updated_at triggers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_biz_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_biz_revenue_updated BEFORE UPDATE ON business_revenue
  FOR EACH ROW EXECUTE FUNCTION update_biz_updated_at();
CREATE TRIGGER trg_biz_cogs_updated BEFORE UPDATE ON business_cogs
  FOR EACH ROW EXECUTE FUNCTION update_biz_updated_at();
CREATE TRIGGER trg_biz_opex_updated BEFORE UPDATE ON business_opex
  FOR EACH ROW EXECUTE FUNCTION update_biz_updated_at();
