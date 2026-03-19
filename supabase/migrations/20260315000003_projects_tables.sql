-- ── project_statuses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_statuses (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6B7280',
  icon        text NOT NULL DEFAULT 'Circle',
  is_final    boolean NOT NULL DEFAULT false,
  is_default  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── task_priorities ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_priorities (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6B7280',
  icon        text NOT NULL DEFAULT 'Flag',
  level       integer NOT NULL DEFAULT 0,
  is_default  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── task_labels ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_labels (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6B7280',
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── task_templates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_templates (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  checklist     jsonb NOT NULL DEFAULT '[]',
  priority_id   uuid REFERENCES public.task_priorities(id) ON DELETE SET NULL,
  estimated_h   numeric(6,2),
  tags          text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── updated_at triggers ───────────────────────────────────────────────
CREATE TRIGGER trg_proj_status_updated_at  BEFORE UPDATE ON public.project_statuses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_task_prio_updated_at    BEFORE UPDATE ON public.task_priorities   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_task_label_updated_at   BEFORE UPDATE ON public.task_labels       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_task_tmpl_updated_at    BEFORE UPDATE ON public.task_templates    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.project_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_priorities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select_project_statuses" ON public.project_statuses
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_project_statuses" ON public.project_statuses
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_task_priorities" ON public.task_priorities
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_task_priorities" ON public.task_priorities
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_task_labels" ON public.task_labels
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_task_labels" ON public.task_labels
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_task_templates" ON public.task_templates
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_task_templates" ON public.task_templates
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));
