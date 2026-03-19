-- Drop RLS policies that depend on user_id column before altering type
DROP POLICY IF EXISTS "users_select_own_telegram_settings" ON public.telegram_settings;
DROP POLICY IF EXISTS "users_insert_own_telegram_settings" ON public.telegram_settings;
DROP POLICY IF EXISTS "users_update_own_telegram_settings" ON public.telegram_settings;
DROP POLICY IF EXISTS "users_select_own_telegram_notes"    ON public.telegram_notes;
DROP POLICY IF EXISTS "users_insert_own_telegram_notes"    ON public.telegram_notes;
DROP POLICY IF EXISTS "users_delete_own_telegram_notes"    ON public.telegram_notes;

-- Drop FK constraints and relax user_id to TEXT
ALTER TABLE public.telegram_settings DROP CONSTRAINT IF EXISTS telegram_settings_user_id_fkey;
ALTER TABLE public.telegram_settings ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE public.telegram_notes DROP CONSTRAINT IF EXISTS telegram_notes_user_id_fkey;
ALTER TABLE public.telegram_notes ALTER COLUMN user_id TYPE TEXT;

-- Recreate RLS policies (auth.uid() cast to text for compatibility)
CREATE POLICY "users_select_own_telegram_settings"
  ON public.telegram_settings FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "users_insert_own_telegram_settings"
  ON public.telegram_settings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "users_update_own_telegram_settings"
  ON public.telegram_settings FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "users_select_own_telegram_notes"
  ON public.telegram_notes FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "users_insert_own_telegram_notes"
  ON public.telegram_notes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "users_delete_own_telegram_notes"
  ON public.telegram_notes FOR DELETE
  USING (auth.uid()::text = user_id);
