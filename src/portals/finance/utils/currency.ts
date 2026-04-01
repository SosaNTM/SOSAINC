// ── Currency Conversion & Formatting ─────────────────────────────────────────
// Base currency: EUR. All net-worth calculations happen in EUR.
// USD → EUR conversion uses a static fallback rate unless overridden.

const FALLBACK_USD_EUR = 0.92;

import { STORAGE_EXCHANGE_RATES } from "@/constants/storageKeys";

const LS_KEY = STORAGE_EXCHANGE_RATES;

export interface ExchangeRates {
  USD_EUR: number;
  updated_at: string; // ISO timestamp
}

/** Read persisted rates from localStorage (if any). */
function loadRates(): ExchangeRates {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ExchangeRates;
      if (parsed.USD_EUR > 0) return parsed;
    }
  } catch { /* corrupted */ }
  return { USD_EUR: FALLBACK_USD_EUR, updated_at: "" };
}

/** Persist a new rate (called by an optional edge-function refresh). */
export function saveRates(rates: ExchangeRates): void {
  localStorage.setItem(LS_KEY, JSON.stringify(rates));
}

const SUPPORTED_CURRENCIES = new Set(["EUR", "USD"]);

/** Convert an amount to EUR. Supported source currencies: EUR, USD. */
export function convertToEUR(amount: number, currency: string): number {
  const cur = (currency || "EUR").toUpperCase();
  if (cur === "EUR") return amount;
  if (cur === "USD") return amount * loadRates().USD_EUR;
  // Unknown/unsupported currency — default to EUR (1:1) and log warning
  if (!SUPPORTED_CURRENCIES.has(cur)) {
    console.warn(`[convertToEUR] Unsupported currency "${cur}" — defaulting to EUR (1:1)`);
  }
  return amount;
}

/** Format a number as EUR with the € symbol. */
export function formatEUR(
  value: number,
  options?: { decimals?: number; sign?: boolean },
): string {
  const dec = options?.decimals ?? 2;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
  const prefix = options?.sign
    ? value >= 0 ? "+" : "-"
    : value < 0 ? "-" : "";
  return `${prefix}€${formatted}`;
}

/** Current USD→EUR rate (read-only). */
export function getUsdEurRate(): number {
  return loadRates().USD_EUR;
}
