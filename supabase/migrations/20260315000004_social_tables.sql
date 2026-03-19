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
