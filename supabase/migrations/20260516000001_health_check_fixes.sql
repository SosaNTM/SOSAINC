-- Health-check 2026-05-16 blocker fixes (B1 + B2 + B3 + S1 + S2)
--
-- B1: cloud_files.folder_id type mismatch (text -> uuid)
-- B2: subscriptions RLS policy not portal-scoped
-- B3: vault_items RLS policy not portal-scoped
-- S1: drop legacy non-portal social_connections RLS policies
-- S2: add missing columns to social_connections (account_avatar_url, last_synced_at)

-- ── B1 ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.cloud_files
  ALTER COLUMN folder_id TYPE uuid USING NULLIF(folder_id, '')::uuid;

ALTER TABLE public.cloud_files
  ADD CONSTRAINT cloud_files_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES public.cloud_folders(id) ON DELETE CASCADE;

-- ── B2 ───────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS subs_all ON public.subscriptions;
CREATE POLICY subs_all ON public.subscriptions
  FOR ALL TO authenticated
  USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()))
  WITH CHECK (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));

-- ── B3 ───────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS vi_all ON public.vault_items;
CREATE POLICY vi_all ON public.vault_items
  FOR ALL TO authenticated
  USING (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()))
  WITH CHECK (portal_id IN (SELECT portal_id FROM public.portal_members WHERE user_id = auth.uid()));

-- ── S1 ───────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS social_connections_select ON public.social_connections;
DROP POLICY IF EXISTS social_connections_insert ON public.social_connections;
DROP POLICY IF EXISTS social_connections_update ON public.social_connections;
DROP POLICY IF EXISTS social_connections_delete ON public.social_connections;

-- ── S2 ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS account_avatar_url text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
