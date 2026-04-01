-- ═══════════════════════════════════════════════════════════════════════════════
-- PROPER RLS POLICIES — Portal-scoped row-level security
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- ██████████████████████████████████████████████████████████████████████████████
-- ██  DO NOT APPLY UNTIL REAL SUPABASE AUTH IS LIVE                          ██
-- ██                                                                          ██
-- ██  The current app uses mock auth (MOCK_USERS in authContext.tsx).          ██
-- ██  auth.uid() returns NULL for all frontend requests, so enabling these     ██
-- ██  policies would lock out every user. Only run this migration AFTER:       ██
-- ██                                                                          ██
-- ██    1. supabaseAuth.ts is wired into authContext.tsx                       ██
-- ██    2. All users exist in Supabase auth.users                             ██
-- ██    3. portal_members rows reference real auth.users UUIDs                 ██
-- ██    4. VITE_USE_REAL_AUTH=true is set in .env                             ██
-- ██    5. This migration has been tested against a staging environment        ██
-- ██████████████████████████████████████████████████████████████████████████████
--
-- MANUAL REVIEW REQUIRED: This migration replaces blanket-permissive RLS
-- with proper portal isolation. Test thoroughly with multiple portal users
-- before deploying to production.
--
-- Pattern used throughout:
--   SELECT  → user is a member of the row's portal
--   INSERT  → user is an admin/owner of the target portal
--   UPDATE  → user is an admin/owner of the row's portal
--   DELETE  → user is an admin/owner of the row's portal
--
-- Helper subquery (used in every policy):
--   SELECT pm.portal_id FROM portal_members pm WHERE pm.user_id = auth.uid()
--   SELECT pm.portal_id FROM portal_members pm WHERE pm.user_id = auth.uid()
--     AND pm.role IN ('owner', 'admin')
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Drop all blanket-permissive "anon_all" policies
-- These were created by:
--   20260312000007_open_rls_for_mock_auth.sql  (tasks, projects)
--   20260316000001_open_rls_seed_portals.sql   (portals, portal_members,
--     portal_settings, + 25 settings tables)
-- ─────────────────────────────────────────────────────────────────────────────

-- From 20260312000007_open_rls_for_mock_auth.sql
DROP POLICY IF EXISTS "tasks_anon_all"    ON public.tasks;
DROP POLICY IF EXISTS "projects_anon_all" ON public.projects;

-- From 20260316000001_open_rls_seed_portals.sql (core tables)
DROP POLICY IF EXISTS "portals_anon_all"         ON public.portals;
DROP POLICY IF EXISTS "portal_members_anon_all"  ON public.portal_members;
DROP POLICY IF EXISTS "portal_settings_anon_all" ON public.portal_settings;

-- From 20260316000001_open_rls_seed_portals.sql (settings tables via loop)
DROP POLICY IF EXISTS "income_categories_anon_all"        ON public.income_categories;
DROP POLICY IF EXISTS "expense_categories_anon_all"       ON public.expense_categories;
DROP POLICY IF EXISTS "subscription_categories_anon_all"  ON public.subscription_categories;
DROP POLICY IF EXISTS "payment_methods_anon_all"          ON public.payment_methods;
DROP POLICY IF EXISTS "recurrence_rules_anon_all"         ON public.recurrence_rules;
DROP POLICY IF EXISTS "currency_settings_anon_all"        ON public.currency_settings;
DROP POLICY IF EXISTS "tax_rates_anon_all"                ON public.tax_rates;
DROP POLICY IF EXISTS "project_statuses_anon_all"         ON public.project_statuses;
DROP POLICY IF EXISTS "task_priorities_anon_all"           ON public.task_priorities;
DROP POLICY IF EXISTS "task_labels_anon_all"               ON public.task_labels;
DROP POLICY IF EXISTS "task_templates_anon_all"            ON public.task_templates;
DROP POLICY IF EXISTS "social_publishing_rules_anon_all"  ON public.social_publishing_rules;
DROP POLICY IF EXISTS "hashtag_sets_anon_all"              ON public.hashtag_sets;
DROP POLICY IF EXISTS "content_categories_anon_all"        ON public.content_categories;
DROP POLICY IF EXISTS "caption_templates_anon_all"         ON public.caption_templates;
DROP POLICY IF EXISTS "roles_anon_all"                     ON public.roles;
DROP POLICY IF EXISTS "role_permissions_anon_all"          ON public.role_permissions;
DROP POLICY IF EXISTS "departments_anon_all"               ON public.departments;
DROP POLICY IF EXISTS "portal_member_roles_anon_all"       ON public.portal_member_roles;
DROP POLICY IF EXISTS "notification_channels_anon_all"     ON public.notification_channels;
DROP POLICY IF EXISTS "alert_rules_anon_all"               ON public.alert_rules;
DROP POLICY IF EXISTS "notification_queue_anon_all"        ON public.notification_queue;
DROP POLICY IF EXISTS "portal_profiles_anon_all"           ON public.portal_profiles;
DROP POLICY IF EXISTS "appearance_settings_anon_all"       ON public.appearance_settings;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Create proper portal-scoped RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- ── portals ─────────────────────────────────────────────────────────────────
-- Users can see portals they are a member of. Only owners can modify portals.

