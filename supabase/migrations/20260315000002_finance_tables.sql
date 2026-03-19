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
