-- ============================================================================
-- PAPER 01 — Gift Cards: Database Schema
-- ============================================================================

-- 1. gift_card_brands — catalogo brand con loghi e metadata
CREATE TABLE IF NOT EXISTS gift_card_brands (
  brand_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  color TEXT,
  category TEXT DEFAULT 'other'
    CHECK (category IN ('shopping', 'entertainment', 'gaming', 'food', 'travel', 'other')),
  default_currency TEXT DEFAULT 'EUR',
  has_expiry BOOLEAN DEFAULT false,
  is_popular BOOLEAN DEFAULT true
);

-- 2. gift_cards — le gift card dell'utente
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  brand_key TEXT NOT NULL,
  card_code TEXT,
  pin TEXT,
  initial_value NUMERIC(10, 2) NOT NULL,
  remaining_value NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR'
    CHECK (currency IN ('EUR', 'USD', 'GBP')),
  purchase_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'partially_used', 'fully_used', 'expired', 'archived')),
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gift_cards_user ON gift_cards(user_id);
CREATE INDEX idx_gift_cards_status ON gift_cards(user_id, status);
CREATE INDEX idx_gift_cards_brand ON gift_cards(user_id, brand_key);

-- 3. gift_card_transactions — utilizzi di una gift card
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gc_transactions_card ON gift_card_transactions(gift_card_id);
CREATE INDEX idx_gc_transactions_user ON gift_card_transactions(user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own gift cards"
  ON gift_cards FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own gc transactions"
  ON gift_card_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE gift_card_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read brands"
  ON gift_card_brands FOR SELECT TO authenticated
  USING (true);

-- ── Triggers ─────────────────────────────────────────────────────────────────
-- update_updated_at() already exists in 20260319000000_shared_functions.sql

CREATE TRIGGER trg_gift_cards_updated
  BEFORE UPDATE ON gift_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-status: aggiorna status quando remaining_value cambia
CREATE OR REPLACE FUNCTION update_gift_card_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.remaining_value <= 0 THEN
    NEW.status = 'fully_used';
    NEW.remaining_value = 0;
  ELSIF NEW.remaining_value < NEW.initial_value THEN
    NEW.status = 'partially_used';
  ELSE
    NEW.status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gift_card_auto_status
  BEFORE UPDATE OF remaining_value ON gift_cards
  FOR EACH ROW EXECUTE FUNCTION update_gift_card_status();

-- Auto-remaining: scala saldo quando si inserisce una transazione
CREATE OR REPLACE FUNCTION update_gift_card_remaining()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gift_cards
  SET remaining_value = remaining_value - NEW.amount
  WHERE id = NEW.gift_card_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gc_transaction_update_remaining
  AFTER INSERT ON gift_card_transactions
  FOR EACH ROW EXECUTE FUNCTION update_gift_card_remaining();

-- Reverse: ripristina saldo quando si elimina una transazione
CREATE OR REPLACE FUNCTION reverse_gift_card_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gift_cards
  SET remaining_value = remaining_value + OLD.amount
  WHERE id = OLD.gift_card_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gc_transaction_reverse
  AFTER DELETE ON gift_card_transactions
  FOR EACH ROW EXECUTE FUNCTION reverse_gift_card_transaction();

-- ── Scadenza automatica ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_gift_cards()
RETURNS void AS $$
BEGIN
  UPDATE gift_cards
  SET status = 'expired'
  WHERE expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE
    AND status NOT IN ('fully_used', 'expired', 'archived');
END;
$$ LANGUAGE plpgsql;

-- Cron: ogni giorno a mezzanotte (requires pg_cron extension)
-- SELECT cron.schedule('expire-gift-cards-daily', '0 0 * * *', $$SELECT expire_gift_cards();$$);

-- ── Seed — 30 brand principali ──────────────────────────────────────────────

INSERT INTO gift_card_brands (brand_key, name, logo_url, color, category, default_currency, has_expiry, is_popular)
VALUES
  -- SHOPPING
  ('amazon',        'Amazon',         NULL, '#FF9900', 'shopping',      'EUR', false, true),
  ('amazon_us',     'Amazon US',      NULL, '#FF9900', 'shopping',      'USD', false, true),
  ('zalando',       'Zalando',        NULL, '#FF6900', 'shopping',      'EUR', false, true),
  ('ikea',          'IKEA',           NULL, '#0058A3', 'shopping',      'EUR', true,  true),
  ('hm',            'H&M',            NULL, '#E50010', 'shopping',      'EUR', true,  true),
  ('zara',          'Zara',           NULL, '#000000', 'shopping',      'EUR', true,  false),
  ('mediaworld',    'MediaWorld',     NULL, '#E2001A', 'shopping',      'EUR', true,  false),
  ('decathlon',     'Decathlon',      NULL, '#0082C3', 'shopping',      'EUR', true,  false),
  ('esselunga',     'Esselunga',      NULL, '#E30613', 'shopping',      'EUR', true,  false),
  ('feltrinelli',   'Feltrinelli',    NULL, '#E30613', 'shopping',      'EUR', true,  false),
  -- ENTERTAINMENT
  ('apple',         'Apple',          NULL, '#A2AAAD', 'entertainment', 'EUR', false, true),
  ('google_play',   'Google Play',    NULL, '#34A853', 'entertainment', 'EUR', false, true),
  ('netflix',       'Netflix',        NULL, '#E50914', 'entertainment', 'EUR', false, true),
  ('spotify',       'Spotify',        NULL, '#1DB954', 'entertainment', 'EUR', false, true),
  ('disney_plus',   'Disney+',        NULL, '#113CCF', 'entertainment', 'EUR', false, false),
  ('playstation',   'PlayStation',    NULL, '#003791', 'entertainment', 'EUR', false, true),
  ('xbox',          'Xbox',           NULL, '#107C10', 'entertainment', 'EUR', false, true),
  ('nintendo',      'Nintendo eShop', NULL, '#E60012', 'entertainment', 'EUR', false, true),
  ('steam',         'Steam',          NULL, '#1B2838', 'gaming',        'EUR', false, true),
  -- GAMING
  ('roblox',        'Roblox',         NULL, '#E2231A', 'gaming',        'EUR', false, false),
  ('fortnite',      'Fortnite V-Bucks', NULL, '#9D4DBB', 'gaming',     'EUR', false, false),
  ('riot_games',    'Riot Games',     NULL, '#D32936', 'gaming',        'EUR', false, false),
  -- FOOD
  ('just_eat',      'Just Eat',       NULL, '#FF8000', 'food',          'EUR', true,  true),
  ('deliveroo',     'Deliveroo',      NULL, '#00CCBC', 'food',          'EUR', true,  true),
  ('starbucks',     'Starbucks',      NULL, '#006241', 'food',          'EUR', false, false),
  ('mcdonald',      'McDonald''s',    NULL, '#FFC72C', 'food',          'EUR', true,  false),
  -- TRAVEL
  ('airbnb',        'Airbnb',         NULL, '#FF5A5F', 'travel',        'EUR', false, false),
  ('booking',       'Booking.com',    NULL, '#003580', 'travel',        'EUR', false, false),
  ('flixbus',       'FlixBus',        NULL, '#73D700', 'travel',        'EUR', true,  false),
  ('ryanair',       'Ryanair',        NULL, '#073590', 'travel',        'EUR', true,  false)
ON CONFLICT (brand_key) DO NOTHING;
