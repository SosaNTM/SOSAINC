-- Migrate social_connections from user-scoped to portal-scoped.
-- Connections belong to a portal (the org), not to an individual user.
-- user_id is kept for audit (who connected it), but is no longer the ownership key.

-- 1. Add portal_id column
ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS portal_id uuid REFERENCES public.portals(id) ON DELETE CASCADE;

-- 2. Add connected_by for audit (who triggered the OAuth flow)
ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Drop the old user+platform+handle unique constraint
ALTER TABLE public.social_connections
  DROP CONSTRAINT IF EXISTS social_connections_user_id_platform_account_handle_key;

-- 4. Add new portal+platform unique constraint
--    (only applies when portal_id is set — new rows going forward)
CREATE UNIQUE INDEX IF NOT EXISTS social_connections_portal_platform_key
  ON public.social_connections (portal_id, platform)
  WHERE portal_id IS NOT NULL;

-- 5. Expand platform CHECK to include threads and pinterest
ALTER TABLE public.social_connections
  DROP CONSTRAINT IF EXISTS social_connections_platform_check;

ALTER TABLE public.social_connections
  ADD CONSTRAINT social_connections_platform_check
  CHECK (platform IN (
    'instagram','linkedin','twitter','facebook',
    'tiktok','youtube','threads','pinterest'
  ));

-- 6. Index for portal-scoped queries
CREATE INDEX IF NOT EXISTS idx_social_connections_portal_id
  ON public.social_connections (portal_id);

-- 7. Drop old user-scoped RLS policies
DROP POLICY IF EXISTS "users_select_own_connections" ON public.social_connections;
DROP POLICY IF EXISTS "users_insert_own_connections" ON public.social_connections;
DROP POLICY IF EXISTS "users_update_own_connections" ON public.social_connections;
DROP POLICY IF EXISTS "users_delete_own_connections" ON public.social_connections;

-- 8. New portal-member-scoped RLS
--    All portal members can read connections.
--    Only owners/admins can modify (connects come from edge fn via service role, bypasses RLS).
CREATE POLICY "pm_select_social_connections"
  ON public.social_connections FOR SELECT
  USING (
    portal_id IS NOT NULL AND
    portal_id IN (
      SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pa_manage_social_connections"
  ON public.social_connections FOR ALL
  USING (
    portal_id IS NOT NULL AND
    portal_id IN (
      SELECT portal_id FROM public.portal_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
