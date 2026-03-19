-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── portals ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portals (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  logo_url      text,
  description   text,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── portal_members ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_members (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_id, user_id)
);

-- ── portal_settings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_settings (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL UNIQUE REFERENCES public.portals(id) ON DELETE CASCADE,
  settings    jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── updated_at trigger function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portals_updated_at
  BEFORE UPDATE ON public.portals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_portal_settings_updated_at
  BEFORE UPDATE ON public.portal_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.portals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

-- portals: visible to members
CREATE POLICY "portal_members_can_view" ON public.portals
  FOR SELECT USING (
    id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid())
  );

CREATE POLICY "owners_can_manage_portal" ON public.portals
  FOR ALL USING (owner_id = auth.uid());

-- portal_members: members see own portal's members
CREATE POLICY "view_own_portal_members" ON public.portal_members
  FOR SELECT USING (
    portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid())
  );

CREATE POLICY "admins_manage_members" ON public.portal_members
  FOR ALL USING (
    portal_id IN (
      SELECT portal_id FROM public.portal_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- portal_settings: members can view, admins can update
CREATE POLICY "members_view_portal_settings" ON public.portal_settings
  FOR SELECT USING (
    portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid())
  );

CREATE POLICY "admins_update_portal_settings" ON public.portal_settings
  FOR ALL USING (
    portal_id IN (
      SELECT portal_id FROM public.portal_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- ── auto-create portal_settings row when portal is inserted ───────────
CREATE OR REPLACE FUNCTION public.create_default_portal_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.portal_settings (portal_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_portal_settings
  AFTER INSERT ON public.portals
  FOR EACH ROW EXECUTE FUNCTION public.create_default_portal_settings();

-- ── auto-add owner as member ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.portal_members (portal_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (portal_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_owner_as_member
  AFTER INSERT ON public.portals
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();
-- ── income_categories ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.income_categories (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name        text NOT NULL,
  icon        text NOT NULL DEFAULT 'DollarSign',
  color       text NOT NULL DEFAULT '#C6A961',
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── expense_categories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id          uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name               text NOT NULL,
  icon               text NOT NULL DEFAULT 'ShoppingCart',
  color              text NOT NULL DEFAULT '#EF4444',
  description        text,
  monthly_budget     numeric(12,2),
  alert_threshold    integer CHECK (alert_threshold BETWEEN 0 AND 100),
  is_active          boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── subscription_categories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_categories (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id        uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name             text NOT NULL,
  icon             text NOT NULL DEFAULT 'Zap',
  color            text NOT NULL DEFAULT '#8B5CF6',
  billing_cycle    text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','annual')),
  reminder_days    integer NOT NULL DEFAULT 3,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── payment_methods ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id    uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name         text NOT NULL,
  type         text NOT NULL DEFAULT 'card' CHECK (type IN ('card','bank','cash','digital','crypto')),
  last_four    text,
  is_default   boolean NOT NULL DEFAULT false,
  is_active    boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── recurrence_rules ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id       uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name            text NOT NULL,
  direction       text NOT NULL DEFAULT 'uscita' CHECK (direction IN ('entrata','uscita')),
  frequency       text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','annual')),
  next_run_at     date,
  amount          numeric(12,2),
  category_id     uuid,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── currency_settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.currency_settings (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id         uuid NOT NULL UNIQUE REFERENCES public.portals(id) ON DELETE CASCADE,
  primary_currency  text NOT NULL DEFAULT 'EUR',
  symbol_position   text NOT NULL DEFAULT 'before' CHECK (symbol_position IN ('before','after')),
  decimal_separator text NOT NULL DEFAULT ',' CHECK (decimal_separator IN (',','.')),
  thousands_sep     text NOT NULL DEFAULT '.' CHECK (thousands_sep IN ('.', ',',' ','')),
  secondary_currencies text[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── tax_rates ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name        text NOT NULL,
  rate        numeric(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  is_default  boolean NOT NULL DEFAULT false,
  applies_to  text NOT NULL DEFAULT 'both' CHECK (applies_to IN ('income','expense','both')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── updated_at triggers ───────────────────────────────────────────────
CREATE TRIGGER trg_income_cat_updated_at   BEFORE UPDATE ON public.income_categories   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_expense_cat_updated_at  BEFORE UPDATE ON public.expense_categories  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sub_cat_updated_at      BEFORE UPDATE ON public.subscription_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pay_methods_updated_at  BEFORE UPDATE ON public.payment_methods     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recur_rules_updated_at  BEFORE UPDATE ON public.recurrence_rules    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_currency_updated_at     BEFORE UPDATE ON public.currency_settings   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tax_rates_updated_at    BEFORE UPDATE ON public.tax_rates           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.income_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrence_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates               ENABLE ROW LEVEL SECURITY;

-- Generic helper macro (applied to all finance tables)
CREATE POLICY "portal_members_select_income_categories" ON public.income_categories
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "portal_admins_manage_income_categories" ON public.income_categories
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "portal_members_select_expense_categories" ON public.expense_categories
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "portal_admins_manage_expense_categories" ON public.expense_categories
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "portal_members_select_sub_categories" ON public.subscription_categories
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "portal_admins_manage_sub_categories" ON public.subscription_categories
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "portal_members_select_payment_methods" ON public.payment_methods
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "portal_admins_manage_payment_methods" ON public.payment_methods
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "portal_members_select_recurrence_rules" ON public.recurrence_rules
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "portal_admins_manage_recurrence_rules" ON public.recurrence_rules
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "portal_members_select_currency_settings" ON public.currency_settings
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "portal_admins_manage_currency_settings" ON public.currency_settings
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "portal_members_select_tax_rates" ON public.tax_rates
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "portal_admins_manage_tax_rates" ON public.tax_rates
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));
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
-- ── social_publishing_rules ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_publishing_rules (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id          uuid NOT NULL UNIQUE REFERENCES public.portals(id) ON DELETE CASCADE,
  schedule           jsonb NOT NULL DEFAULT '{}',
  auto_hashtags      boolean NOT NULL DEFAULT true,
  require_approval   boolean NOT NULL DEFAULT false,
  watermark_enabled  boolean NOT NULL DEFAULT false,
  watermark_text     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── hashtag_sets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hashtag_sets (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name        text NOT NULL,
  hashtags    text[] NOT NULL DEFAULT '{}',
  platforms   text[] NOT NULL DEFAULT '{}',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── content_categories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_categories (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name          text NOT NULL,
  color         text NOT NULL DEFAULT '#6B7280',
  platforms     text[] NOT NULL DEFAULT '{}',
  frequency     text,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── caption_templates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.caption_templates (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id    uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name         text NOT NULL,
  platform     text,
  body         text NOT NULL DEFAULT '',
  variables    text[] NOT NULL DEFAULT '{}',
  category_id  uuid REFERENCES public.content_categories(id) ON DELETE SET NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_soc_pub_rules_updated_at  BEFORE UPDATE ON public.social_publishing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hashtag_sets_updated_at   BEFORE UPDATE ON public.hashtag_sets            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_content_cat_updated_at    BEFORE UPDATE ON public.content_categories      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_caption_tmpl_updated_at   BEFORE UPDATE ON public.caption_templates       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.social_publishing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtag_sets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caption_templates       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select_social_publishing_rules" ON public.social_publishing_rules
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_social_publishing_rules" ON public.social_publishing_rules
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_hashtag_sets" ON public.hashtag_sets
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_hashtag_sets" ON public.hashtag_sets
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_content_categories" ON public.content_categories
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_content_categories" ON public.content_categories
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_caption_templates" ON public.caption_templates
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_caption_templates" ON public.caption_templates
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));
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
-- ── notification_channels ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_channels (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id        uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  channel_type     text NOT NULL CHECK (channel_type IN ('in_app','email','telegram','browser_push')),
  is_enabled       boolean NOT NULL DEFAULT true,
  quiet_hours_from time,
  quiet_hours_to   time,
  quiet_days       text[] NOT NULL DEFAULT '{}',
  config           jsonb NOT NULL DEFAULT '{}',
  UNIQUE (portal_id, channel_type),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── alert_rules ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id    uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  name         text NOT NULL,
  trigger_type text NOT NULL,
  priority     text NOT NULL DEFAULT 'info' CHECK (priority IN ('info','warning','critical')),
  channels     text[] NOT NULL DEFAULT '{in_app}',
  conditions   jsonb NOT NULL DEFAULT '{}',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── notification_queue ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id    uuid NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_rule_id uuid REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  channel_type text NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  priority     text NOT NULL DEFAULT 'info',
  is_read      boolean NOT NULL DEFAULT false,
  sent_at      timestamptz,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_notif_chan_updated_at  BEFORE UPDATE ON public.notification_channels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_alert_rules_updated_at BEFORE UPDATE ON public.alert_rules           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select_notif_channels" ON public.notification_channels
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_notif_channels" ON public.notification_channels
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_alert_rules" ON public.alert_rules
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_alert_rules" ON public.alert_rules
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "users_select_own_notifications" ON public.notification_queue
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_update_own_notifications" ON public.notification_queue
  FOR UPDATE USING (user_id = auth.uid());
-- ── portal_profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_profiles (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     uuid NOT NULL UNIQUE REFERENCES public.portals(id) ON DELETE CASCADE,
  legal_name    text,
  vat_number    text,
  address_line1 text,
  address_line2 text,
  city          text,
  state         text,
  zip           text,
  country       text NOT NULL DEFAULT 'IT',
  phone         text,
  website       text,
  language      text NOT NULL DEFAULT 'it',
  timezone      text NOT NULL DEFAULT 'Europe/Rome',
  date_format   text NOT NULL DEFAULT 'DD/MM/YYYY',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── appearance_settings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appearance_settings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id       uuid NOT NULL UNIQUE REFERENCES public.portals(id) ON DELETE CASCADE,
  theme           text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','auto')),
  accent_color    text NOT NULL DEFAULT '#C6A961',
  font_family     text NOT NULL DEFAULT 'inter',
  sidebar_density text NOT NULL DEFAULT 'compact' CHECK (sidebar_density IN ('compact','comfortable','spacious')),
  sidebar_style   text NOT NULL DEFAULT 'icons_labels' CHECK (sidebar_style IN ('icons_only','icons_labels','full_width')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_portal_profile_updated_at    BEFORE UPDATE ON public.portal_profiles    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_appearance_updated_at        BEFORE UPDATE ON public.appearance_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.portal_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appearance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select_portal_profile" ON public.portal_profiles
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_portal_profile" ON public.portal_profiles
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "pm_select_appearance" ON public.appearance_settings
  FOR SELECT USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));
CREATE POLICY "pa_manage_appearance" ON public.appearance_settings
  FOR ALL USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));
-- Seed default data for a newly created portal
-- Called by trigger after portal is created, or manually for existing portals.

CREATE OR REPLACE FUNCTION public.seed_portal_defaults(p_portal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- ── portal_profiles ────────────────────────────────────────────────
  INSERT INTO public.portal_profiles (portal_id)
  VALUES (p_portal_id)
  ON CONFLICT (portal_id) DO NOTHING;

  -- ── appearance_settings ────────────────────────────────────────────
  INSERT INTO public.appearance_settings (portal_id)
  VALUES (p_portal_id)
  ON CONFLICT (portal_id) DO NOTHING;

  -- ── currency_settings ──────────────────────────────────────────────
  INSERT INTO public.currency_settings (portal_id)
  VALUES (p_portal_id)
  ON CONFLICT (portal_id) DO NOTHING;

  -- ── social_publishing_rules ────────────────────────────────────────
  INSERT INTO public.social_publishing_rules (portal_id)
  VALUES (p_portal_id)
  ON CONFLICT (portal_id) DO NOTHING;

  -- ── income_categories ──────────────────────────────────────────────
  INSERT INTO public.income_categories (portal_id, name, icon, color, sort_order) VALUES
    (p_portal_id, 'Stipendio',         'Briefcase',    '#22C55E', 0),
    (p_portal_id, 'Freelance',         'Laptop',       '#3B82F6', 1),
    (p_portal_id, 'Investimenti',      'TrendingUp',   '#8B5CF6', 2),
    (p_portal_id, 'Affitti',           'Home',         '#F59E0B', 3),
    (p_portal_id, 'Rimborsi',          'RefreshCw',    '#06B6D4', 4),
    (p_portal_id, 'Altro',             'Plus',         '#6B7280', 5)
  ON CONFLICT DO NOTHING;

  -- ── expense_categories ─────────────────────────────────────────────
  INSERT INTO public.expense_categories (portal_id, name, icon, color, sort_order) VALUES
    (p_portal_id, 'Affitto/Mutuo',     'Home',         '#EF4444', 0),
    (p_portal_id, 'Alimentari',        'ShoppingCart', '#F97316', 1),
    (p_portal_id, 'Trasporti',         'Car',          '#EAB308', 2),
    (p_portal_id, 'Salute',            'Heart',        '#EC4899', 3),
    (p_portal_id, 'Intrattenimento',   'Music',        '#8B5CF6', 4),
    (p_portal_id, 'Abbigliamento',     'Shirt',        '#06B6D4', 5),
    (p_portal_id, 'Formazione',        'BookOpen',     '#3B82F6', 6),
    (p_portal_id, 'Utenze',            'Zap',          '#F59E0B', 7),
    (p_portal_id, 'Assicurazioni',     'Shield',       '#6B7280', 8),
    (p_portal_id, 'Viaggi',            'Plane',        '#10B981', 9),
    (p_portal_id, 'Altro',             'Plus',         '#6B7280', 10)
  ON CONFLICT DO NOTHING;

  -- ── subscription_categories ────────────────────────────────────────
  INSERT INTO public.subscription_categories (portal_id, name, icon, color, billing_cycle, sort_order) VALUES
    (p_portal_id, 'Streaming',         'Play',         '#EF4444', 'monthly',  0),
    (p_portal_id, 'Software',          'Monitor',      '#3B82F6', 'monthly',  1),
    (p_portal_id, 'Cloud Storage',     'Cloud',        '#06B6D4', 'annual',   2),
    (p_portal_id, 'Notizie & Media',   'Newspaper',    '#F59E0B', 'monthly',  3),
    (p_portal_id, 'Fitness',           'Activity',     '#22C55E', 'monthly',  4),
    (p_portal_id, 'Gaming',            'Gamepad2',     '#8B5CF6', 'monthly',  5),
    (p_portal_id, 'Produttività',      'Zap',          '#EC4899', 'annual',   6),
    (p_portal_id, 'Sicurezza',         'Shield',       '#6B7280', 'annual',   7),
    (p_portal_id, 'Altro',             'Plus',         '#9CA3AF', 'monthly',  8)
  ON CONFLICT DO NOTHING;

  -- ── payment_methods ────────────────────────────────────────────────
  INSERT INTO public.payment_methods (portal_id, name, type, is_default, sort_order) VALUES
    (p_portal_id, 'Carta di Credito',  'card',    true,  0),
    (p_portal_id, 'Conto Corrente',    'bank',    false, 1),
    (p_portal_id, 'Contanti',          'cash',    false, 2)
  ON CONFLICT DO NOTHING;

  -- ── project_statuses ──────────────────────────────────────────────
  INSERT INTO public.project_statuses (portal_id, name, color, icon, is_default, is_final, sort_order) VALUES
    (p_portal_id, 'Backlog',      '#6B7280', 'Circle',       true,  false, 0),
    (p_portal_id, 'In Progress',  '#3B82F6', 'PlayCircle',   false, false, 1),
    (p_portal_id, 'In Review',    '#F59E0B', 'Eye',          false, false, 2),
    (p_portal_id, 'Done',         '#22C55E', 'CheckCircle2', false, true,  3),
    (p_portal_id, 'Cancelled',    '#EF4444', 'XCircle',      false, true,  4)
  ON CONFLICT DO NOTHING;

  -- ── task_priorities ────────────────────────────────────────────────
  INSERT INTO public.task_priorities (portal_id, name, color, icon, level, is_default, sort_order) VALUES
    (p_portal_id, 'Urgente',    '#EF4444', 'AlertOctagon', 4, false, 0),
    (p_portal_id, 'Alta',       '#F97316', 'Flag',         3, false, 1),
    (p_portal_id, 'Media',      '#F59E0B', 'Flag',         2, true,  2),
    (p_portal_id, 'Bassa',      '#3B82F6', 'Flag',         1, false, 3),
    (p_portal_id, 'Minima',     '#6B7280', 'Minus',        0, false, 4)
  ON CONFLICT DO NOTHING;

  -- ── task_labels ────────────────────────────────────────────────────
  INSERT INTO public.task_labels (portal_id, name, color) VALUES
    (p_portal_id, 'Bug',        '#EF4444'),
    (p_portal_id, 'Feature',    '#3B82F6'),
    (p_portal_id, 'Design',     '#8B5CF6'),
    (p_portal_id, 'Backend',    '#22C55E'),
    (p_portal_id, 'Frontend',   '#F59E0B'),
    (p_portal_id, 'Docs',       '#06B6D4'),
    (p_portal_id, 'Marketing',  '#EC4899')
  ON CONFLICT DO NOTHING;

  -- ── notification_channels ──────────────────────────────────────────
  INSERT INTO public.notification_channels (portal_id, channel_type, is_enabled) VALUES
    (p_portal_id, 'in_app',         true),
    (p_portal_id, 'email',          true),
    (p_portal_id, 'telegram',       false),
    (p_portal_id, 'browser_push',   false)
  ON CONFLICT (portal_id, channel_type) DO NOTHING;

  -- ── content_categories ────────────────────────────────────────────
  INSERT INTO public.content_categories (portal_id, name, color, sort_order) VALUES
    (p_portal_id, 'Educational',    '#3B82F6', 0),
    (p_portal_id, 'Promotional',    '#EF4444', 1),
    (p_portal_id, 'Behind Scenes',  '#8B5CF6', 2),
    (p_portal_id, 'User Generated', '#22C55E', 3),
    (p_portal_id, 'Trending',       '#F59E0B', 4),
    (p_portal_id, 'News',           '#06B6D4', 5),
    (p_portal_id, 'Tutorials',      '#EC4899', 6),
    (p_portal_id, 'Altro',          '#6B7280', 7)
  ON CONFLICT DO NOTHING;

  -- ── tax_rates ──────────────────────────────────────────────────────
  INSERT INTO public.tax_rates (portal_id, name, rate, is_default, applies_to) VALUES
    (p_portal_id, 'IVA 22%',   22.00, true,  'both'),
    (p_portal_id, 'IVA 10%',   10.00, false, 'both'),
    (p_portal_id, 'IVA 4%',     4.00, false, 'both'),
    (p_portal_id, 'Esente',     0.00, false, 'both')
  ON CONFLICT DO NOTHING;

  -- ── departments ────────────────────────────────────────────────────
  INSERT INTO public.departments (portal_id, name, color, sort_order) VALUES
    (p_portal_id, 'Management',   '#C6A961', 0),
    (p_portal_id, 'Finance',      '#22C55E', 1),
    (p_portal_id, 'Marketing',    '#3B82F6', 2),
    (p_portal_id, 'Operations',   '#F59E0B', 3),
    (p_portal_id, 'Technology',   '#8B5CF6', 4)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ── Auto-seed when portal is created ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_portal_seed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.seed_portal_defaults(NEW.id);
  RETURN NEW;
END;
$$;

-- Drop and recreate to avoid duplicate trigger errors
DROP TRIGGER IF EXISTS trg_seed_portal_defaults ON public.portals;
CREATE TRIGGER trg_seed_portal_defaults
  AFTER INSERT ON public.portals
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_portal_seed();

-- ── Update handle_new_user trigger to create a default portal ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user_portals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_portal_id uuid;
  v_name text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'My Portal');

  INSERT INTO public.portals (name, slug, owner_id)
  VALUES (
    v_name || '''s Portal',
    regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g') || '-' || substr(NEW.id::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO v_portal_id;

  RETURN NEW;
END;
$$;

-- Replace the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_portals ON auth.users;
CREATE TRIGGER on_auth_user_created_portals
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_portals();
