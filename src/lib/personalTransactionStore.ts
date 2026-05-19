// ── Personal Transaction filter helpers ──────────────────────────────────────
// Pure filter function — no storage. Data lives in Supabase via personalTransactionService.

import type { PersonalTransaction, TransactionFilters } from "@/types/finance";

export function applyFilters(txs: PersonalTransaction[], filters: TransactionFilters): PersonalTransaction[] {
  return txs.filter((tx) => {
    if (filters.type                && tx.type                !== filters.type)               return false;
    if (filters.category            && tx.category            !== filters.category)           return false;
    if (filters.costClassification  && tx.cost_classification !== filters.costClassification) return false;
    if (filters.categoryId          && tx.category_id         !== filters.categoryId)         return false;
    if (filters.dateFrom && tx.date < filters.dateFrom)       return false;
    if (filters.dateTo   && tx.date > filters.dateTo)         return false;
    if (filters.minAmount && tx.amount < filters.minAmount)   return false;
    if (filters.maxAmount && tx.amount > filters.maxAmount)   return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!tx.description?.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
