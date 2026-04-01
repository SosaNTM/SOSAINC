-- Add OAuth token fields to social_connections (if they don't already exist)
-- These columns may already be present from migration 20240101000001_social_connections.sql.
-- Using ADD COLUMN IF NOT EXISTS makes this migration idempotent.
ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS access_token       TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token      TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS connected_at       TIMESTAMPTZ DEFAULT now();
