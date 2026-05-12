-- D-05 (corrected): Switch trigger functions to SECURITY INVOKER
--
-- REVOKE alone is insufficient in Supabase — schema publish re-grants EXECUTE
-- to anon/authenticated. The correct fix is SECURITY INVOKER: the function runs
-- as the *calling* role, so anon gets exactly anon privileges (RLS applies,
-- auth.uid() returns null → no data).
--
-- Trigger functions (add_owner_as_member, etc.) only fire from DB triggers —
-- they never need to run as the table owner. SECURITY INVOKER is safe here.
--
-- Portal ID lookup helpers (get_my_portal_ids, get_my_admin_portal_ids) use
-- auth.uid() inside — anon would get an empty result anyway, but switching to
-- SECURITY INVOKER + search_path = '' removes them from the anon attack surface.

ALTER FUNCTION public.add_owner_as_member() SECURITY INVOKER SET search_path = '';
ALTER FUNCTION public.create_default_portal_settings() SECURITY INVOKER SET search_path = '';
ALTER FUNCTION public.handle_new_portal_seed() SECURITY INVOKER SET search_path = '';
ALTER FUNCTION public.handle_new_user_portals() SECURITY INVOKER SET search_path = '';
ALTER FUNCTION public.seed_portal_defaults(uuid) SECURITY INVOKER SET search_path = '';
ALTER FUNCTION public.reset_portal_data(uuid) SECURITY INVOKER SET search_path = '';
ALTER FUNCTION public.get_my_portal_ids() SECURITY INVOKER SET search_path = '';
ALTER FUNCTION public.get_my_admin_portal_ids() SECURITY INVOKER SET search_path = '';
ALTER FUNCTION public.get_user_id_by_email(text) SECURITY INVOKER SET search_path = '';

-- Fix B: Add receipt_url column to personal_transactions
--
-- TypeScript interface PersonalTransaction already declares receipt_url?: string.
-- Without this column, any INSERT/UPDATE that includes receipt_url is silently
-- dropped by PostgREST (unknown column) or causes a 42703 error.

ALTER TABLE personal_transactions
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add updated_at auto-update trigger for budget_limits
-- (column exists but no trigger was maintaining it)

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'budget_limits_set_updated_at'
      AND tgrelid = 'public.budget_limits'::regclass
  ) THEN
    CREATE TRIGGER budget_limits_set_updated_at
      BEFORE UPDATE ON public.budget_limits
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
