// ── Crypto Service — Supabase only (no localStorage) ─────────────────────────

import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { toast } from "sonner";
import type { CryptoHolding, CryptoPrice, CoinOption } from "../types/crypto";

// ── Holdings ─────────────────────────────────────────────────────────────────

export async function fetchHoldings(portalId: string): Promise<CryptoHolding[]> {
  const { data, error } = await supabase
    .from("crypto_holdings")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchHoldings:", error.message);
    toast.error(`Crypto load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function addHolding(holding: {
  coin_id: string; symbol: string; name: string;
  quantity: number; avg_buy_price_eur?: number; notes?: string;
}, portalId: string): Promise<CryptoHolding> {
  const { data, error } = await supabase
    .from("crypto_holdings")
    .insert({ ...holding, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Holding not saved: ${error.message}`);
    throw error;
  }
  return data;
}

export async function updateHolding(
  id: string,
  updates: { quantity?: number; avg_buy_price_eur?: number; notes?: string },
  portalId: string,
): Promise<CryptoHolding> {
  const { data, error } = await supabase
    .from("crypto_holdings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId))
    .select()
    .single();
  if (error) {
    toast.error(`Holding not updated: ${error.message}`);
    throw error;
  }
  return data;
}

export async function deleteHolding(id: string, portalId: string): Promise<void> {
  const { error } = await supabase
    .from("crypto_holdings")
    .delete()
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    toast.error(`Holding not deleted: ${error.message}`);
    throw error;
  }
}

// ── Prices / Coin List ──────────────────────────────────────────────────────

export async function fetchPricesFromCoinGecko(coinIds: string[]): Promise<CryptoPrice[]> {
  if (coinIds.length === 0) return [];
  const ids = coinIds.join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=${encodeURIComponent(ids)}&price_change_percentage=24h,7d&order=market_cap_desc&sparkline=false`,
  );
  if (!res.ok) throw new Error(`CoinGecko prices error: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const holdings = await fetchHoldings(portalId);
  if (holdings.length === 0) return [];
  const coinIds = [...new Set(holdings.map((h) => h.coin_id))];

  // Supabase price cache first (covers all + <15min old)
  const { data, error } = await supabase
    .from("crypto_prices")
    .select("*")
    .in("coin_id", coinIds);
  if (!error && data && data.length > 0) {
    const covered = coinIds.every((id) => data.some((p) => p.coin_id === id));
    const newestMs = Math.max(...data.map((p) => new Date(p.last_updated).getTime()));
    if (covered && Date.now() - newestMs < 15 * 60 * 1000) return data;
  }

  return fetchPricesFromCoinGecko(coinIds);
}

export async function fetchAvailableCoins(): Promise<CoinOption[]> {
  const { data, error } = await supabase
    .from("crypto_prices")
    .select("coin_id, symbol, name, image_url, price_eur, price_change_24h, market_cap_eur")
    .order("market_cap_eur", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("fetchAvailableCoins:", error.message);
    return [];
  }
  return (data ?? []).map((c) => ({ ...c, market_cap_rank: null }));
}

export async function searchCoinsRemote(query: string): Promise<CoinOption[]> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error(`CoinGecko search error: ${res.status}`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const holdings = await fetchHoldings(portalId);
  if (holdings.length === 0) return [];
  const coinIds = [...new Set(holdings.map((h) => h.coin_id))];
  return fetchPricesFromCoinGecko(coinIds);
}
