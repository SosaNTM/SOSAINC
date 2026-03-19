-- ============================================================
-- ICONOFF — Shared Database Functions
-- These functions are created ONCE and used by ALL portals.
-- ============================================================

-- 1. Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Generate excerpt from content (for notes)
CREATE OR REPLACE FUNCTION generate_excerpt(content TEXT, max_length INT DEFAULT 200)
RETURNS TEXT AS $$
BEGIN
  IF content IS NULL THEN RETURN NULL; END IF;
  IF LENGTH(content) <= max_length THEN RETURN content; END IF;
  RETURN LEFT(content, max_length) || '...';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
