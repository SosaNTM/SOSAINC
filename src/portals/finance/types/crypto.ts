// ── Crypto Domain Types ──────────────────────────────────────────────────────

export interface CryptoHolding {
  id: string;
  user_id: string;
  coin_id: string;
  symbol: string;
  name: string;
  quantity: number;
  avg_buy_price_eur: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CryptoPrice {
  coin_id: string;
  symbol: string;
  name: string;
  price_eur: number;
  price_usd: number | null;
  market_cap_eur: number | null;
  price_change_24h: number;
  price_change_7d: number | null;
  ath_eur: number | null;
  circulating_supply: number | null;
  image_url: string | null;
  last_updated: string;
}

// Holding + calculated data with current price
export interface EnrichedHolding extends CryptoHolding {
  currentPrice: number;
  totalValue: number;
  priceChange24h: number;
  profitLoss: number | null;
  profitLossPercent: number | null;
  imageUrl: string | null;
}

export interface CryptoPortfolioSummary {
  totalValueEur: number;
  totalInvestedEur: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  change24hEur: number;
  change24hPercent: number;
  holdingsCount: number;
}

// For the coin selector (available coins from crypto_prices)
export interface CoinOption {
  coin_id: string;
  symbol: string;
  name: string;
  image_url: string | null;
  price_eur: number;
  price_change_24h: number;
  market_cap_rank?: number | null;
}
