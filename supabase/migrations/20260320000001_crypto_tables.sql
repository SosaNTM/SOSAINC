-- ============================================================================
-- PAPER 01 — Crypto: Database Schema Semplificato (NO wallets)
-- ============================================================================

-- 1. crypto_holdings — l'utente aggiunge direttamente le crypto
CREATE TABLE IF NOT EXISTS crypto_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL DEFAULT 0,
  avg_buy_price_eur NUMERIC(14, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_user_coin UNIQUE (user_id, coin_id)
);

CREATE INDEX idx_crypto_holdings_user ON crypto_holdings(user_id);

-- 2. crypto_prices (market data cache)
CREATE TABLE IF NOT EXISTS crypto_prices (
  coin_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  price_eur NUMERIC(14, 2) NOT NULL,
  price_usd NUMERIC(14, 2),
  market_cap_eur NUMERIC(20, 2),
  price_change_24h NUMERIC(10, 4),
  price_change_7d NUMERIC(10, 4),
  ath_eur NUMERIC(14, 2),
  circulating_supply NUMERIC(20, 2),
  image_url TEXT,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- 3. crypto_price_history (for charts)
CREATE TABLE IF NOT EXISTS crypto_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id TEXT NOT NULL,
  price_eur NUMERIC(14, 2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crypto_history_coin ON crypto_price_history(coin_id, recorded_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE crypto_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own holdings"
  ON crypto_holdings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE crypto_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read crypto prices"
  ON crypto_prices FOR SELECT TO authenticated
  USING (true);

ALTER TABLE crypto_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read price history"
  ON crypto_price_history FOR SELECT TO authenticated
  USING (true);

-- ── Triggers ─────────────────────────────────────────────────────────────────
-- update_updated_at() already exists in 20260319000000_shared_functions.sql

CREATE TRIGGER trg_crypto_holdings_updated
  BEFORE UPDATE ON crypto_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed — 20 crypto principali ─────────────────────────────────────────────

INSERT INTO crypto_prices (coin_id, symbol, name, price_eur, price_usd, price_change_24h, image_url)
VALUES
  ('bitcoin',       'BTC',   'Bitcoin',        0, 0, 0, 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'),
  ('ethereum',      'ETH',   'Ethereum',       0, 0, 0, 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'),
  ('litecoin',      'LTC',   'Litecoin',       0, 0, 0, 'https://assets.coingecko.com/coins/images/2/large/litecoin.png'),
  ('tether',        'USDT',  'Tether',         0, 0, 0, 'https://assets.coingecko.com/coins/images/325/large/Tether.png'),
  ('solana',        'SOL',   'Solana',         0, 0, 0, 'https://assets.coingecko.com/coins/images/4128/large/solana.png'),
  ('binancecoin',   'BNB',   'BNB',            0, 0, 0, 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png'),
  ('ripple',        'XRP',   'XRP',            0, 0, 0, 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png'),
  ('cardano',       'ADA',   'Cardano',        0, 0, 0, 'https://assets.coingecko.com/coins/images/975/large/cardano.png'),
  ('dogecoin',      'DOGE',  'Dogecoin',       0, 0, 0, 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png'),
  ('polkadot',      'DOT',   'Polkadot',       0, 0, 0, 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png'),
  ('avalanche-2',   'AVAX',  'Avalanche',      0, 0, 0, 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png'),
  ('chainlink',     'LINK',  'Chainlink',      0, 0, 0, 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png'),
  ('tron',          'TRX',   'TRON',           0, 0, 0, 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png'),
  ('uniswap',       'UNI',   'Uniswap',        0, 0, 0, 'https://assets.coingecko.com/coins/images/12504/large/uni.jpg'),
  ('matic-network', 'MATIC', 'Polygon',        0, 0, 0, 'https://assets.coingecko.com/coins/images/4713/large/polygon.png'),
  ('shiba-inu',     'SHIB',  'Shiba Inu',      0, 0, 0, 'https://assets.coingecko.com/coins/images/11939/large/shiba.png'),
  ('pepe',          'PEPE',  'Pepe',           0, 0, 0, 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg'),
  ('sui',           'SUI',   'Sui',            0, 0, 0, 'https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png'),
  ('aptos',         'APT',   'Aptos',          0, 0, 0, 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png'),
  ('near',          'NEAR',  'NEAR Protocol',  0, 0, 0, 'https://assets.coingecko.com/coins/images/10365/large/near.jpg')
ON CONFLICT (coin_id) DO NOTHING;

-- ── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE crypto_prices;
