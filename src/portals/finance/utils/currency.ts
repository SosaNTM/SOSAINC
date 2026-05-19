// ── Currency Conversion & Formatting ─────────────────────────────────────────
// Base currency: EUR. All net-worth calculations happen in EUR.
// USD → EUR conversion uses a static fallback rate unless overridden in memory.

const FALLBACK_USD_EUR = 0.92;

export interface ExchangeRates {
  USD_EUR: number;
  updated_at: string;
}

let _rates: ExchangeRates = { USD_EUR: FALLBACK_USD_EUR, updated_at: "" };

function loadRates(): ExchangeRates {
  return _rates;
}

/** Override in-memory exchange rate (e.g. fetched from an edge function). */
export function saveRates(rates: ExchangeRates): void {
  _rates = rates;
}

const SUPPORTED_CURRENCIES = new Set(["EUR", "USD"]);

/** Convert an amount to EUR. Supported source currencies: EUR, USD. */
export function convertToEUR(amount: number, currency: string): number {
  const cur = (currency || "EUR").toUpperCase();
  if (cur === "EUR") return amount;
  if (cur === "USD") return amount * loadRates().USD_EUR;
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
