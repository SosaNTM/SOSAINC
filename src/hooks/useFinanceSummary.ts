// ── useFinanceSummary ─────────────────────────────────────────────────────────
//
// Portal-scoped: aggregates personal_transactions for the active portal.
// Supabase only — no localStorage cache.

import { useState, useEffect, useCallback } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { subscribeToFinanceUpdates } from "@/lib/financeRealtime";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { usePortalDB } from "@/lib/portalContextDB";
import { getAllCategories } from "@/lib/financeCategoryStore";
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

export function lastNDaysRange(n: number): DateRange {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (n - 1));
  const pad = (v: number) => String(v).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: fmt(from), to: fmt(to) };
}

export function lastMonthRange(): DateRange {
  const now   = new Date();
  const y     = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m     = now.getMonth() === 0 ? 12 : now.getMonth();
  const last  = new Date(y, m, 0).getDate();
  const pad   = (v: number) => String(v).padStart(2, "0");
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}

export function lastYearRange(): DateRange {
  const y = new Date().getFullYear() - 1;
  return { from: `${y}-01-01`, to: `${y}-12-31` };
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
  const { currentPortalId } = usePortalDB();
  const portalId = portal?.id ?? "sosa";

  const [summary, setSummary] = useState<FinanceSummary>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const compute = useCallback(async () => {
    if (!user || !currentPortalId) { setIsLoading(false); return; }

    const { data, error } = await supabase
      .from("personal_transactions")
      .select("type, amount, category, date")
      .eq("portal_id", currentPortalId)
      .gte("date", dateRange.from)
      .lte("date", dateRange.to)
      .order("date", { ascending: true });

    const rows: { type: string; amount: number; category: string; date: string }[] =
      !error && data ? data : [];

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

    const categoryColors = Object.fromEntries(getAllCategories(portalId).map((c) => [c.name, c.color]));
    const categoryBreakdown: CategoryBreakdown[] = Object.entries(catMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([category, { amount, count }]) => ({
        category,
        amount,
        count,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        color: categoryColors[category] ?? "#6b7280",
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
  }, [user, portalId, currentPortalId, dateRange.from, dateRange.to, tick]);

  useEffect(() => { compute(); }, [compute]);

  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);

  return { summary, isLoading };
}
