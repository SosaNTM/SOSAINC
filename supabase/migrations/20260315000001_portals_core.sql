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
