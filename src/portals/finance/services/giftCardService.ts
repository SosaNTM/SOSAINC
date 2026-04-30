// ── Gift Card Service — Supabase CRUD with localStorage fallback ─────────────

import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { STORAGE_GIFT_CARDS_PREFIX, STORAGE_GIFT_CARD_TX_PREFIX, STORAGE_GIFT_CARDS_LEGACY, STORAGE_GIFT_CARD_TX_LEGACY } from "@/constants/storageKeys";
import type {
  GiftCard, GiftCardBrand, GiftCardTransaction, GiftCardCurrency,
} from "../types/giftCards";

// ── Local Storage Fallback (portal-scoped) ───────────────────────────────────

// Portal-scoped localStorage keys
let CK = `${STORAGE_GIFT_CARDS_PREFIX}_sosa`;
let TK = `${STORAGE_GIFT_CARD_TX_PREFIX}_sosa`;
let currentPortalId = "sosa";

export function setGiftCardPortal(portalId: string): void {
  CK = `${STORAGE_GIFT_CARDS_PREFIX}_${portalId}`;
  TK = `${STORAGE_GIFT_CARD_TX_PREFIX}_${portalId}`;
  currentPortalId = portalId;
  // Migrate from old global keys on first access per portal
  if (!localStorage.getItem(CK)) {
    const legacy = localStorage.getItem(STORAGE_GIFT_CARDS_LEGACY);
    if (legacy) localStorage.setItem(CK, legacy);
  }
  if (!localStorage.getItem(TK)) {
    const legacy = localStorage.getItem(STORAGE_GIFT_CARD_TX_LEGACY);
    if (legacy) localStorage.setItem(TK, legacy);
  }
}

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return !!url && !url.includes("placeholder");
}

function readLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Hardcoded brands (for offline / no-Supabase mode) ────────────────────────

// Google Favicon API — reliable, no CORS issues, works for any domain
const F = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const LOCAL_BRANDS: GiftCardBrand[] = [
  // Popular payments / prepaid
  { brand_key: "paysafecard", name: "Paysafecard", logo_url: F("paysafecard.com"), color: "#00A2E0", category: "other", default_currency: "EUR", has_expiry: true, is_popular: true },
  { brand_key: "paypal", name: "PayPal", logo_url: F("paypal.com"), color: "#003087", category: "other", default_currency: "EUR", has_expiry: false, is_popular: true },
  // Shopping
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
  // Entertainment
  { brand_key: "apple", name: "Apple", logo_url: F("apple.com"), color: "#A2AAAD", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "google_play", name: "Google Play", logo_url: F("play.google.com"), color: "#34A853", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "netflix", name: "Netflix", logo_url: F("netflix.com"), color: "#E50914", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "spotify", name: "Spotify", logo_url: F("spotify.com"), color: "#1DB954", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "disney_plus", name: "Disney+", logo_url: F("disneyplus.com"), color: "#113CCF", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "playstation", name: "PlayStation", logo_url: F("playstation.com"), color: "#003791", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "xbox", name: "Xbox", logo_url: F("xbox.com"), color: "#107C10", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "nintendo", name: "Nintendo eShop", logo_url: F("nintendo.com"), color: "#E60012", category: "entertainment", default_currency: "EUR", has_expiry: false, is_popular: true },
  // Gaming
  { brand_key: "steam", name: "Steam", logo_url: F("store.steampowered.com"), color: "#1B2838", category: "gaming", default_currency: "EUR", has_expiry: false, is_popular: true },
  { brand_key: "roblox", name: "Roblox", logo_url: F("roblox.com"), color: "#E2231A", category: "gaming", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "fortnite", name: "Fortnite V-Bucks", logo_url: F("fortnite.com"), color: "#9D4DBB", category: "gaming", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "riot_games", name: "Riot Games", logo_url: F("riotgames.com"), color: "#D32936", category: "gaming", default_currency: "EUR", has_expiry: false, is_popular: false },
  // Food & Delivery
  { brand_key: "just_eat", name: "Just Eat", logo_url: F("justeat.it"), color: "#FF8000", category: "food", default_currency: "EUR", has_expiry: true, is_popular: true },
  { brand_key: "deliveroo", name: "Deliveroo", logo_url: F("deliveroo.it"), color: "#00CCBC", category: "food", default_currency: "EUR", has_expiry: true, is_popular: true },
  { brand_key: "starbucks", name: "Starbucks", logo_url: F("starbucks.com"), color: "#006241", category: "food", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "mcdonald", name: "McDonald's", logo_url: F("mcdonalds.com"), color: "#FFC72C", category: "food", default_currency: "EUR", has_expiry: true, is_popular: false },
  // Travel
  { brand_key: "airbnb", name: "Airbnb", logo_url: F("airbnb.com"), color: "#FF5A5F", category: "travel", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "booking", name: "Booking.com", logo_url: F("booking.com"), color: "#003580", category: "travel", default_currency: "EUR", has_expiry: false, is_popular: false },
  { brand_key: "flixbus", name: "FlixBus", logo_url: F("flixbus.com"), color: "#73D700", category: "travel", default_currency: "EUR", has_expiry: true, is_popular: false },
  { brand_key: "ryanair", name: "Ryanair", logo_url: F("ryanair.com"), color: "#073590", category: "travel", default_currency: "EUR", has_expiry: true, is_popular: false },
];

