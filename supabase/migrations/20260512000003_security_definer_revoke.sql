-- D-05: revoke anon EXECUTE on SECURITY DEFINER functions
--
-- Trigger functions (add_owner_as_member, handle_new_user_portals, etc.) are
-- called implicitly by triggers — triggers do not check EXECUTE grants, so
-- revoking from anon/authenticated does not break them.
--
-- get_my_portal_ids / get_my_admin_portal_ids remain callable by authenticated
-- since they are used by RLS policies and client code.
--
-- get_user_id_by_email remains callable by authenticated (used by invite flow).

-- Trigger functions: revoke from both anon and authenticated (should never be
-- called directly via REST /rpc — only fired by DB triggers)
REVOKE EXECUTE ON FUNCTION public.add_owner_as_member() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_portal_settings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_portal_seed() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_portals() FROM anon, authenticated;

-- Portal utility functions: anon should never call these
REVOKE EXECUTE ON FUNCTION public.seed_portal_defaults(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_portal_data(uuid) FROM anon;

-- Portal ID lookups: anon gets nothing (auth.uid() returns null anyway, but
-- removes the function from public API surface)
REVOKE EXECUTE ON FUNCTION public.get_my_portal_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_admin_portal_ids() FROM anon;

-- Email lookup: anon must not enumerate user IDs by email
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM anon;
