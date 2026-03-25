// ── Crypto Service — Supabase CRUD with localStorage fallback ────────────────

import { supabase } from "@/lib/supabase";
import type { CryptoHolding, CryptoPrice, CoinOption } from "../types/crypto";

// ── Local Storage Fallback ───────────────────────────────────────────────────

const LS_KEY = "crypto_holdings";

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return !!url && !url.includes("placeholder");
}

function readLocalHoldings(): CryptoHolding[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalHoldings(holdings: CryptoHolding[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(holdings));
}

// ── Holdings ─────────────────────────────────────────────────────────────────

export async function fetchHoldings(): Promise<CryptoHolding[]> {
  if (!isSupabaseConfigured()) return readLocalHoldings();

  const { data, error } = await supabase
    .from("crypto_holdings")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addHolding(holding: {
  coin_id: string;
  symbol: string;
  name: string;
  quantity: number;
  avg_buy_price_eur?: number;
  notes?: string;
}): Promise<CryptoHolding> {
  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const newHolding: CryptoHolding = {
      id: crypto.randomUUID(),
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
    const all = readLocalHoldings();
    all.push(newHolding);
    writeLocalHoldings(all);
    return newHolding;
  }

  const { data, error } = await supabase
    .from("crypto_holdings")
    .insert(holding)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHolding(
  id: string,
  updates: { quantity?: number; avg_buy_price_eur?: number; notes?: string },
): Promise<CryptoHolding> {
  if (!isSupabaseConfigured()) {
    const all = readLocalHoldings();
    const idx = all.findIndex((h) => h.id === id);
    if (idx === -1) throw new Error("Holding not found");
    const updated = {
      ...all[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    all[idx] = updated;
    writeLocalHoldings(all);
    return updated;
  }

  const { data, error } = await supabase
    .from("crypto_holdings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHolding(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = readLocalHoldings().filter((h) => h.id !== id);
    writeLocalHoldings(all);
    return;
  }

  const { error } = await supabase
    .from("crypto_holdings")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Prices / Coin List ──────────────────────────────────────────────────────

/** Fetch live prices from CoinGecko for a list of coin IDs */
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

export async function fetchAllPrices(): Promise<CryptoPrice[]> {
  if (!isSupabaseConfigured()) {
    // Fetch prices for holdings stored locally
    const holdings = readLocalHoldings();
    if (holdings.length === 0) return [];
    const coinIds = [...new Set(holdings.map((h) => h.coin_id))];
    return fetchPricesFromCoinGecko(coinIds);
  }

  const { data, error } = await supabase
    .from("crypto_prices")
    .select("*")
    .order("market_cap_eur", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAvailableCoins(): Promise<CoinOption[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("crypto_prices")
    .select("coin_id, symbol, name, image_url, price_eur, price_change_24h, market_cap_eur")
    .order("market_cap_eur", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map((c) => ({ ...c, market_cap_rank: null }));
}

export async function searchCoinsRemote(query: string): Promise<CoinOption[]> {
  // Call CoinGecko search API directly (CORS-friendly)
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

/** Fetch historical prices for a coin from CoinGecko (daily granularity) */
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

export async function refreshPrices(): Promise<CryptoPrice[]> {
  if (!isSupabaseConfigured()) {
    const holdings = readLocalHoldings();
    if (holdings.length === 0) return [];
    const coinIds = [...new Set(holdings.map((h) => h.coin_id))];
    return fetchPricesFromCoinGecko(coinIds);
  }
  const { error } = await supabase.functions.invoke("update-crypto-prices");
  if (error) throw error;
  return [];
}
