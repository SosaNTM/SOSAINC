import { useState, useEffect, useCallback } from "react";
import { usePortal } from "@/lib/portalContext";
import type { CryptoHolding } from "../types/crypto";
import {
  fetchHoldings,
  addHolding as apiAddHolding,
  updateHolding as apiUpdateHolding,
  deleteHolding as apiDeleteHolding,
} from "../services/cryptoService";

const cacheKey = (portalId: string) => `swr_crypto_holdings_${portalId}`;

function readCache(portalId: string): CryptoHolding[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(portalId));
    return raw ? (JSON.parse(raw) as CryptoHolding[]) : null;
  } catch { return null; }
}

function writeCache(portalId: string, data: CryptoHolding[]): void {
  try { localStorage.setItem(cacheKey(portalId), JSON.stringify(data)); } catch { }
}

export function useCryptoHoldings() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [holdings, setHoldings] = useState<CryptoHolding[]>(() => readCache(portalId) ?? []);
  const [isLoading, setIsLoading] = useState(() => readCache(portalId) === null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (readCache(portalId) === null) setIsLoading(true);
    try {
      setError(null);
      const data = await fetchHoldings(portalId);
      setHoldings(data);
      writeCache(portalId, data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [portalId]);

  useEffect(() => { void refetch(); }, [refetch]);

  const addHolding = useCallback(
    async (data: {
      coin_id: string; symbol: string; name: string;
      quantity: number; avg_buy_price_eur?: number; notes?: string;
    }) => {
      await apiAddHolding(data, portalId);
      await refetch();
    },
    [refetch, portalId],
  );

  const updateHolding = useCallback(
    async (id: string, data: { quantity?: number; avg_buy_price_eur?: number; notes?: string }) => {
      await apiUpdateHolding(id, data, portalId);
      await refetch();
    },
    [refetch, portalId],
  );

  const deleteHolding = useCallback(
    async (id: string) => {
      await apiDeleteHolding(id, portalId);
      await refetch();
    },
    [refetch, portalId],
  );

  return { holdings, isLoading, error, addHolding, updateHolding, deleteHolding, refetch };
}
