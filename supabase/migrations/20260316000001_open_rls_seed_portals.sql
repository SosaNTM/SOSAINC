-- ═══════════════════════════════════════════════════════════════════
-- The app uses mock auth — auth.uid() is always null for frontend
-- requests. Open RLS on all settings tables to anon + authenticated,
-- then seed the 4 static portals with known UUIDs so the frontend
-- can look them up by slug.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Make owner_id nullable (no real auth.users rows yet) ───────────
ALTER TABLE public.portals ALTER COLUMN owner_id DROP NOT NULL;

-- ── 2. Open portals + portal_members + portal_settings ───────────────
DROP POLICY IF EXISTS "portal_members_can_view"        ON public.portals;
DROP POLICY IF EXISTS "owners_can_manage_portal"       ON public.portals;
CREATE POLICY "portals_anon_all" ON public.portals
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "view_own_portal_members"        ON public.portal_members;
DROP POLICY IF EXISTS "admins_manage_members"          ON public.portal_members;
CREATE POLICY "portal_members_anon_all" ON public.portal_members
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "members_view_portal_settings"   ON public.portal_settings;
DROP POLICY IF EXISTS "admins_update_portal_settings"  ON public.portal_settings;
CREATE POLICY "portal_settings_anon_all" ON public.portal_settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 3. Open RLS on all settings tables ───────────────────────────────
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'income_categories','expense_categories','subscription_categories',
    'payment_methods','recurrence_rules','currency_settings','tax_rates',
    'project_statuses','task_priorities','task_labels','task_templates',
    'social_publishing_rules','hashtag_sets','content_categories','caption_templates',
    'roles','role_permissions','departments','portal_member_roles',
    'notification_channels','alert_rules','notification_queue',
    'portal_profiles','appearance_settings'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      'portal_members_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      'portal_admins_manage_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      'pm_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      'pa_manage_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t || '_anon_all', t
    );
  END LOOP;
END $$;

-- ── 4. Seed the 4 static portals with known UUIDs ────────────────────
INSERT INTO public.portals (id, name, slug, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'SOSA INC.',  'sosa',    'Corporate management & operations'),
  ('00000000-0000-0000-0000-000000000002', 'KEYLO',      'keylo',   'Access control & security hub'),
  ('00000000-0000-0000-0000-000000000003', 'REDX',       'redx',    'Performance & growth operations'),
  ('00000000-0000-0000-0000-000000000004', 'TRUST ME',   'trustme', 'Compliance, legal & trust layer')
ON CONFLICT (slug) DO NOTHING;

-- ── 5. Seed default data for each portal ─────────────────────────────
SELECT public.seed_portal_defaults('00000000-0000-0000-0000-000000000001');
SELECT public.seed_portal_defaults('00000000-0000-0000-0000-000000000002');
SELECT public.seed_portal_defaults('00000000-0000-0000-0000-000000000003');
SELECT public.seed_portal_defaults('00000000-0000-0000-0000-000000000004');
