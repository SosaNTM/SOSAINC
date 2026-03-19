-- ═══════════════════════════════════════════════════════════════════
-- Projects & Tasks Schema (mirrors linearStore.ts Issue interface)
-- user_id / assigned_to / creator_id are TEXT (no FK) so both
-- real Supabase auth UUIDs and local mock IDs (e.g. usr_001) work.
-- ═══════════════════════════════════════════════════════════════════

-- ── Projects ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('planning','in_progress','completed','paused')),
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_own" ON public.projects FOR SELECT
  USING (auth.uid()::text = user_id);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE
  USING (auth.uid()::text = user_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE
  USING (auth.uid()::text = user_id);

-- ── Tasks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('backlog','todo','in_progress','in_review','done','cancelled')),
  priority    TEXT NOT NULL DEFAULT 'none'
                CHECK (priority IN ('none','urgent','high','medium','low')),
  assigned_to TEXT,
  creator_id  TEXT NOT NULL,
  labels      TEXT[] NOT NULL DEFAULT '{}',
  project_id  TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  due_date    DATE,
  estimate    NUMERIC,               -- hours
  parent_id   TEXT REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to  ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id   ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority     ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id    ON public.tasks(parent_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT
  USING (auth.uid()::text = assigned_to OR auth.uid()::text = creator_id);
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT
  WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE
  USING (auth.uid()::text = assigned_to OR auth.uid()::text = creator_id);
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE
  USING (auth.uid()::text = creator_id);
