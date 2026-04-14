-- ============================================================================
-- Inventory: add simple digital-stock columns + attachments table
-- Date: 2026-04-08
-- ============================================================================
-- inventory_items already exists (20260401000002_inventory.sql).
-- This migration adds three new columns used by the reworked "Digital Stock
-- Manager" view, and creates the inventory_attachments table for file uploads.
-- Existing rows are unaffected (all new columns are nullable / have defaults).
-- ============================================================================

-- ── 1. New columns on inventory_items ────────────────────────────────────────

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS amount      INTEGER      NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS item_value  NUMERIC(12,2) NOT NULL DEFAULT 0.00;

-- ── 2. Attachments table ─────────────────────────────────────────────────────
-- Stores file metadata for files attached to an inventory item.
-- Binary is stored in the "inventory-files" storage bucket.

CREATE TABLE IF NOT EXISTS inventory_attachments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  portal_id   TEXT        NOT NULL,
  uploaded_by TEXT        NOT NULL,
  file_name   TEXT        NOT NULL,
  file_path   TEXT        NOT NULL,   -- path inside inventory-files bucket
  file_type   TEXT,
  file_size   BIGINT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inventory_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_attachments_open" ON inventory_attachments;
CREATE POLICY "inventory_attachments_open" ON inventory_attachments
  FOR ALL TO authenticated, anon
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inv_att_item
  ON inventory_attachments(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_att_portal
  ON inventory_attachments(portal_id);

-- ── 3. Storage bucket ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-files',
  'inventory-files',
  false,
  52428800,   -- 50 MB
  NULL
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "inventory_files_storage_all" ON storage.objects;
CREATE POLICY "inventory_files_storage_all" ON storage.objects
  FOR ALL TO authenticated, anon
  USING  (bucket_id = 'inventory-files')
  WITH CHECK (bucket_id = 'inventory-files');
