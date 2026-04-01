-- ============================================================================
-- Inventory / Products: Database Schema
-- ============================================================================

-- Products / Inventory table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  size TEXT,
  condition TEXT CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor')) DEFAULT 'good',
  purchase_price NUMERIC(10,2) DEFAULT 0,
  listing_price NUMERIC(10,2),
  sale_price NUMERIC(10,2),
  sku TEXT,
  status TEXT CHECK (status IN ('in_stock', 'listed', 'sold', 'shipped', 'returned')) DEFAULT 'in_stock',
  platform TEXT, -- vestiaire, depop, vinted, wallapop, ebay, shopify, other
  platform_url TEXT,
  platform_listing_id TEXT,
  purchase_date DATE,
  sale_date DATE,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Permissive policy (same pattern as other tables — proper RLS comes with auth migration)
CREATE POLICY "inventory_items_open" ON inventory_items
  FOR ALL TO authenticated, anon
  USING (true) WITH CHECK (true);

-- Index for portal filtering
CREATE INDEX idx_inventory_portal ON inventory_items(portal_id);
CREATE INDEX idx_inventory_status ON inventory_items(status);

-- Auto-update updated_at on row change
-- update_updated_at() already exists in 20260319000000_shared_functions.sql
CREATE TRIGGER trg_inventory_items_updated
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
