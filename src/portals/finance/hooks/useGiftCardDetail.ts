import { useState, useEffect, useCallback } from "react";
import { usePortal } from "@/lib/portalContext";
import type { GiftCardTransaction } from "../types/giftCards";
import {
  fetchCardTransactions, addCardTransaction, deleteCardTransaction,
} from "../services/giftCardService";

export function useGiftCardDetail(cardId: string | null) {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!cardId) { setTransactions([]); return; }
    setIsLoading(true);
    try {
      const data = await fetchCardTransactions(cardId, portalId);
      setTransactions(data);
    } catch (err) {
      // TODO: Replace with structured error logging (Sentry, etc.)
      console.error("Failed to load transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [cardId, portalId]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const addTransaction = useCallback(async (
    amount: number,
    description?: string,
    date?: string,
  ) => {
    if (!cardId) return;
    await addCardTransaction({
      gift_card_id: cardId,
      amount,
      description,
      transaction_date: date,
    }, portalId);
    await loadTransactions();
  }, [cardId, loadTransactions, portalId]);

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteCardTransaction(id, portalId);
    await loadTransactions();
  }, [loadTransactions, portalId]);

  return {
    transactions,
    isLoading,
    addTransaction,
    deleteTransaction,
    refetch: loadTransactions,
  };
}
