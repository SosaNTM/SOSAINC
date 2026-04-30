// ── Crypto Service — Supabase CRUD with localStorage fallback ────────────────
// If Supabase is not configured OR the table doesn't exist yet, all operations
// transparently fall back to localStorage so the UI always works.

import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { STORAGE_CRYPTO_HOLDINGS_PREFIX, STORAGE_CRYPTO_HOLDINGS_LEGACY } from "@/constants/storageKeys";
import type { CryptoHolding, CryptoPrice, CoinOption } from "../types/crypto";

// ── Local Storage Fallback (portal-scoped) ───────────────────────────────────

function lsKey(portalId: string): string {
  return `${STORAGE_CRYPTO_HOLDINGS_PREFIX}_${portalId}`;
}

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return !!url && !url.includes("placeholder");
}

function readLocalHoldings(portalId: string): CryptoHolding[] {
  try {
    const raw = localStorage.getItem(lsKey(portalId));
    if (raw) return JSON.parse(raw);
    // Migrate from old global key on first access
    const legacy = localStorage.getItem(STORAGE_CRYPTO_HOLDINGS_LEGACY);
    if (legacy) {
      localStorage.setItem(lsKey(portalId), legacy);
      return JSON.parse(legacy);
    }
    return [];
  } catch {
    return [];
  }
}

function writeLocalHoldings(holdings: CryptoHolding[], portalId: string): void {
  localStorage.setItem(lsKey(portalId), JSON.stringify(holdings));
}

function makeLocalHolding(holding: {
  coin_id: string; symbol: string; name: string;
  quantity: number; avg_buy_price_eur?: number; notes?: string;
}): CryptoHolding {
  const now = new Date().toISOString();
  return {
    id: `local_${crypto.randomUUID()}`,
    user_id: "local",
    coin_id: holding.coin_id,
    symbol: holding.symbol,
    name: holding.name,
    quantity: holding.quantity,
    avg_buy_price_eur: holding.avg_buy_price_eur ?? null,
    notes: holding.notes ?? null,
    created_at: now,
    updated_at: now,
  };
}

// ── Holdings ─────────────────────────────────────────────────────────────────

export async function fetchHoldings(portalId: string): Promise<CryptoHolding[]> {
  if (!isSupabaseConfigured()) return readLocalHoldings(portalId);
  try {
    const { data, error } = await supabase
      .from("crypto_holdings")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("created_at", { ascending: true });
    if (error) throw error;
    const remote = data || [];
    // Merge local-only holdings (id starts with "local_") so offline-added ones persist
    const remoteIds = new Set(remote.map((h) => h.id));
    const localOnly = readLocalHoldings(portalId).filter((h) => h.id.startsWith("local_") && !remoteIds.has(h.id));
    return [...remote, ...localOnly];
  } catch {
    return readLocalHoldings(portalId);
  }
}

