import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { DbBudgetLimit, NewDbBudgetLimit } from "@/types/database";

export type BudgetLimitMap = Record<string, number>;

const LS_LIMITS = (portalId: string, yearMonth: string) => `finance_budget_limits_${portalId}_${yearMonth}`;
const LS_LIMITS_LEGACY = (portalId: string) => `finance_budget_limits_${portalId}`;
const LS_TOTAL = (portalId: string) => `finance_total_budget_${portalId}`;

// ─── Local helpers ────────────────────────────────────────────────────────────

export function loadBudgetLimitsLocal(portalId: string, yearMonth: string): BudgetLimitMap {
  try {
    const scoped = localStorage.getItem(LS_LIMITS(portalId, yearMonth));
    if (scoped) return JSON.parse(scoped) as BudgetLimitMap;
    // Fallback to legacy unscoped key (existing users)
    const legacy = localStorage.getItem(LS_LIMITS_LEGACY(portalId));
    if (legacy) return JSON.parse(legacy) as BudgetLimitMap;
  } catch { /* ignore */ }
  return {};
}

export function saveBudgetLimitsLocal(portalId: string, yearMonth: string, limits: BudgetLimitMap): void {
  localStorage.setItem(LS_LIMITS(portalId, yearMonth), JSON.stringify(limits));
}

export function loadTotalBudgetLocal(portalId: string): number {
  return Number(localStorage.getItem(LS_TOTAL(portalId)) ?? 0);
}

export function saveTotalBudgetLocal(portalId: string, amount: number): void {
  localStorage.setItem(LS_TOTAL(portalId), String(amount));
}

// ─── Supabase-backed service ──────────────────────────────────────────────────

export async function fetchBudgetLimits(portalId: string, yearMonth: string): Promise<DbBudgetLimit[]> {
  try {
    const { data, error } = await supabase
      .from("budget_limits")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .eq("year_month", yearMonth)
      .order("category", { ascending: true });
    if (error) throw error;
    const result = data ?? [];
    // Sync to localStorage for offline use
    const map: BudgetLimitMap = {};
    result.forEach((b: DbBudgetLimit) => { map[b.category] = b.monthly_limit; });
    saveBudgetLimitsLocal(portalId, yearMonth, map);
    return result;
  } catch {
    return [];
  }
}

export async function upsertBudgetLimit(
  limit: Omit<NewDbBudgetLimit, "portal_id">,
  portalId: string,
  yearMonth: string,
): Promise<DbBudgetLimit | null> {
  // Optimistic local write
  saveBudgetLimitsLocal(portalId, yearMonth, {
    ...loadBudgetLimitsLocal(portalId, yearMonth),
    [limit.category]: limit.monthly_limit,
  });

  try {
    const { data, error } = await supabase
      .from("budget_limits")
      .upsert(
        { ...limit, portal_id: toPortalUUID(portalId), year_month: yearMonth },
        { onConflict: "portal_id,category,year_month" },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deleteBudgetLimit(id: string, portalId?: string): Promise<boolean> {
  try {
    let q = supabase.from("budget_limits").delete().eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { error } = await q;
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
