import { useState, useEffect, useCallback } from "react";
import type { CryptoHolding } from "../types/crypto";
import {
  fetchHoldings,
  addHolding as apiAddHolding,
  updateHolding as apiUpdateHolding,
  deleteHolding as apiDeleteHolding,
} from "../services/cryptoService";

export function useCryptoHoldings() {
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchHoldings();
      setHoldings(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const addHolding = useCallback(
    async (data: {
      coin_id: string;
      symbol: string;
      name: string;
      quantity: number;
      avg_buy_price_eur?: number;
      notes?: string;
    }) => {
      await apiAddHolding(data);
      await refetch();
    },
    [refetch],
  );

  const updateHolding = useCallback(
    async (id: string, data: { quantity?: number; avg_buy_price_eur?: number; notes?: string }) => {
      await apiUpdateHolding(id, data);
      await refetch();
    },
    [refetch],
  );

  const deleteHolding = useCallback(
    async (id: string) => {
      await apiDeleteHolding(id);
      await refetch();
    },
    [refetch],
  );

  return { holdings, isLoading, error, addHolding, updateHolding, deleteHolding, refetch };
}
