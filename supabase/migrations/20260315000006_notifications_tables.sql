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
