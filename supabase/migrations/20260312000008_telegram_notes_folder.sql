-- Add folder_name TEXT column to telegram_notes so the bot can save
-- notes to a named section (e.g. "Generale") without needing a UUID FK.
-- Also change project_id from UUID to TEXT so custom folder IDs work.

-- 1. Drop any existing FK/index on project_id that might block the cast
ALTER TABLE public.telegram_notes
  DROP COLUMN IF EXISTS project_id;

-- 2. Re-add project_id as TEXT (nullable, for optional project linkage)
ALTER TABLE public.telegram_notes
  ADD COLUMN project_id TEXT DEFAULT NULL;

-- 3. Add folder_name TEXT with default "Generale"
ALTER TABLE public.telegram_notes
  ADD COLUMN IF NOT EXISTS folder_name TEXT NOT NULL DEFAULT 'Generale';

-- 4. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_telegram_notes_folder
  ON public.telegram_notes(user_id, folder_name);
