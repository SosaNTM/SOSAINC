-- ═══════════════════════════════════════════════════════════════════
-- Telegram Bot Integration Schema
-- ═══════════════════════════════════════════════════════════════════

-- ═══ Telegram Settings (per-user) ═══
-- Stored separately since we can't ALTER auth.users directly.
CREATE TABLE IF NOT EXISTS public.telegram_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id            TEXT DEFAULT NULL,
  notifications_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  notification_time           TIME NOT NULL DEFAULT '08:00:00',
  paused_until                TIMESTAMPTZ DEFAULT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_settings_user_id
  ON public.telegram_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_settings_chat_id
  ON public.telegram_settings(telegram_chat_id);

-- ═══ Telegram Notes ═══
CREATE TABLE IF NOT EXISTS public.telegram_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      UUID DEFAULT NULL,       -- no FK: projects table may not exist yet
  content         TEXT NOT NULL,
  file_url        TEXT DEFAULT NULL,
  file_name       TEXT DEFAULT NULL,
  file_type       TEXT DEFAULT NULL,        -- 'document' | 'voice'
  transcription   TEXT DEFAULT NULL,        -- for voice messages
  source          TEXT NOT NULL DEFAULT 'telegram',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_notes_user_id
  ON public.telegram_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_notes_project_id
  ON public.telegram_notes(project_id);

CREATE INDEX IF NOT EXISTS idx_telegram_notes_created_at
  ON public.telegram_notes(created_at DESC);

-- ═══ RLS: telegram_settings ═══
ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_telegram_settings"
  ON public.telegram_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_telegram_settings"
  ON public.telegram_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_telegram_settings"
  ON public.telegram_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass for bot writes (uses service_role key, bypasses RLS)

-- ═══ RLS: telegram_notes ═══
ALTER TABLE public.telegram_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_telegram_notes"
  ON public.telegram_notes FOR SELECT
  USING (auth.uid() = user_id);

-- The bot inserts via service_role key which bypasses RLS.
-- For safety, also allow authenticated users to insert their own:
CREATE POLICY "users_insert_own_telegram_notes"
  ON public.telegram_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_telegram_notes"
  ON public.telegram_notes FOR DELETE
  USING (auth.uid() = user_id);

-- ═══ Helper: auto-update updated_at on telegram_settings ═══
CREATE OR REPLACE FUNCTION public.update_telegram_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_telegram_settings_updated_at
  BEFORE UPDATE ON public.telegram_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_telegram_settings_timestamp();
