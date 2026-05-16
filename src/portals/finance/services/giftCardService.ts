// ── Gift Card Service — Supabase only (no localStorage) ──────────────────────

import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { toast } from "sonner";
import type {
  GiftCard, GiftCardBrand, GiftCardTransaction, GiftCardCurrency,
} from "../types/giftCards";

// Catalog of well-known brands — used only as a *seed fallback* when the
// `gift_card_brands` table returns no rows. This is reference data, not user data.
const F = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const SEED_BRANDS: GiftCardBrand[] = [
  { brand_key: "paysafecard", name: "Paysafecard", logo_url: F("paysafecard.com"), color: "#00A2E0", category: "other", default_currency: "EUR", has_expiry: true, is_popular: true },
  { brand_key: "paypal", name: "PayPal", logo_url: F("paypal.com"), color: "#003087", category: "other", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "amazon", name: "Amazon", logo_url: F("amazon.com"), color: "#FF9900", category: "shopping", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "amazon_us", name: "Amazon US", logo_url: F("amazon.com"), color: "#FF9900", category: "shopping", default_currency: "USD", has_expiry: false, is_popular: true },
  { brand_key: "ebay", name: "eBay", logo_url: F("ebay.com"), color: "#E53238", category: "shopping", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "zalando", name: "Zalando", logo_url: F("zalando.com"), color: "#FF6900", category: "shopping", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "ikea", name: "IKEA", logo_url: F("ikea.com"), color: "#0058A3", category: "shopping", default_currency: "EUR", has_expiry: true, is_popular: true },
  { brand_key: "hm", name: "H&M", logo_url: F("hm.com"), color: "#E50010", category: "shopping", default_currency: "EUR", has_expiry: true, is_popular: true },
  { brand_key: "zara", name: "Zara", logo_url: F("zara.com"), color: "#000000", category: "shopping", default_currency: "EUR", has_expiry: true, is_popular: false },
  { brand_key: "mediaworld", name: "MediaWorld", logo_url: F("mediaworld.it"), color: "#E2001A", category: "shopping", default_currency: "EUR", has_expiry: true, is_popular: false },
  { brand_key: "decathlon", name: "Decathlon", logo_url: F("decathlon.com"), color: "#0082C3", category: "shopping", default_currency: "EUR", has_expiry: true, is_popular: false },
  { brand_key: "esselunga", name: "Esselunga", logo_url: F("esselunga.it"), color: "#E30613", category: "shopping", default_currency: "EUR", has_expiry: true, is_popular: false },
  { brand_key: "feltrinelli", name: "Feltrinelli", logo_url: F("lafeltrinelli.it"), color: "#E30613", category: "shopping", default_currency: "EUR", has_expiry: true, is_popular: false },
  { brand_key: "apple", name: "Apple", logo_url: F("apple.com"), color: "#A2AAAD", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "google_play", name: "Google Play", logo_url: F("play.google.com"), color: "#34A853", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "netflix", name: "Netflix", logo_url: F("netflix.com"), color: "#E50914", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "spotify", name: "Spotify", logo_url: F("spotify.com"), color: "#1DB954", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "disney_plus", name: "Disney+", logo_url: F("disneyplus.com"), color: "#113CCF", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "playstation", name: "PlayStation", logo_url: F("playstation.com"), color: "#003791", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "xbox", name: "Xbox", logo_url: F("xbox.com"), color: "#107C10", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "nintendo", name: "Nintendo eShop", logo_url: F("nintendo.com"), color: "#E60012", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "steam", name: "Steam", logo_url: F("store.steampowered.com"), color: "#1B2838", category: "gaming", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "roblox", name: "Roblox", logo_url: F("roblox.com"), color: "#E2231A", category: "gaming", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "fortnite", name: "Fortnite V-Bucks", logo_url: F("fortnite.com"), color: "#9D4DBB", category: "gaming", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "riot_games", name: "Riot Games", logo_url: F("riotgames.com"), color: "#D32936", category: "gaming", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "just_eat", name: "Just Eat", logo_url: F("justeat.it"), color: "#FF8000", category: "food", default_currency: "EUR", has_expiry: true, is_popular: true },
  { brand_key: "deliveroo", name: "Deliveroo", logo_url: F("deliveroo.it"), color: "#00CCBC", category: "food", default_currency: "EUR", has_expiry: true, is_popular: true },
  { brand_key: "starbucks", name: "Starbucks", logo_url: F("starbucks.com"), color: "#006241", category: "food", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "mcdonald", name: "McDonald's", logo_url: F("mcdonalds.com"), color: "#FFC72C", category: "food", default_currency: "EUR", has_expiry: true, is_popular: false },
  { brand_key: "airbnb", name: "Airbnb", logo_url: F("airbnb.com"), color: "#FF5A5F", category: "travel", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "booking", name: "Booking.com", logo_url: F("booking.com"), color: "#003580", category: "travel", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "flixbus", name: "FlixBus", logo_url: F("flixbus.com"), color: "#73D700", category: "travel", default_currency: "EUR", has_expiry: true, is_popular: false },
  { brand_key: "ryanair", name: "Ryanair", logo_url: F("ryanair.com"), color: "#073590", category: "travel", default_currency: "EUR", has_expiry: true, is_popular: false },
];

