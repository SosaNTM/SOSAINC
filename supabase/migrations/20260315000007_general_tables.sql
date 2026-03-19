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
