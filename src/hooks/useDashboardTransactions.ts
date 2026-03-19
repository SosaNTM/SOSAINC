// ── useDashboardTransactions ──────────────────────────────────────────────────
//
// Portal-scoped: reads only the active portal's transactions.
// Reads from portal-scoped localStorage key via localGetAll(portalId).
// Listens for finance-updates broadcast + window focus.

import { useState, useEffect, useCallback, useMemo } from "react";
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

  const [raw, setRaw] = useState<PersonalTransaction[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    if (!user) { setRaw([]); return; }
    const all = localGetAll(portalId).filter((t) => t.user_id === user.id);
    all.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    setRaw(all);
  }, [user, portalId]);

  // Reload when portal switches
  useEffect(() => { refresh(); }, [refresh]);

  // Listen to finance-updates broadcast channel
  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);
  useEffect(() => { refresh(); }, [tick, refresh]);

  // Re-read on window focus
  useEffect(() => {
    function onFocus() { refresh(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const transactions = useMemo(() => raw.map(toDashboard), [raw]);

  return { transactions };
}
