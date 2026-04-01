import type { GiftCardCurrency } from "../types/giftCards";

const FALLBACK_RATES: Record<string, number> = {
  USD_EUR: 0.92,
  GBP_EUR: 1.16,
  EUR_EUR: 1,
};

export function convertToEur(
  amount: number,
  currency: GiftCardCurrency,
  rates?: Record<string, number>,
): number {
  if (currency === "EUR") return amount;
  const rateKey = `${currency}_EUR`;
  const rate = rates?.[rateKey] ?? FALLBACK_RATES[rateKey] ?? 1;
  return amount * rate;
}

export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "#4ade80";
    case "partially_used": return "#e8ff00";
    case "fully_used": return "#6b7280";
    case "expired": return "#ef4444";
    case "archived": return "#4b5563";
    default: return "#6b7280";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "active": return "Attiva";
    case "partially_used": return "Parzialmente usata";
    case "fully_used": return "Esaurita";
    case "expired": return "Scaduta";
    case "archived": return "Archiviata";
    default: return status;
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case "shopping": return "Shopping";
    case "entertainment": return "Intrattenimento";
    case "gaming": return "Gaming";
    case "food": return "Food & Delivery";
    case "travel": return "Viaggi";
    case "other": return "Altro";
    default: return category;
  }
}

export function getCategoryEmoji(category: string): string {
  switch (category) {
    case "shopping": return "🛍️";
    case "entertainment": return "🎬";
    case "gaming": return "🎮";
    case "food": return "🍕";
    case "travel": return "✈️";
    case "other": return "🎁";
    default: return "🎁";
  }
}

export function getProgressColor(percent: number): string {
  if (percent <= 0) return "#6b7280";
  if (percent < 20) return "#ef4444";
  if (percent < 50) return "#e8ff00";
  return "#4ade80";
}
