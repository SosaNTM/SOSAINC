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

const KEY_PREFIX  = "finance_investments";
const LEGACY_KEY  = "finance_investments";

function storageKey(portalId: string): string {
  return `${KEY_PREFIX}_${portalId}`;
}

const INITIAL_INVESTMENTS: Investment[] = [];

export function loadInvestments(portalId: string): Investment[] {
  try {
    const raw = localStorage.getItem(storageKey(portalId));
    if (raw) return JSON.parse(raw) as Investment[];
    if (portalId === "sosa") {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) return JSON.parse(legacy) as Investment[];
    }
  } catch {}
  return INITIAL_INVESTMENTS;
}

export function saveInvestments(portalId: string, investments: Investment[]): void {
  localStorage.setItem(storageKey(portalId), JSON.stringify(investments));
}

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
