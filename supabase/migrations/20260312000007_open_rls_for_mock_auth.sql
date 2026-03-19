-- ═══════════════════════════════════════════════════════════════════
-- Open tasks + projects to the anon role so the frontend can
-- read/write without real Supabase auth.
-- The app uses mock auth (usr_001…usr_005) — auth.uid() is always
-- null for frontend requests, so the existing RLS policies block
-- everything. We drop those and add permissive anon policies.
-- The Telegram bot uses service_role which bypasses RLS entirely,
-- so this change doesn't affect bot behaviour.
-- ═══════════════════════════════════════════════════════════════════

-- ── tasks ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_select_own"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own"  ON public.tasks;

CREATE POLICY "tasks_anon_all" ON public.tasks
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── projects ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;

CREATE POLICY "projects_anon_all" ON public.projects
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