// ── Brands ───────────────────────────────────────────────────────────────────

export async function fetchBrands(): Promise<GiftCardBrand[]> {
  const { data, error } = await supabase
    .from("gift_card_brands")
    .select("*")
    .order("is_popular", { ascending: false })
    .order("name", { ascending: true });
  if (error) {
    console.error("fetchBrands:", error.message);
    return SEED_BRANDS;
  }
  return (data && data.length > 0) ? data : SEED_BRANDS;
}

// ── Gift Cards ───────────────────────────────────────────────────────────────

export async function fetchGiftCards(portalId: string): Promise<GiftCard[]> {
  const { data, error } = await supabase
    .from("gift_cards")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchGiftCards:", error.message);
    toast.error(`Gift cards load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function createGiftCard(card: {
  brand: string;
  brand_key: string;
  initial_value: number;
  remaining_value: number;
  currency: GiftCardCurrency;
  card_code?: string;
  pin?: string;
  purchase_date?: string;
  expiry_date?: string;
  notes?: string;
}, portalId: string): Promise<GiftCard> {
  const { data, error } = await supabase
    .from("gift_cards")
    .insert({ ...card, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Gift card not saved: ${error.message}`);
    throw error;
  }
  return data;
}

export async function updateGiftCard(
  id: string,
  updates: Partial<Pick<GiftCard, "remaining_value" | "card_code" | "pin" | "purchase_date" | "expiry_date" | "notes" | "status" | "is_favorite">>,
  portalId: string,
): Promise<GiftCard> {
  const { data, error } = await supabase
    .from("gift_cards")
    .update(updates)
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId))
    .select()
    .single();
  if (error) {
    toast.error(`Gift card not updated: ${error.message}`);
    throw error;
  }
  return data;
}

export async function deleteGiftCard(id: string, portalId: string): Promise<void> {
  const { error } = await supabase
    .from("gift_cards")
    .delete()
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    toast.error(`Gift card not deleted: ${error.message}`);
    throw error;
  }
}

export async function toggleFavorite(id: string, isFavorite: boolean, portalId: string): Promise<void> {
  const { error } = await supabase
    .from("gift_cards")
    .update({ is_favorite: isFavorite })
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    toast.error(`Favorite toggle failed: ${error.message}`);
    throw error;
  }
}

// ── Gift Card Transactions ───────────────────────────────────────────────────

export async function fetchCardTransactions(giftCardId: string, portalId: string): Promise<GiftCardTransaction[]> {
  const { data, error } = await supabase
    .from("gift_card_transactions")
    .select("*")
    .eq("gift_card_id", giftCardId)
    .eq("portal_id", toPortalUUID(portalId))
    .order("transaction_date", { ascending: false });
  if (error) {
    console.error("fetchCardTransactions:", error.message);
    return [];
  }
  return data ?? [];
}

export async function addCardTransaction(transaction: {
  gift_card_id: string;
  amount: number;
  description?: string;
  transaction_date?: string;
}, portalId: string): Promise<GiftCardTransaction> {
  const { data, error } = await supabase
    .from("gift_card_transactions")
    .insert({ ...transaction, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Transaction not saved: ${error.message}`);
    throw error;
  }
  return data;
}

export async function deleteCardTransaction(id: string, portalId: string): Promise<void> {
  const { error } = await supabase
    .from("gift_card_transactions")
    .delete()
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    toast.error(`Transaction not deleted: ${error.message}`);
    throw error;
  }
}
