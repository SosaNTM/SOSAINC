// ── useBudgetData ─────────────────────────────────────────────────────────────
//
// Portal-scoped: reads categories and budget limits for the active portal.
// - Derives category list from financeCategoryStore (expense categories only)
// - Stores per-category budget limits in portal-scoped localStorage
// - Computes `spent` from portal-scoped personal_transactions
// - Subscribes to finance-updates + category-update events to stay in sync

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { subscribeToFinanceUpdates } from "@/lib/financeRealtime";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { localGetAll } from "@/lib/personalTransactionStore";
import { getAllCategories, getCategoryUpdateEvent } from "@/lib/financeCategoryStore";
import type { FinanceCategory } from "@/lib/financeCategoryStore";
import { loadBudgetLimits, saveBudgetLimits, loadTotalBudget, saveTotalBudget } from "../services/budgetStorage";
import type { BudgetLimitMap } from "../services/budgetStorage";
import type { BudgetCategoryDef } from "../components/BudgetCategoryPanel";

export interface BudgetDataResult {
  categories:        BudgetCategoryDef[];
  totalBudget:       number;
  setTotalBudget:    (amount: number) => void;
  updateBudgetLimit: (categoryName: string, limit: number) => void;
}

interface SpentMap { [categoryName: string]: number }

function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
  return !!url && !url.includes("placeholder");
}

export function useBudgetData(month: number, year: number): BudgetDataResult {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [limits, setLimits]                 = useState<BudgetLimitMap>(() => loadBudgetLimits(portalId));
  const [totalBudget, setTotalBudgetState]  = useState<number>(() => loadTotalBudget(portalId));
  const [spentMap, setSpentMap]             = useState<SpentMap>({});
  const [tick, setTick]                     = useState(0);
  const [catTick, setCatTick]               = useState(0);

  // Reload limits and total when portal changes
  useEffect(() => {
    setLimits(loadBudgetLimits(portalId));
    setTotalBudgetState(loadTotalBudget(portalId));
  }, [portalId]);

  // Active expense categories from the unified category store
  const expenseCategories: FinanceCategory[] = useMemo(() => {
    void catTick;
    return getAllCategories(portalId)
      .filter((c) => c.type === "expense" && c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [portalId, catTick]);

  // Subscribe to portal-scoped category-update events
  useEffect(() => {
    const eventName = getCategoryUpdateEvent(portalId);
    const handler = () => setCatTick((t) => t + 1);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [portalId]);

  // Fetch aggregated spending for the given month
  useEffect(() => {
    if (!user) return;

    const monthStr = String(month + 1).padStart(2, "0");
    const fromDate = `${year}-${monthStr}-01`;
    const lastDay  = new Date(year, month + 1, 0).getDate();
    const toDate   = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

    const computeSpent = (rows: { category: string; amount: number }[]) => {
      const map: SpentMap = {};
      for (const cat of expenseCategories) {
        const catName = cat.name.toLowerCase();
        const total = rows
          .filter((row) => (row.category ?? "").toLowerCase() === catName)
          .reduce((s, row) => s + Number(row.amount), 0);
        map[catName] = total;
      }
      setSpentMap(map);
    };

    if (isSupabaseConfigured()) {
      supabase
        .from("personal_transactions")
        .select("category, amount")
        .eq("user_id", user.id)
        .eq("portal_id", portalId)
        .eq("type", "expense")
        .gte("date", fromDate)
        .lte("date", toDate)
        .then(({ data }: { data: any[] | null }) => {
          if (data && data.length > 0) {
            computeSpent(data);
          } else {
            const local = localGetAll(portalId)
              .filter((t) => t.user_id === user.id && t.type === "expense" && t.date >= fromDate && t.date <= toDate);
            computeSpent(local);
          }
        });
    } else {
      const local = localGetAll(portalId)
        .filter((t) => t.user_id === user.id && t.type === "expense" && t.date >= fromDate && t.date <= toDate);
      computeSpent(local);
    }
  }, [user, portalId, month, year, expenseCategories, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when any transaction changes
  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);

  // Build final categories: financeCategoryStore metadata + budget limits + spent
  const categories: BudgetCategoryDef[] = useMemo(() => {
    return expenseCategories.map((cat) => ({
      id:     cat.id,
      name:   cat.name,
      budget: limits[cat.name.toLowerCase()] ?? 0,
      spent:  spentMap[cat.name.toLowerCase()] ?? 0,
      color:  cat.color,
      icon:   <span style={{ fontSize: 16 }}>{cat.icon}</span>,
    }));
  }, [expenseCategories, limits, spentMap]);

  const updateBudgetLimit = useCallback((categoryName: string, limit: number) => {
    const updated = { ...limits, [categoryName.toLowerCase()]: limit };
    saveBudgetLimits(portalId, updated);
    setLimits(updated);
  }, [portalId, limits]);

  const setTotalBudget = useCallback((amount: number) => {
    saveTotalBudget(portalId, amount);
    setTotalBudgetState(amount);
  }, [portalId]);

  return { categories, totalBudget, setTotalBudget, updateBudgetLimit };
}