export async function addHolding(holding: {
  coin_id: string; symbol: string; name: string;
  quantity: number; avg_buy_price_eur?: number; notes?: string;
}, portalId: string): Promise<CryptoHolding> {
  if (!isSupabaseConfigured()) {
    const newH = makeLocalHolding(holding);
    const all = readLocalHoldings(portalId);
    all.push(newH);
    writeLocalHoldings(all, portalId);
    return newH;
  }
  try {
    const { data, error } = await supabase
      .from("crypto_holdings")
      .insert({ ...holding, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const newH = makeLocalHolding(holding);
    const all = readLocalHoldings(portalId);
    all.push(newH);
    writeLocalHoldings(all, portalId);
    return newH;
  }
}

export async function updateHolding(
  id: string,
  updates: { quantity?: number; avg_buy_price_eur?: number; notes?: string },
  portalId: string,
): Promise<CryptoHolding> {
  const now = new Date().toISOString();

  // Try localStorage first (covers local_ ids and offline fallback holdings)
  const localAll = readLocalHoldings(portalId);
  const localIdx = localAll.findIndex((h) => h.id === id);
  if (localIdx !== -1) {
    const updated = { ...localAll[localIdx], ...updates, updated_at: now };
    localAll[localIdx] = updated;
    writeLocalHoldings(localAll, portalId);
    // Also sync to Supabase if configured (fire-and-forget, don't block)
    if (isSupabaseConfigured()) {
      supabase.from("crypto_holdings").update({ ...updates, updated_at: now }).eq("id", id).then(() => { /* noop */ });
    }
    return updated;
  }

  if (!isSupabaseConfigured()) throw new Error("Holding not found");

  // Holding is in Supabase — update with portal_id filter to enforce isolation.
  // No fallback without portal_id: if RLS rejects the update, surface the error.
  const { error } = await supabase
    .from("crypto_holdings")
    .update({ ...updates, updated_at: now })
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) throw error;

  // Return an optimistic object — caller re-fetches via refetch() immediately after
  return { id, user_id: "", coin_id: "", symbol: "", name: "", quantity: updates.quantity ?? 0, avg_buy_price_eur: updates.avg_buy_price_eur ?? null, notes: updates.notes ?? null, created_at: now, updated_at: now };
}

export async function deleteHolding(id: string, portalId: string): Promise<void> {
  // Always purge from localStorage regardless of Supabase state
  writeLocalHoldings(readLocalHoldings(portalId).filter((h) => h.id !== id), portalId);

  if (!isSupabaseConfigured() || id.startsWith("local_")) return;

  try {
    const { error } = await supabase
      .from("crypto_holdings")
      .delete()
      .eq("id", id)
      .eq("portal_id", toPortalUUID(portalId));
    if (error) throw error;
  } catch { /* already removed from localStorage above */ }
}

// ── Prices / Coin List ──────────────────────────────────────────────────────

export async function fetchPricesFromCoinGecko(coinIds: string[]): Promise<CryptoPrice[]> {
  if (coinIds.length === 0) return [];
  const ids = coinIds.join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=${encodeURIComponent(ids)}&price_change_percentage=24h,7d&order=market_cap_desc&sparkline=false`,
  );
  if (!res.ok) throw new Error(`CoinGecko prices error: ${res.status}`);
  const json: any[] = await res.json();
  return json.map((c) => ({
    coin_id: c.id,
    symbol: (c.symbol as string).toUpperCase(),
    name: c.name,
    price_eur: c.current_price ?? 0,
    price_usd: null,
    market_cap_eur: c.market_cap ?? null,
    price_change_24h: c.price_change_percentage_24h ?? 0,
    price_change_7d: c.price_change_percentage_7d_in_currency ?? null,
    ath_eur: c.ath ?? null,
    circulating_supply: c.circulating_supply ?? null,
    image_url: c.image ?? null,
    last_updated: c.last_updated ?? new Date().toISOString(),
  }));
}

export async function fetchAllPrices(portalId: string): Promise<CryptoPrice[]> {
  // Always resolve which coins to price from the actual holdings (Supabase or local).
  const holdings = await fetchHoldings(portalId);
  if (holdings.length === 0) return [];
  const coinIds = [...new Set(holdings.map((h) => h.coin_id))];

  // Try the Supabase price cache first — only trust it if every held coin is
  // covered AND the newest entry is < 15 minutes old.
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("crypto_prices")
        .select("*")
        .in("coin_id", coinIds);
      if (!error && data && data.length > 0) {
        const covered = coinIds.every((id) => data.some((p) => p.coin_id === id));
        const newestMs = Math.max(...data.map((p) => new Date(p.last_updated).getTime()));
        if (covered && Date.now() - newestMs < 15 * 60 * 1000) return data;
      }
    } catch { /* fall through to CoinGecko */ }
  }

  return fetchPricesFromCoinGecko(coinIds);
}

export async function fetchAvailableCoins(): Promise<CoinOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("crypto_prices")
      .select("coin_id, symbol, name, image_url, price_eur, price_change_24h, market_cap_eur")
      .order("market_cap_eur", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data || []).map((c) => ({ ...c, market_cap_rank: null }));
  } catch {
    return [];
  }
}

export async function searchCoinsRemote(query: string): Promise<CoinOption[]> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`CoinGecko search error: ${res.status}`);
  const json = await res.json();
  return ((json.coins as any[]) || []).slice(0, 15).map((c: any) => ({
    coin_id: c.id,
    symbol: (c.symbol as string).toUpperCase(),
    name: c.name,
    image_url: c.thumb || c.large || null,
    price_eur: 0,
    price_change_24h: 0,
    market_cap_rank: c.market_cap_rank ?? null,
  }));
}

export async function fetchCoinHistory(
  coinId: string,
  days: number,
): Promise<{ timestamp: number; price: number }[]> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=eur&days=${days}&interval=daily`,
  );
  if (!res.ok) throw new Error(`CoinGecko history error: ${res.status}`);
  const json = await res.json();
  return ((json.prices as [number, number][]) || []).map(([ts, price]) => ({
    timestamp: ts,
    price,
  }));
}

export async function refreshPrices(portalId: string): Promise<CryptoPrice[]> {
  // Always fetch live prices directly from CoinGecko for the user's holdings.
  const holdings = await fetchHoldings(portalId);
  if (holdings.length === 0) return [];
  const coinIds = [...new Set(holdings.map((h) => h.coin_id))];
  return fetchPricesFromCoinGecko(coinIds);
}
