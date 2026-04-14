-- ============================================================================
-- Vault Files: Supabase Storage + metadata table
-- Date: 2026-04-08
-- ============================================================================
-- vault_files stores metadata for files uploaded to the "vault-files" storage
-- bucket. The actual binary is in Storage; this table holds the reference.
-- Portal isolation: portal_id TEXT = slug ('sosa', 'keylo', 'redx', 'trustme')
-- ============================================================================

-- ── 1. Metadata table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vault_files (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id    TEXT        NOT NULL,
  uploaded_by  TEXT        NOT NULL,       -- user id (may be mock "usr_001")
  file_name    TEXT        NOT NULL,
  file_path    TEXT        NOT NULL,       -- path inside vault-files bucket
  file_type    TEXT,                       -- MIME type
  file_size    BIGINT,                     -- bytes
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vault_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vault_files_open" ON vault_files;
CREATE POLICY "vault_files_open" ON vault_files
  FOR ALL TO authenticated, anon
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vault_files_portal
  ON vault_files(portal_id, created_at DESC);

CREATE TRIGGER trg_vault_files_updated
  BEFORE UPDATE ON vault_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. Storage bucket (run via Supabase dashboard or supabase CLI) ───────────
-- The SQL below creates the bucket if the storage schema is accessible.
-- If it fails, create it manually in the Supabase Dashboard → Storage.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault-files',
  'vault-files',
  false,                      -- private: access only via signed URLs
  52428800,                   -- 50 MB per file
  NULL                        -- all mime types allowed
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated + anon to read/write (mock auth compatible)
DROP POLICY IF EXISTS "vault_files_storage_all" ON storage.objects;
CREATE POLICY "vault_files_storage_all" ON storage.objects
  FOR ALL TO authenticated, anon
  USING  (bucket_id = 'vault-files')
  WITH CHECK (bucket_id = 'vault-files');
