-- ── Leadgen team management schema — idempotent ────────────────────────────────

-- ── 1. leadgen_members ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leadgen_members (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id    UUID        NOT NULL,
  user_id      UUID        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'sales',    -- 'owner' | 'admin' | 'sales'
  team         TEXT        NOT NULL DEFAULT 'internal', -- 'internal' | 'external'
  display_name TEXT,
  active       BOOLEAN     NOT NULL DEFAULT true,
  notes        TEXT,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by     UUID,
  UNIQUE (portal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leadgen_members_portal_active
  ON public.leadgen_members (portal_id, active);
CREATE INDEX IF NOT EXISTS idx_leadgen_members_user
  ON public.leadgen_members (user_id);

ALTER TABLE public.leadgen_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadgen_members_all" ON public.leadgen_members;
CREATE POLICY "leadgen_members_all"
  ON public.leadgen_members FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 2. Alter leadgen_leads ────────────────────────────────────────────────────

-- Change assigned_to from TEXT to UUID (safe: all existing values are NULL)
DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ALTER COLUMN assigned_to TYPE UUID USING assigned_to::UUID;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN assigned_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN assigned_by UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN visibility TEXT NOT NULL DEFAULT 'team';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN last_activity_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_leadgen_leads_assigned
  ON public.leadgen_leads (portal_id, assigned_to, outreach_status);

CREATE INDEX IF NOT EXISTS idx_leadgen_leads_pool
  ON public.leadgen_leads (portal_id, outreach_status)
  WHERE assigned_to IS NULL;

-- ── 3. Alter leadgen_outreach_events ─────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.leadgen_outreach_events ADD COLUMN user_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
