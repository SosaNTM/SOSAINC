// ── useFinanceSummary ─────────────────────────────────────────────────────────
//
// Portal-scoped: aggregates personal_transactions for the active portal.
// Used by Dashboard, Budget, and Analytics.

import { useState, useEffect, useCallback } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { toPortalUUID } from "@/lib/portalUUID";
import { subscribeToFinanceUpdates } from "@/lib/financeRealtime";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { getAllCategories } from "@/lib/financeCategoryStore";
import { localGetAll } from "@/lib/personalTransactionStore";
import type { FinanceSummary, MonthlyBreakdown, CategoryBreakdown } from "@/types/finance";

export interface DateRange {
  from: string;   // YYYY-MM-DD
  to:   string;   // YYYY-MM-DD
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to   = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function lastNMonthsRange(n: number): DateRange {
  const to   = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - (n - 1));
  from.setDate(1);
  const pad = (v: number) => String(v).padStart(2, "0");
  return {
    from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-01`,
    to:   `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  };
}

function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
  return !!url && !url.includes("placeholder");
}

const EMPTY: FinanceSummary = {
  totalIncome: 0, totalExpenses: 0, netBalance: 0,
  transactionCount: 0, monthlyBreakdown: [], categoryBreakdown: [],
};

export function useFinanceSummary(dateRange: DateRange = currentMonthRange()): {
  summary: FinanceSummary;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [summary, setSummary] = useState<FinanceSummary>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const compute = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);

    // Try Supabase first, fall back to portal-scoped localStorage
    let rows: { type: string; amount: number; category: string; date: string }[] = [];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("personal_transactions")
        .select("type, amount, category, date")
        .eq("portal_id", toPortalUUID(portalId)) // portal-shared
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date", { ascending: true });

      if (!error && data && data.length > 0) {
        rows = data;
      }
    }

    if (rows.length === 0) {
      rows = localGetAll(portalId)
        .filter((t) => t.date >= dateRange.from && t.date <= dateRange.to)
        .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    }

    let totalIncome   = 0;
    let totalExpenses = 0;
    const monthMap: Record<string, MonthlyBreakdown> = {};
    const catMap:   Record<string, { amount: number; count: number }> = {};

    for (const row of rows) {
      const amt  = Number(row.amount);
      const d    = new Date(row.date + "T00:00:00");
      const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl  = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      if (!monthMap[key]) monthMap[key] = { month: key, label: lbl, income: 0, expenses: 0, net: 0, count: 0 };
      monthMap[key].count++;

      if (row.type === "income") {
        totalIncome += amt;
        monthMap[key].income += amt;
      } else if (row.type === "expense") {
        totalExpenses += amt;
        monthMap[key].expenses += amt;
        if (!catMap[row.category]) catMap[row.category] = { amount: 0, count: 0 };
        catMap[row.category].amount += amt;
        catMap[row.category].count++;
      }
      monthMap[key].net = monthMap[key].income - monthMap[key].expenses;
    }

    const categoryBreakdown: CategoryBreakdown[] = Object.entries(catMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([category, { amount, count }]) => ({
        category,
        amount,
        count,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        color: Object.fromEntries(getAllCategories(portalId).map((c) => [c.name, c.color]))[category] ?? "#6b7280",
      }));

    setSummary({
      totalIncome,
      totalExpenses,
      netBalance:       totalIncome - totalExpenses,
      transactionCount: rows.length,
      monthlyBreakdown: Object.values(monthMap),
      categoryBreakdown,
    });
    setIsLoading(false);
  }, [user, portalId, dateRange.from, dateRange.to, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { compute(); }, [compute]);

  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);

  return { summary, isLoading };
}
