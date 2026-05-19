// ── useBudgetCategoryTransactions ─────────────────────────────────────────────
//
// Returns personal_transactions from the active portal for a budget category + month/year.
// Supabase only — refetches when the finance-updates broadcast channel fires.

import { useState, useEffect, useCallback } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { subscribeToFinanceUpdates } from "@/lib/financeRealtime";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { toPortalUUID } from "@/lib/portalUUID";
import type { PersonalTransaction } from "@/types/finance";

export interface BudgetCategoryTransactionsResult {
  transactions: PersonalTransaction[];
  expenses:     PersonalTransaction[];
  income:       PersonalTransaction[];
  totalSpent:   number;
  transactionCount: number;
  isLoading:    boolean;
  error:        string | null;
}

const EMPTY: BudgetCategoryTransactionsResult = {
  transactions: [], expenses: [], income: [],
  totalSpent: 0, transactionCount: 0,
  isLoading: false, error: null,
};

export function useBudgetCategoryTransactions(
  categoryId:   string | null,
  categoryName: string | null,
  month: number,   // 0-indexed (0 = January)
  year:  number,
): BudgetCategoryTransactionsResult {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [result, setResult] = useState<BudgetCategoryTransactionsResult>({ ...EMPTY, isLoading: true });
  const [tick, setTick]     = useState(0);

  const fetch = useCallback(async () => {
    if (!user || (!categoryId && !categoryName)) {
      setResult(EMPTY);
      return;
    }
    setResult((prev) => ({ ...prev, isLoading: true, error: null }));

    const catVariants = new Set<string>();
    if (categoryId)   catVariants.add(categoryId.toLowerCase());
    if (categoryName) catVariants.add(categoryName.toLowerCase());

    const monthStr = String(month + 1).padStart(2, "0");
    const fromDate = `${year}-${monthStr}-01`;
    const lastDay  = new Date(year, month + 1, 0).getDate();
    const toDate   = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

    const { data: rawData, error } = await supabase
      .from("personal_transactions")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: false });

    if (error) {
      setResult({ ...EMPTY, error: "Unable to load transactions." });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allTxs: PersonalTransaction[] = (rawData ?? []).map((row: Record<string, any>) => ({
      id:                 row.id,
      user_id:            row.user_id,
      type:               row.type as PersonalTransaction["type"],
      amount:             Number(row.amount),
      currency:           row.currency ?? "EUR",
      category:           row.category,
      subcategory:        row.subcategory ?? undefined,
      description:        row.description ?? "",
      date:               row.date,
      payment_method:     row.payment_method ?? undefined,
      is_recurring:       row.is_recurring ?? false,
      recurring_interval: row.recurring_interval ?? undefined,
      tags:               row.tags ?? undefined,
      receipt_url:        row.receipt_url ?? undefined,
      created_at:         row.created_at,
      updated_at:         row.updated_at,
    }));

    // Filter by category variants (case-insensitive)
    const txs = allTxs.filter((t) =>
      catVariants.has((t.category ?? "").toLowerCase())
    );

    const expenses    = txs.filter((t) => t.type === "expense");
    const income      = txs.filter((t) => t.type === "income");
    const totalSpent  = expenses.reduce((s, t) => s + t.amount, 0);

    setResult({
      transactions: txs,
      expenses,
      income,
      totalSpent,
      transactionCount: txs.length,
      isLoading: false,
      error: null,
    });
  }, [user, portalId, categoryId, categoryName, month, year, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);

  return result;
}
