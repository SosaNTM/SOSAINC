import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePortal } from "@/lib/portalContext";
import type { CryptoPrice } from "../types/crypto";
import { fetchAllPrices, refreshPrices as apiRefreshPrices } from "../services/cryptoService";

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return !!url && !url.includes("placeholder");
}

const cacheKey = (portalId: string) => `swr_crypto_prices_${portalId}`;

function readCache(portalId: string): Record<string, CryptoPrice> | null {
  try {
    const raw = localStorage.getItem(cacheKey(portalId));
    return raw ? (JSON.parse(raw) as Record<string, CryptoPrice>) : null;
  } catch { return null; }
}

function writeCache(portalId: string, data: Record<string, CryptoPrice>): void {
  try { localStorage.setItem(cacheKey(portalId), JSON.stringify(data)); } catch { }
}

export function useCryptoPrices() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [prices, setPrices] = useState<Record<string, CryptoPrice>>(() => readCache(portalId) ?? {});
  const [isLoading, setIsLoading] = useState(() => readCache(portalId) === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPrices = useCallback(async (isRetry = false) => {
    if (readCache(portalId) === null) setIsLoading(true);
    try {
      setError(null);
      const data = await fetchAllPrices(portalId);
      const map: Record<string, CryptoPrice> = {};
      for (const p of data) map[p.coin_id] = p;
      setPrices(map);
      writeCache(portalId, map);
      setIsStale(false);
      if (data.length > 0) {
        const latest = data.reduce((a, b) =>
          new Date(a.last_updated) > new Date(b.last_updated) ? a : b,
        );
        setLastUpdated(new Date(latest.last_updated));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load crypto prices";
      setError(message);
      setIsStale(true);
      if (!isRetry) {
        retryTimeoutRef.current = setTimeout(() => { void loadPrices(true); }, 5000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [portalId]);

  useEffect(() => { void loadPrices(); }, [loadPrices]);

  // Auto-refresh prices every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => { void loadPrices(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadPrices]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Realtime — update price cache when Supabase pushes a price change
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const channel = supabase
        .channel("crypto-prices-live")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "crypto_prices" },
          (payload) => {
            const updated = payload.new as CryptoPrice;
            if (updated?.coin_id) {
              setPrices((prev) => {
                const next = { ...prev, [updated.coin_id]: updated };
                writeCache(portalId, next);
                return next;
              });
              setLastUpdated(new Date(updated.last_updated));
            }
          },
        )
        .subscribe();
      channelRef.current = channel;
    } catch (err) {
      console.error("Failed to subscribe to crypto prices:", err);
    }
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [portalId]);

  const refreshPrices = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const freshPrices = await apiRefreshPrices(portalId);
      if (freshPrices && freshPrices.length > 0) {
        const map: Record<string, CryptoPrice> = {};
        for (const p of freshPrices) map[p.coin_id] = p;
        setPrices(map);
        writeCache(portalId, map);
        setLastUpdated(new Date());
        setIsStale(false);
      } else {
        await loadPrices();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh crypto prices";
      setError(message);
      setIsStale(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPrices, portalId]);

  const getPriceForCoin = useCallback(
    (coinId: string): CryptoPrice | null => prices[coinId] ?? null,
    [prices],
  );

  return { prices, isLoading, lastUpdated, refreshPrices, isRefreshing, getPriceForCoin, error, isStale };
}
