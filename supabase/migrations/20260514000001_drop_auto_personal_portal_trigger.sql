-- Remove auto-creation of personal portals on new user signup.
-- Portals are now assigned manually by owners/admins via invite flow.

DROP TRIGGER IF EXISTS on_auth_user_created_portals ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_portals();