CREATE POLICY "portals_select_member" ON public.portals
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "portals_manage_owner" ON public.portals
  FOR ALL TO authenticated
  USING (
    id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  );


-- ── portal_members ──────────────────────────────────────────────────────────
-- Members can see other members of their portal. Admins/owners can manage membership.

CREATE POLICY "portal_members_select" ON public.portal_members
  FOR SELECT TO authenticated
  USING (
    portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "portal_members_manage" ON public.portal_members
  FOR ALL TO authenticated
  USING (
    portal_id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    portal_id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  );


-- ── portal_settings ─────────────────────────────────────────────────────────

CREATE POLICY "portal_settings_select" ON public.portal_settings
  FOR SELECT TO authenticated
  USING (
    portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "portal_settings_manage" ON public.portal_settings
  FOR ALL TO authenticated
  USING (
    portal_id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    portal_id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  );


-- ── tasks ───────────────────────────────────────────────────────────────────
-- Tasks are scoped by portal_id. Members can view; admins/owners can manage.

CREATE POLICY "tasks_select_member" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "tasks_insert_member" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "tasks_update_member" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "tasks_delete_admin" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    portal_id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  );


-- ── projects ────────────────────────────────────────────────────────────────

CREATE POLICY "projects_select_member" ON public.projects
  FOR SELECT TO authenticated
  USING (
    portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "projects_insert_member" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "projects_update_member" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
  );

CREATE POLICY "projects_delete_admin" ON public.projects
  FOR DELETE TO authenticated
  USING (
    portal_id IN (
      SELECT pm.portal_id FROM public.portal_members pm
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
    )
  );


-- ── Finance settings tables (portal_id-scoped) ─────────────────────────────
-- Pattern: members SELECT, admins/owners manage (INSERT/UPDATE/DELETE)

-- This DO block creates 4 policies per table:
--   {table}_portal_select  — authenticated members of the portal can read
--   {table}_portal_insert  — admins/owners can insert
--   {table}_portal_update  — admins/owners can update
--   {table}_portal_delete  — admins/owners can delete

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'income_categories',
    'expense_categories',
    'subscription_categories',
    'payment_methods',
    'recurrence_rules',
    'currency_settings',
    'tax_rates'
  ]) LOOP
    -- SELECT: any portal member
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
      )',
      t || '_portal_select', t
    );

    -- INSERT: admin/owner
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_insert', t
    );

    -- UPDATE: admin/owner
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_update', t
    );

    -- DELETE: admin/owner
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_delete', t
    );
  END LOOP;
END $$;


-- ── Project/Task settings tables ────────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'project_statuses',
    'task_priorities',
    'task_labels',
    'task_templates'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
      )',
      t || '_portal_select', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_insert', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_update', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_delete', t
    );
  END LOOP;
END $$;


-- ── Social tables ───────────────────────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_publishing_rules',
    'hashtag_sets',
    'content_categories',
    'caption_templates'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
      )',
      t || '_portal_select', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_insert', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_update', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_delete', t
    );
  END LOOP;
END $$;


-- ── Team / roles tables ─────────────────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'roles',
    'role_permissions',
    'departments',
    'portal_member_roles'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
      )',
      t || '_portal_select', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_insert', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_update', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_delete', t
    );
  END LOOP;
END $$;


-- ── Notification tables ─────────────────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'notification_channels',
    'alert_rules',
    'notification_queue'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
      )',
      t || '_portal_select', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_insert', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_update', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_delete', t
    );
  END LOOP;
END $$;


-- ── Portal profile / appearance ─────────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'portal_profiles',
    'appearance_settings'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        portal_id IN (SELECT pm.portal_id FROM public.portal_members pm WHERE pm.user_id = auth.uid())
      )',
      t || '_portal_select', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_insert', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_update', t
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        portal_id IN (
          SELECT pm.portal_id FROM public.portal_members pm
          WHERE pm.user_id = auth.uid() AND pm.role IN (''owner'', ''admin'')
        )
      )',
      t || '_portal_delete', t
    );
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
--
-- Checklist before applying:
--   [ ] Real Supabase Auth is configured and users exist in auth.users
--   [ ] portal_members.user_id values reference real auth.users UUIDs
--   [ ] Tested in staging with multiple portal users across all 4 portals
--   [ ] Verified that service_role (Telegram bot, cron jobs) still bypasses RLS
--   [ ] Rolled back mock-auth "anon_all" policies are no longer needed
-- ═══════════════════════════════════════════════════════════════════════════════
