// ── useDashboardTransactions ──────────────────────────────────────────────────
//
// Portal-scoped: reads the active portal's transactions from Supabase.
// No pagination — dashboard needs the full set for period filtering.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { subscribeToFinanceUpdates } from "@/lib/financeRealtime";
import { useAuth } from "@/lib/authContext";
import { usePortalDB } from "@/lib/portalContextDB";
import type { PersonalTransaction } from "@/types/finance";

export interface DashboardTransaction {
  id: string;
  merchant: string;
  amount: number;
  date: Date;
  category: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPersonal(row: any): PersonalTransaction {
  return {
    id:                  row.id,
    user_id:             row.user_id,
    type:                row.type,
    amount:              Number(row.amount),
    currency:            row.currency ?? "EUR",
    category:            row.category,
    subcategory:         row.subcategory ?? undefined,
    description:         row.description ?? "",
    date:                row.date,
    payment_method:      row.payment_method ?? undefined,
    is_recurring:        row.is_recurring ?? false,
    recurring_interval:  row.recurring_interval ?? undefined,
    tags:                row.tags ?? undefined,
    receipt_url:         row.receipt_url ?? undefined,
    cost_classification: row.cost_classification ?? undefined,
    category_id:         row.category_id ?? undefined,
    created_at:          row.created_at,
    updated_at:          row.updated_at,
  };
}

function toDashboard(tx: PersonalTransaction): DashboardTransaction {
  const signed = tx.type === "income" ? tx.amount : -tx.amount;
  return {
    id: tx.id,
    merchant: tx.description || tx.category,
    amount: signed,
    date: new Date(tx.date + "T00:00:00"),
    category: tx.category,
  };
}

export function useDashboardTransactions() {
  const { user } = useAuth();
  const { currentPortalId } = usePortalDB();

  const [raw, setRaw] = useState<PersonalTransaction[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!user || !currentPortalId) { setRaw([]); return; }
    const { data, error: err } = await supabase
      .from("personal_transactions")
      .select("*")
      .eq("portal_id", currentPortalId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000);

    if (err) {
      setRaw([]);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRaw((data as any[] | null ?? []).map(toPersonal));
  }, [user, currentPortalId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);
  useEffect(() => { void refresh(); }, [tick, refresh]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const transactions = useMemo(() => raw.map(toDashboard), [raw]);

  return { transactions, rawTransactions: raw };
}
