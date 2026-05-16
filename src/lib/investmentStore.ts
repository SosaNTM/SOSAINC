export type InvestmentType = "stock" | "etf" | "crypto" | "bonds" | "real_estate" | "other";

export interface Investment {
  id: string;
  name: string;
  ticker: string;
  type: InvestmentType;
  units: number;
  avgBuyPrice: number;
  currentPrice: number;
  color: string;
  emoji: string;
}

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  stock:       "Stock",
  etf:         "ETF",
  crypto:      "Crypto",
  bonds:       "Bonds",
  real_estate: "Real Estate",
  other:       "Other",
};

export const INVESTMENT_TYPE_EMOJIS: Record<InvestmentType, string> = {
  stock:       "📈",
  etf:         "🏦",
  crypto:      "₿",
  bonds:       "📄",
  real_estate: "🏠",
  other:       "💼",
};

// ── Math helpers (pure functions) ────────────────────────────────────────────

export function calcCurrentValue(inv: Investment): number {
  return inv.units * inv.currentPrice;
}

export function calcCostBasis(inv: Investment): number {
  return inv.units * inv.avgBuyPrice;
}

export function calcPnL(inv: Investment): number {
  return calcCurrentValue(inv) - calcCostBasis(inv);
}

export function calcROI(inv: Investment): number {
  const cost = calcCostBasis(inv);
  if (cost === 0) return 0;
  return ((calcCurrentValue(inv) - cost) / cost) * 100;
}
