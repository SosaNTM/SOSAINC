import { useState, useEffect, useCallback } from "react";
import { usePortal } from "@/lib/portalContext";
import type { CryptoHolding } from "../types/crypto";
import {
  fetchHoldings,
  addHolding as apiAddHolding,
  updateHolding as apiUpdateHolding,
  deleteHolding as apiDeleteHolding,
} from "../services/cryptoService";

export function useCryptoHoldings() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchHoldings(portalId);
      setHoldings(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [portalId]);

  useEffect(() => { refetch(); }, [refetch]);

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
