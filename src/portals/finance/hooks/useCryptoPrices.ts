import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePortal } from "@/lib/portalContext";
import type { CryptoPrice } from "../types/crypto";
import { fetchAllPrices, refreshPrices as apiRefreshPrices } from "../services/cryptoService";

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return !!url && !url.includes("placeholder");
}

export function useCryptoPrices() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPrices = useCallback(async (isRetry = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAllPrices(portalId);
      const map: Record<string, CryptoPrice> = {};
      for (const p of data) {
        map[p.coin_id] = p;
      }
      setPrices(map);
      setIsStale(false);
      if (data.length > 0) {
        const latest = data.reduce((a, b) =>
          new Date(a.last_updated) > new Date(b.last_updated) ? a : b,
        );
        setLastUpdated(new Date(latest.last_updated));
      }
    } catch (err) {
      // TODO: Replace with structured error logging (Sentry, etc.)
      const message = err instanceof Error ? err.message : "Failed to load crypto prices";
      setError(message);
      setIsStale(true);
      // Retry once after 5 seconds on first failure
      if (!isRetry) {
        retryTimeoutRef.current = setTimeout(() => { loadPrices(true); }, 5000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [portalId]);

  useEffect(() => { loadPrices(); }, [loadPrices]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Realtime subscription — only when Supabase is configured
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
              setPrices((prev) => ({ ...prev, [updated.coin_id]: updated }));
              setLastUpdated(new Date(updated.last_updated));
            }
          },
        )
        .subscribe();

      channelRef.current = channel;
    } catch (err) {
      // TODO: Replace with structured error logging (Sentry, etc.)
      console.error("Failed to subscribe to crypto prices:", err);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const refreshPrices = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const freshPrices = await apiRefreshPrices(portalId);
      // If CoinGecko returned data directly (local mode), use it
      if (freshPrices && freshPrices.length > 0) {
        const map: Record<string, CryptoPrice> = {};
        for (const p of freshPrices) {
          map[p.coin_id] = p;
        }
        setPrices(map);
        setLastUpdated(new Date());
        setIsStale(false);
      } else {
        await loadPrices();
      }
    } catch (err) {
      // TODO: Replace with structured error logging (Sentry, etc.)
      const message = err instanceof Error ? err.message : "Failed to refresh crypto prices";
      setError(message);
      setIsStale(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPrices]);

  const getPriceForCoin = useCallback(
    (coinId: string): CryptoPrice | null => prices[coinId] ?? null,
    [prices],
  );

  return { prices, isLoading, lastUpdated, refreshPrices, isRefreshing, getPriceForCoin, error, isStale };
}
