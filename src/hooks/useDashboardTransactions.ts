// ── useDashboardTransactions ──────────────────────────────────────────────────
//
// Portal-scoped: reads the active portal's transactions.
// Same data source as useTransactions: Supabase primary, localStorage fallback.
// No pagination — dashboard needs the full set for period filtering.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { toPortalUUID } from "@/lib/portalUUID";
import { subscribeToFinanceUpdates } from "@/lib/financeRealtime";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { localGetAll } from "@/lib/personalTransactionStore";
import type { PersonalTransaction } from "@/types/finance";

export interface DashboardTransaction {
  id: string;
  merchant: string;
  amount: number;        // signed: positive = income, negative = expense
  date: Date;
  category: string;
}

function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
  return !!url && !url.includes("placeholder");
}

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
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [raw, setRaw] = useState<PersonalTransaction[]>(() => {
    try { return localGetAll(portalId); } catch { return []; }
  });
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) { setRaw([]); return; }

    if (isSupabaseConfigured()) {
      const { data, error: err } = await supabase
        .from("personal_transactions")
        .select("*")
        .eq("portal_id", toPortalUUID(portalId))
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(2000);

      if (!err && data) {
        const remote = data.map(toPersonal);
        const remoteIds = new Set(remote.map((t) => t.id));
        const local = localGetAll(portalId);
        const localOnly = local.filter((t) => t.id.startsWith("local_") && !remoteIds.has(t.id));
        const merged = [...remote, ...localOnly].sort((a, b) =>
          b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
        );
        setRaw(merged);
        return;
      }
    }

    // Fallback: localStorage only
    const local = localGetAll(portalId);
    local.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    setRaw(local);
  }, [user, portalId]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Listen to finance-updates broadcast (fires after addTransaction)
  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);
  useEffect(() => { void refresh(); }, [tick, refresh]);

  // Re-read on window focus
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const transactions = useMemo(() => raw.map(toDashboard), [raw]);

  return { transactions, rawTransactions: raw };
}
