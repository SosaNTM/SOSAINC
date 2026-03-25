// ── Gift Cards Domain Types ──────────────────────────────────────────────────

export type GiftCardStatus = "active" | "partially_used" | "fully_used" | "expired" | "archived";
export type GiftCardCategory = "shopping" | "entertainment" | "gaming" | "food" | "travel" | "other";
export type GiftCardCurrency = "EUR" | "USD" | "GBP";

export interface GiftCardBrand {
  brand_key: string;
  name: string;
  logo_url: string | null;
  color: string | null;
  category: GiftCardCategory;
  default_currency: GiftCardCurrency;
  has_expiry: boolean;
  is_popular: boolean;
}

export interface GiftCard {
  id: string;
  user_id: string;
  brand: string;
  brand_key: string;
  card_code: string | null;
  pin: string | null;
  initial_value: number;
  remaining_value: number;
  currency: GiftCardCurrency;
  purchase_date: string | null;
  expiry_date: string | null;
  status: GiftCardStatus;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftCardTransaction {
  id: string;
  user_id: string;
  gift_card_id: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

export interface EnrichedGiftCard extends GiftCard {
  brandData: GiftCardBrand | null;
  usedValue: number;
  usedPercent: number;
  remainingValueEur: number;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
  transactions: GiftCardTransaction[];
}

export interface GiftCardsSummary {
  totalRemainingEur: number;
  totalInitialEur: number;
  totalUsedEur: number;
  activeCount: number;
  partiallyUsedCount: number;
  fullyUsedCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  byCategory: Record<GiftCardCategory, { count: number; remainingEur: number }>;
  byBrand: Array<{
    brand_key: string;
    brand: string;
    color: string | null;
    count: number;
    remainingEur: number;
  }>;
}

export type GiftCardFilter = "all" | "active" | "partially_used" | "fully_used" | "expired" | "archived";
export type GiftCardSort = "remaining_desc" | "remaining_asc" | "expiry_asc" | "recent" | "brand";