// ── Brands ───────────────────────────────────────────────────────────────────

export async function fetchBrands(): Promise<GiftCardBrand[]> {
  if (!isSupabaseConfigured()) return LOCAL_BRANDS;
  try {
    const { data, error } = await supabase
      .from("gift_card_brands")
      .select("*")
      .order("is_popular", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data && data.length > 0) ? data : LOCAL_BRANDS;
  } catch {
    return LOCAL_BRANDS;
  }
}

// ── Gift Cards ───────────────────────────────────────────────────────────────

export async function fetchGiftCards(): Promise<GiftCard[]> {
  if (!isSupabaseConfigured()) {
    return readLocal<GiftCard>(CK);
  }

  try {
    const { data, error } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("portal_id", toPortalUUID(currentPortalId))
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return readLocal<GiftCard>(CK);
  }
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
}): Promise<GiftCard> {
  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const isPartial = card.remaining_value < card.initial_value;
    const newCard: GiftCard = {
      id: crypto.randomUUID(),
      user_id: "local",
      brand: card.brand,
      brand_key: card.brand_key,
      card_code: card.card_code ?? null,
      pin: card.pin ?? null,
      initial_value: card.initial_value,
      remaining_value: card.remaining_value,
      currency: card.currency,
      purchase_date: card.purchase_date ?? null,
      expiry_date: card.expiry_date ?? null,
      status: isPartial ? "partially_used" : "active",
      notes: card.notes ?? null,
      is_favorite: false,
      created_at: now,
      updated_at: now,
    };
    const all = readLocal<GiftCard>(CK);
    all.push(newCard);
    writeLocal(CK, all);
    return newCard;
  }

  try {
    const { data, error } = await supabase
      .from("gift_cards")
      .insert({ ...card, portal_id: toPortalUUID(currentPortalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const now = new Date().toISOString();
    const isPartial = card.remaining_value < card.initial_value;
    const newCard: GiftCard = {
      id: crypto.randomUUID(), user_id: "local", brand: card.brand, brand_key: card.brand_key,
      card_code: card.card_code ?? null, pin: card.pin ?? null,
      initial_value: card.initial_value, remaining_value: card.remaining_value, currency: card.currency,
      purchase_date: card.purchase_date ?? null, expiry_date: card.expiry_date ?? null,
      status: isPartial ? "partially_used" : "active", notes: card.notes ?? null,
      is_favorite: false, created_at: now, updated_at: now,
    };
    const all = readLocal<GiftCard>(CK);
    all.push(newCard);
    writeLocal(CK, all);
    return newCard;
  }
}

export async function updateGiftCard(
  id: string,
  updates: Partial<Pick<GiftCard, "remaining_value" | "card_code" | "pin" | "purchase_date" | "expiry_date" | "notes" | "status" | "is_favorite">>,
): Promise<GiftCard> {
  if (!isSupabaseConfigured()) {
    const all = readLocal<GiftCard>(CK);
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Gift card not found");
    const card = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    // Auto-status logic (mirrors DB trigger)
    if (updates.remaining_value !== undefined) {
      if (card.remaining_value <= 0) {
        card.status = "fully_used";
        card.remaining_value = 0;
      } else if (card.remaining_value < card.initial_value) {
        card.status = "partially_used";
      } else {
        card.status = "active";
      }
    }
    all[idx] = card;
    writeLocal(CK, all);
    return card;
  }

  try {
    const { data, error } = await supabase
      .from("gift_cards")
      .update(updates)
      .eq("id", id)
      .eq("portal_id", toPortalUUID(currentPortalId))
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const all = readLocal<GiftCard>(CK);
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Gift card not found");
    const card = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    if (updates.remaining_value !== undefined) {
      if (card.remaining_value <= 0) { card.status = "fully_used"; card.remaining_value = 0; }
      else if (card.remaining_value < card.initial_value) { card.status = "partially_used"; }
      else { card.status = "active"; }
    }
    all[idx] = card;
    writeLocal(CK, all);
    return card;
  }
}

export async function deleteGiftCard(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    writeLocal(CK, readLocal<GiftCard>(CK).filter((c) => c.id !== id));
    // Also remove associated transactions
    writeLocal(TK, readLocal<GiftCardTransaction>(TK).filter((t) => t.gift_card_id !== id));
    return;
  }

  try {
    const { error } = await supabase.from("gift_cards").delete().eq("id", id).eq("portal_id", toPortalUUID(currentPortalId));
    if (error) throw error;
  } catch {
    writeLocal(CK, readLocal<GiftCard>(CK).filter((c) => c.id !== id));
    writeLocal(TK, readLocal<GiftCardTransaction>(TK).filter((t) => t.gift_card_id !== id));
  }
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = readLocal<GiftCard>(CK);
    const idx = all.findIndex((c) => c.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], is_favorite: isFavorite, updated_at: new Date().toISOString() };
      writeLocal(CK, all);
    }
    return;
  }

  try {
    const { error } = await supabase
      .from("gift_cards")
      .update({ is_favorite: isFavorite })
      .eq("id", id)
      .eq("portal_id", toPortalUUID(currentPortalId));
    if (error) throw error;
  } catch {
    const all = readLocal<GiftCard>(CK);
    const idx = all.findIndex((c) => c.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], is_favorite: isFavorite, updated_at: new Date().toISOString() };
      writeLocal(CK, all);
    }
  }
}

