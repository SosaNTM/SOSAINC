-- ═══ Social Connections ═══
CREATE TABLE IF NOT EXISTS public.social_connections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform           text NOT NULL CHECK (platform IN ('instagram','linkedin','twitter','facebook','tiktok','youtube')),
  account_handle     text NOT NULL,
  account_name       text NOT NULL,
  account_avatar_url text,
  access_token       text,
  refresh_token      text,
  token_expires_at   timestamptz,
  is_active          boolean NOT NULL DEFAULT true,
  connected_at       timestamptz NOT NULL DEFAULT now(),
  last_synced_at     timestamptz,
  UNIQUE (user_id, platform, account_handle)
);

-- ═══ Social Analytics Snapshots ═══
CREATE TABLE IF NOT EXISTS public.social_analytics_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    uuid NOT NULL REFERENCES public.social_connections(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         text NOT NULL,
  snapshot_date    date NOT NULL,
  followers_count  integer NOT NULL DEFAULT 0,
  following_count  integer NOT NULL DEFAULT 0,
  posts_count      integer NOT NULL DEFAULT 0,
  engagement_rate  numeric(6,4) NOT NULL DEFAULT 0,
  impressions      integer,
  reach            integer,
  likes_total      integer,
  comments_total   integer,
  shares_total     integer,
  raw_data         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, snapshot_date)
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON public.social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_connection_id ON public.social_analytics_snapshots(connection_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_user_id ON public.social_analytics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_snapshot_date ON public.social_analytics_snapshots(snapshot_date DESC);

-- ═══ RLS: social_connections ═══
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_connections"
  ON public.social_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_connections"
  ON public.social_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_connections"
  ON public.social_connections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_connections"
  ON public.social_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ═══ RLS: social_analytics_snapshots ═══
ALTER TABLE public.social_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_snapshots"
  ON public.social_analytics_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_snapshots"
  ON public.social_analytics_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_snapshots"
  ON public.social_analytics_snapshots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_snapshots"
  ON public.social_analytics_snapshots FOR DELETE
  USING (auth.uid() = user_id);
