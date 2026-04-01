import { useState, useEffect, useCallback } from "react";
import type { GiftCardTransaction } from "../types/giftCards";
import {
  fetchCardTransactions, addCardTransaction, deleteCardTransaction,
} from "../services/giftCardService";

export function useGiftCardDetail(cardId: string | null) {
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!cardId) { setTransactions([]); return; }
    setIsLoading(true);
    try {
      const data = await fetchCardTransactions(cardId);
      setTransactions(data);
    } catch (err) {
      // TODO: Replace with structured error logging (Sentry, etc.)
      console.error("Failed to load transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

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
    });
    await loadTransactions();
  }, [cardId, loadTransactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteCardTransaction(id);
    await loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    isLoading,
    addTransaction,
    deleteTransaction,
    refetch: loadTransactions,
  };
}