// ── Gift Card Transactions ───────────────────────────────────────────────────

export async function fetchCardTransactions(giftCardId: string): Promise<GiftCardTransaction[]> {
  if (!isSupabaseConfigured()) {
    return readLocal<GiftCardTransaction>(TK)
      .filter((t) => t.gift_card_id === giftCardId)
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }

  try {
    const { data, error } = await supabase
      .from("gift_card_transactions")
      .select("*")
      .eq("gift_card_id", giftCardId)
      .eq("portal_id", toPortalUUID(currentPortalId))
      .order("transaction_date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return readLocal<GiftCardTransaction>(TK)
      .filter((t) => t.gift_card_id === giftCardId)
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }
}

export async function addCardTransaction(transaction: {
  gift_card_id: string;
  amount: number;
  description?: string;
  transaction_date?: string;
}): Promise<GiftCardTransaction> {
  if (!isSupabaseConfigured()) {
    const newTx: GiftCardTransaction = {
      id: crypto.randomUUID(),
      user_id: "local",
      gift_card_id: transaction.gift_card_id,
      amount: transaction.amount,
      description: transaction.description ?? null,
      transaction_date: transaction.transaction_date ?? new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
    const allTx = readLocal<GiftCardTransaction>(TK);
    allTx.push(newTx);
    writeLocal(TK, allTx);

    // Mirror DB trigger: update remaining_value
    const allCards = readLocal<GiftCard>(CK);
    const idx = allCards.findIndex((c) => c.id === transaction.gift_card_id);
    if (idx !== -1) {
      const card = allCards[idx];
      const newRemaining = Math.max(0, card.remaining_value - transaction.amount);
      allCards[idx] = {
        ...card,
        remaining_value: newRemaining,
        status: newRemaining <= 0 ? "fully_used" : newRemaining < card.initial_value ? "partially_used" : "active",
        updated_at: new Date().toISOString(),
      };
      writeLocal(CK, allCards);
    }

    return newTx;
  }

  try {
    const { data, error } = await supabase
      .from("gift_card_transactions")
      .insert({ ...transaction, portal_id: toPortalUUID(currentPortalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const newTx: GiftCardTransaction = {
      id: crypto.randomUUID(), user_id: "local", gift_card_id: transaction.gift_card_id,
      amount: transaction.amount, description: transaction.description ?? null,
      transaction_date: transaction.transaction_date ?? new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
    const allTx = readLocal<GiftCardTransaction>(TK);
    allTx.push(newTx);
    writeLocal(TK, allTx);
    const allCards = readLocal<GiftCard>(CK);
    const idx = allCards.findIndex((c) => c.id === transaction.gift_card_id);
    if (idx !== -1) {
      const card = allCards[idx];
      const newRemaining = Math.max(0, card.remaining_value - transaction.amount);
      allCards[idx] = { ...card, remaining_value: newRemaining,
        status: newRemaining <= 0 ? "fully_used" : newRemaining < card.initial_value ? "partially_used" : "active",
        updated_at: new Date().toISOString() };
      writeLocal(CK, allCards);
    }
    return newTx;
  }
}

export async function deleteCardTransaction(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const allTx = readLocal<GiftCardTransaction>(TK);
    const tx = allTx.find((t) => t.id === id);
    if (tx) {
      // Mirror reverse trigger: restore remaining_value
      const allCards = readLocal<GiftCard>(CK);
      const idx = allCards.findIndex((c) => c.id === tx.gift_card_id);
      if (idx !== -1) {
        const card = allCards[idx];
        const newRemaining = Math.min(card.initial_value, card.remaining_value + tx.amount);
        allCards[idx] = {
          ...card,
          remaining_value: newRemaining,
          status: newRemaining >= card.initial_value ? "active" : "partially_used",
          updated_at: new Date().toISOString(),
        };
        writeLocal(CK, allCards);
      }
    }
    writeLocal(TK, allTx.filter((t) => t.id !== id));
    return;
  }

  try {
    const { error } = await supabase.from("gift_card_transactions").delete().eq("id", id).eq("portal_id", toPortalUUID(currentPortalId));
    if (error) throw error;
  } catch {
    const allTx = readLocal<GiftCardTransaction>(TK);
    const tx = allTx.find((t) => t.id === id);
    if (tx) {
      const allCards = readLocal<GiftCard>(CK);
      const idx = allCards.findIndex((c) => c.id === tx.gift_card_id);
      if (idx !== -1) {
        const card = allCards[idx];
        const newRemaining = Math.min(card.initial_value, card.remaining_value + tx.amount);
        allCards[idx] = { ...card, remaining_value: newRemaining,
          status: newRemaining >= card.initial_value ? "active" : "partially_used",
          updated_at: new Date().toISOString() };
        writeLocal(CK, allCards);
      }
    }
    writeLocal(TK, allTx.filter((t) => t.id !== id));
  }
}
