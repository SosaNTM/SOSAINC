import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { DbBudgetLimit, NewDbBudgetLimit } from "@/types/database";

export type BudgetLimitMap = Record<string, number>;

const LS_LIMITS = (portalId: string) => `finance_budget_limits_${portalId}`;
const LS_TOTAL = (portalId: string) => `finance_total_budget_${portalId}`;

// ─── Local helpers ────────────────────────────────────────────────────────────

export function loadBudgetLimitsLocal(portalId: string): BudgetLimitMap {
  try {
    return JSON.parse(localStorage.getItem(LS_LIMITS(portalId)) ?? "{}");
  } catch {
    return {};
  }
}

export function saveBudgetLimitsLocal(portalId: string, limits: BudgetLimitMap): void {
  localStorage.setItem(LS_LIMITS(portalId), JSON.stringify(limits));
}

export function loadTotalBudgetLocal(portalId: string): number {
  return Number(localStorage.getItem(LS_TOTAL(portalId)) ?? 0);
}

export function saveTotalBudgetLocal(portalId: string, amount: number): void {
  localStorage.setItem(LS_TOTAL(portalId), String(amount));
}

// ─── Supabase-backed service ──────────────────────────────────────────────────

export async function fetchBudgetLimits(portalId: string): Promise<DbBudgetLimit[]> {
  try {
    const { data, error } = await supabase
      .from("budget_limits")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("category", { ascending: true });
    if (error) throw error;
    const result = data ?? [];
    // Sync to localStorage for offline use
    const map: BudgetLimitMap = {};
    result.forEach((b) => { map[b.category] = b.monthly_limit; });
    saveBudgetLimitsLocal(portalId, map);
    return result;
  } catch {
    return [];
  }
}

export async function upsertBudgetLimit(
  limit: Omit<NewDbBudgetLimit, "portal_id">,
  portalId: string,
): Promise<DbBudgetLimit | null> {
  // Optimistic local write (immutable update)
  saveBudgetLimitsLocal(portalId, { ...loadBudgetLimitsLocal(portalId), [limit.category]: limit.monthly_limit });

  try {
    const { data, error } = await supabase
      .from("budget_limits")
      .upsert({ ...limit, portal_id: toPortalUUID(portalId) }, { onConflict: "portal_id,category" })
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
