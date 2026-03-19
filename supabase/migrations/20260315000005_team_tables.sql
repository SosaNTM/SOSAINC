-- ── roles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id    uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  color        text NOT NULL DEFAULT '#6B7280',
  is_system    boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── role_permissions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  role_id     uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module      text NOT NULL,
  can_view    boolean NOT NULL DEFAULT false,
  can_create  boolean NOT NULL DEFAULT false,
  can_edit    boolean NOT NULL DEFAULT false,
  can_delete  boolean NOT NULL DEFAULT false,
  can_export  boolean NOT NULL DEFAULT false,
  UNIQUE (role_id, module)
);

-- ── departments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name          text NOT NULL,
  color         text NOT NULL DEFAULT '#6B7280',
  description   text,
  head_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_count  integer NOT NULL DEFAULT 0,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── portal_member_roles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_member_roles (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id       uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_id, user_id, role_id)
);

CREATE TRIGGER trg_roles_updated_at       BEFORE UPDATE ON public.roles       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_member_roles  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select_roles" ON public.roles
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_roles" ON public.roles
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_role_permissions" ON public.role_permissions
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_role_permissions" ON public.role_permissions
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_departments" ON public.departments
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_departments" ON public.departments
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_member_roles" ON public.portal_member_roles
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_member_roles" ON public.portal_member_roles
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));
