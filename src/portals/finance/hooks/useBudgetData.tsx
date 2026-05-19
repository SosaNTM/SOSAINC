// ── useBudgetData ─────────────────────────────────────────────────────────────
//
// Portal-scoped budget data — Supabase only.
// - Categories come from financeCategoryStore (still in-memory types/defaults)
// - Per-category monthly limits: budget_limits table
// - Total monthly budget: portal_settings.settings.total_budget_eur (JSONB)
// - Spent: aggregated from personal_transactions

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { toPortalUUID } from "@/lib/portalUUID";
import { subscribeToFinanceUpdates } from "@/lib/financeRealtime";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { getAllCategories, getCategoryUpdateEvent } from "@/lib/financeCategoryStore";
import type { PersonalFinanceCategory } from "@/lib/financeCategoryStore";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import type { FinanceCategory as TxCategory } from "@/types/finance";
import {
  fetchBudgetLimits,
  upsertBudgetLimit,
  fetchTotalBudget,
  saveTotalBudget,
} from "@/lib/services/budgetService";
import type { BudgetCategoryDef } from "../components/BudgetCategoryPanel";

export type BudgetLimitMap = Record<string, number>;

export interface BudgetDataResult {
  categories:        BudgetCategoryDef[];
  totalBudget:       number;
  setTotalBudget:    (amount: number) => void;
  updateBudgetLimit: (categoryName: string, limit: number) => void;
}

interface SpentMap { [categoryName: string]: number }

export function useBudgetData(month: number, year: number): BudgetDataResult {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";
  const isBusinessPortal = portalId !== "sosa";

  const yearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

  const [limits, setLimits]                 = useState<BudgetLimitMap>({});
  const [totalBudget, setTotalBudgetState]  = useState<number>(0);
  const [spentMap, setSpentMap]             = useState<SpentMap>({});
  const [tick, setTick]                     = useState(0);
  const [catTick, setCatTick]               = useState(0);

  const { categories: financeCategories } = useFinanceCategories();

  // Load limits + total from Supabase whenever portal/month changes
  useEffect(() => {
    void (async () => {
      const dbLimits = await fetchBudgetLimits(portalId, yearMonth);
      const map: BudgetLimitMap = {};
      for (const b of dbLimits) map[b.category.toLowerCase()] = b.monthly_limit;
      setLimits(map);

      const total = await fetchTotalBudget(portalId);
      setTotalBudgetState(total);
    })();
  }, [portalId, yearMonth]);

  const expenseCategories: PersonalFinanceCategory[] = useMemo(() => {
    void catTick;
    return getAllCategories(portalId)
      .filter((c) => c.type === "expense" && c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [portalId, catTick]);

  const businessBudgetCategories: TxCategory[] = useMemo(() => {
    if (!isBusinessPortal) return [];
    return financeCategories
      .filter((c) => (c.type === "cogs" || c.type === "opex") && c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [isBusinessPortal, financeCategories]);

  useEffect(() => {
    const eventName = getCategoryUpdateEvent(portalId);
    const handler = () => setCatTick((t) => t + 1);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [portalId]);

  // Fetch spent aggregation from Supabase
  useEffect(() => {
    if (!user) return;

    const monthStr = String(month + 1).padStart(2, "0");
    const fromDate = `${year}-${monthStr}-01`;
    const lastDay  = new Date(year, month + 1, 0).getDate();
    const toDate   = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

    supabase
      .from("personal_transactions")
      .select("category, amount")
      .eq("portal_id", toPortalUUID(portalId))
      .eq("type", "expense")
      .gte("date", fromDate)
      .lte("date", toDate)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] | null }) => {
        const rows = data ?? [];
        const map: SpentMap = {};
        for (const cat of expenseCategories) {
          const catName = cat.name.toLowerCase();
          map[catName] = rows
            .filter((row) => (row.category ?? "").toLowerCase() === catName)
            .reduce((s, row) => s + Number(row.amount), 0);
        }
        setSpentMap(map);
      });
  }, [user, portalId, month, year, expenseCategories, tick]);

  useEffect(() => {
    return subscribeToFinanceUpdates(() => setTick((t) => t + 1));
  }, []);

  const categories: BudgetCategoryDef[] = useMemo(() => {
    const fromExpense = expenseCategories.map((cat) => ({
      id:     cat.id,
      name:   cat.name,
      budget: limits[cat.name.toLowerCase()] ?? 0,
      spent:  spentMap[cat.name.toLowerCase()] ?? 0,
      color:  cat.color,
      icon:   <span style={{ fontSize: 16 }}>{cat.icon}</span>,
    }));

    const fromBusiness = businessBudgetCategories
      .filter((bc) => !fromExpense.some((e) => e.name.toLowerCase() === bc.name.toLowerCase()))
      .map((cat) => ({
        id:     cat.id,
        name:   cat.name,
        budget: limits[cat.name.toLowerCase()] ?? 0,
        spent:  spentMap[cat.name.toLowerCase()] ?? 0,
        color:  cat.color,
        icon:   <span style={{ fontSize: 16 }}>{cat.icon}</span>,
      }));

    return [...fromExpense, ...fromBusiness];
  }, [expenseCategories, businessBudgetCategories, limits, spentMap]);

  const updateBudgetLimit = useCallback((categoryName: string, limit: number) => {
    const updated = { ...limits, [categoryName.toLowerCase()]: limit };
    setLimits(updated);
    void upsertBudgetLimit(
      { user_id: null, category: categoryName.toLowerCase(), category_id: null, monthly_limit: limit, year_month: yearMonth, color: null, icon_name: null },
      portalId,
      yearMonth,
    );
  }, [portalId, yearMonth, limits]);

  const setTotalBudget = useCallback((amount: number) => {
    setTotalBudgetState(amount);
    void saveTotalBudget(portalId, amount);
  }, [portalId]);

  return { categories, totalBudget, setTotalBudget, updateBudgetLimit };
}
