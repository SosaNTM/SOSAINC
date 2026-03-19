// ── useTransactions ────────────────────────────────────────────────────────────
//
// Portal-scoped: each portal has its own isolated transaction data.
// Primary: portal-scoped localStorage store.
// Secondary: Supabase personal_transactions filtered by portal_id.

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { broadcastFinanceUpdate, subscribeToFinanceUpdates } from "@/lib/financeRealtime";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import {
  localGetAll, localAdd, localUpdate, localDelete, applyFilters,
} from "@/lib/personalTransactionStore";
import type { PersonalTransaction, NewPersonalTransaction, TransactionFilters } from "@/types/finance";

function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
  return !!url && !url.includes("placeholder");
}

function toPersonal(row: any): PersonalTransaction {
  return {
    id:                 row.id,
    user_id:            row.user_id,
    type:               row.type,
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
  };
}

export interface UseTransactionsResult {
  transactions:       PersonalTransaction[];
  isLoading:          boolean;
  error:              string | null;
  page:               number;
  hasMore:            boolean;
  addTransaction:     (data: NewPersonalTransaction) => Promise<boolean>;
  updateTransaction:  (id: string, changes: Partial<NewPersonalTransaction>) => Promise<boolean>;
  deleteTransaction:  (id: string) => Promise<boolean>;
  setPage:            (p: number) => void;
  refetch:            () => void;
}

const PAGE_SIZE = 20;

export function useTransactions(filters: TransactionFilters = {}): UseTransactionsResult {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [all,       setAll]       = useState<PersonalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [page,      setPage]      = useState(0);
  const [tick,      setTick]      = useState(0);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const load = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);

    if (isSupabaseConfigured()) {
      const parsedFilters: TransactionFilters = JSON.parse(filtersKey);
      let q = supabase
        .from("personal_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("portal_id", portalId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (parsedFilters.type)      q = q.eq("type", parsedFilters.type);
      if (parsedFilters.category)  q = q.eq("category", parsedFilters.category);
      if (parsedFilters.dateFrom)  q = q.gte("date", parsedFilters.dateFrom);
      if (parsedFilters.dateTo)    q = q.lte("date", parsedFilters.dateTo);
      if (parsedFilters.minAmount) q = q.gte("amount", parsedFilters.minAmount);
      if (parsedFilters.maxAmount) q = q.lte("amount", parsedFilters.maxAmount);
      if (parsedFilters.search) {
        q = q.or(`description.ilike.%${parsedFilters.search}%,category.ilike.%${parsedFilters.search}%`);
      }

      const { data, error: err } = await q;
      if (!err && data) {
        setAll(data.map(toPersonal));
        setIsLoading(false);
        return;
      }
    }

    // Fallback: portal-scoped localStorage
    const local = localGetAll(portalId).filter((t) => t.user_id === user.id);
    setAll(applyFilters(local, JSON.parse(filtersKey)));
    setIsLoading(false);
  }, [user, portalId, filtersKey, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when portal changes
  useEffect(() => { setPage(0); }, [portalId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);

  const transactions = useMemo(() => {
    const from = page * PAGE_SIZE;
    return all.slice(from, from + PAGE_SIZE);
  }, [all, page]);

  const hasMore = (page + 1) * PAGE_SIZE < all.length;

  const addTransaction = useCallback(async (data: NewPersonalTransaction): Promise<boolean> => {
    if (!user) return false;
    try {
      if (isSupabaseConfigured()) {
        const { error: err } = await supabase
          .from("personal_transactions")
          .insert({ ...data, user_id: user.id, portal_id: portalId } as any);
        if (err) throw err;
      } else {
        localAdd(data, user.id, portalId);
      }
      broadcastFinanceUpdate("transaction_added");
      toast.success("Transaction added");
      return true;
    } catch {
      try {
        localAdd(data, user.id, portalId);
        broadcastFinanceUpdate("transaction_added");
        toast.success("Transaction added");
        return true;
      } catch {
        toast.error("Error: unable to save transaction");
        return false;
      }
    }
  }, [user, portalId]);

  const updateTransaction = useCallback(async (id: string, changes: Partial<NewPersonalTransaction>): Promise<boolean> => {
    if (!user) return false;
    try {
      if (isSupabaseConfigured()) {
        const { error: err } = await supabase
          .from("personal_transactions")
          .update(changes as any)
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("portal_id", portalId);
        if (err) throw err;
      } else {
        localUpdate(id, changes, portalId);
      }
      broadcastFinanceUpdate("transaction_updated", { id });
      toast.success("Transaction updated");
      return true;
    } catch {
      localUpdate(id, changes, portalId);
      broadcastFinanceUpdate("transaction_updated", { id });
      toast.success("Transaction updated");
      return true;
    }
  }, [user, portalId]);

  const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
      if (isSupabaseConfigured()) {
        const { error: err } = await supabase
          .from("personal_transactions")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("portal_id", portalId);
        if (err) throw err;
      } else {
        localDelete(id, portalId);
      }
      broadcastFinanceUpdate("transaction_deleted", { id });
      toast.success("Transaction deleted");
      return true;
    } catch {
      localDelete(id, portalId);
      broadcastFinanceUpdate("transaction_deleted", { id });
      toast.success("Transaction deleted");
      return true;
    }
  }, [user, portalId]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { transactions, isLoading, error, page, hasMore, addTransaction, updateTransaction, deleteTransaction, setPage, refetch };
}
