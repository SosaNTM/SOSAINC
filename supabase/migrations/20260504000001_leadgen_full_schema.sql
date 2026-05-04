-- ── Leadgen full schema — idempotent migration ────────────────────────────────
-- Covers all 5 leadgen tables with correct columns, indexes, RLS, and triggers.
-- Safe to run multiple times.

-- ── 1. leadgen_settings ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leadgen_settings (
  id                   UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id            UUID        NOT NULL UNIQUE,
  apify_token          TEXT,
  actor_id             TEXT        NOT NULL DEFAULT 'compass~google-maps-scraper',
  default_country_code TEXT        NOT NULL DEFAULT 'IT',
  default_language     TEXT        NOT NULL DEFAULT 'it',
  default_max_places   INT         NOT NULL DEFAULT 50,
  scrape_contacts      BOOLEAN     NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conditional column adds (idempotent)
DO $$ BEGIN
  ALTER TABLE public.leadgen_settings ADD COLUMN actor_id TEXT NOT NULL DEFAULT 'compass~google-maps-scraper';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

ALTER TABLE public.leadgen_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadgen_settings_all" ON public.leadgen_settings;
CREATE POLICY "leadgen_settings_all"
  ON public.leadgen_settings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 2. leadgen_searches ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leadgen_searches (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id        UUID        NOT NULL,
  country_code     TEXT        NOT NULL,
  postal_code      TEXT        NOT NULL,
  category         TEXT,
  categories       TEXT[]      NOT NULL DEFAULT '{}',
  status           TEXT        NOT NULL DEFAULT 'pending',
  apify_run_id     TEXT,
  apify_dataset_id TEXT,
  total_results    INT         NOT NULL DEFAULT 0,
  with_website     INT         NOT NULL DEFAULT 0,
  without_website  INT         NOT NULL DEFAULT 0,
  excluded_count   INT         NOT NULL DEFAULT 0,
  error_message    TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conditional column adds
DO $$ BEGIN
  ALTER TABLE public.leadgen_searches ADD COLUMN categories TEXT[] NOT NULL DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_searches ADD COLUMN excluded_count INT NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_searches ALTER COLUMN category DROP NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_leadgen_searches_portal_started
  ON public.leadgen_searches (portal_id, started_at DESC);

ALTER TABLE public.leadgen_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadgen_searches_all" ON public.leadgen_searches;
CREATE POLICY "leadgen_searches_all"
  ON public.leadgen_searches FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 3. leadgen_leads ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leadgen_leads (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id       UUID        NOT NULL,
  search_id       UUID        REFERENCES public.leadgen_searches(id) ON DELETE SET NULL,
  place_id        TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  address         TEXT,
  postal_code     TEXT,
  city            TEXT,
  country_code    TEXT,
  phone           TEXT,
  website         TEXT,
  category        TEXT,
  rating          NUMERIC(3,2),
  reviews_count   INT,
  emails          TEXT[]      NOT NULL DEFAULT '{}',
  social_media    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  has_website     BOOLEAN     GENERATED ALWAYS AS (website IS NOT NULL AND length(website) > 0) STORED,
  assigned_to     TEXT,
  outreach_status TEXT        NOT NULL DEFAULT 'new',
  outreach_notes  TEXT,
  contacted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (portal_id, place_id)
);

-- Conditional column add for assigned_to
DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN assigned_to TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_leadgen_leads_portal_has_website
  ON public.leadgen_leads (portal_id, has_website, outreach_status);

CREATE INDEX IF NOT EXISTS idx_leadgen_leads_portal_created
  ON public.leadgen_leads (portal_id, created_at DESC);

ALTER TABLE public.leadgen_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadgen_leads_all" ON public.leadgen_leads;
CREATE POLICY "leadgen_leads_all"
  ON public.leadgen_leads FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_leadgen_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leadgen_leads_updated_at ON public.leadgen_leads;
CREATE TRIGGER trg_leadgen_leads_updated_at
  BEFORE UPDATE ON public.leadgen_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_leadgen_leads_updated_at();

-- ── 4. leadgen_outreach_events ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leadgen_outreach_events (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id   UUID        NOT NULL,
  lead_id     UUID        NOT NULL REFERENCES public.leadgen_leads(id) ON DELETE CASCADE,
  channel     TEXT        NOT NULL,
  direction   TEXT        NOT NULL,
  notes       TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadgen_outreach_events_lead
  ON public.leadgen_outreach_events (portal_id, lead_id, occurred_at DESC);

ALTER TABLE public.leadgen_outreach_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadgen_outreach_events_all" ON public.leadgen_outreach_events;
CREATE POLICY "leadgen_outreach_events_all"
  ON public.leadgen_outreach_events FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 5. leadgen_blacklist ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leadgen_blacklist (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id  UUID        NOT NULL,
  rule_type  TEXT        NOT NULL,
  rule_value TEXT        NOT NULL,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadgen_blacklist_portal
  ON public.leadgen_blacklist (portal_id, rule_type, active);

ALTER TABLE public.leadgen_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadgen_blacklist_all" ON public.leadgen_blacklist;
CREATE POLICY "leadgen_blacklist_all"
  ON public.leadgen_blacklist FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
