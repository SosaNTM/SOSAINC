import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { toast } from "sonner";
import type { DbBudgetLimit, NewDbBudgetLimit } from "@/types/database";

export type BudgetLimitMap = Record<string, number>;

export async function fetchBudgetLimits(portalId: string, yearMonth: string): Promise<DbBudgetLimit[]> {
  const { data, error } = await supabase
    .from("budget_limits")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .eq("year_month", yearMonth)
    .order("category", { ascending: true });
  if (error) {
    console.error("fetchBudgetLimits:", error.message);
    toast.error(`Budget load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function upsertBudgetLimit(
  limit: Omit<NewDbBudgetLimit, "portal_id">,
  portalId: string,
  yearMonth: string,
): Promise<DbBudgetLimit | null> {
  const { data, error } = await supabase
    .from("budget_limits")
    .upsert(
      { ...limit, portal_id: toPortalUUID(portalId), year_month: yearMonth },
      { onConflict: "portal_id,category,year_month" },
    )
    .select()
    .single();
  if (error) {
    console.error("upsertBudgetLimit:", error.message);
    toast.error(`Budget not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteBudgetLimit(id: string, portalId?: string): Promise<boolean> {
  let q = supabase.from("budget_limits").delete().eq("id", id);
  if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
  const { error } = await q;
  if (error) {
    console.error("deleteBudgetLimit:", error.message);
    toast.error(`Budget not deleted: ${error.message}`);
    return false;
  }
  return true;
}
