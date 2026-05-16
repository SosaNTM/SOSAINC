import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newInvestmentSchema, safeValidate } from "@/lib/validation/schemas";
import { toast } from "sonner";
import type { DbInvestment, NewDbInvestment } from "@/types/database";

export async function fetchInvestments(portalId: string): Promise<DbInvestment[]> {
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("name", { ascending: true });
  if (error) {
    console.error("fetchInvestments:", error.message);
    toast.error(`Investments load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function createInvestment(
  investment: Omit<NewDbInvestment, "portal_id">,
  portalId: string,
): Promise<DbInvestment | null> {
  const validation = safeValidate(newInvestmentSchema, investment);
  if (validation.success === false) {
    console.warn("createInvestment validation failed:", validation.errors);
    return null;
  }
  const { data, error } = await supabase
    .from("investments")
    .insert({ ...investment, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    console.error("createInvestment:", error.message);
    toast.error(`Investment not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function updateInvestment(
  id: string,
  updates: Partial<DbInvestment>,
  portalId: string,
): Promise<DbInvestment | null> {
  const { data, error } = await supabase
    .from("investments")
    .update(updates)
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId))
    .select()
    .single();
  if (error) {
    console.error("updateInvestment:", error.message);
    toast.error(`Investment not updated: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteInvestment(id: string, portalId: string): Promise<boolean> {
  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    console.error("deleteInvestment:", error.message);
    toast.error(`Investment not deleted: ${error.message}`);
    return false;
  }
  return true;
}

export function computePortfolioValue(investments: DbInvestment[]): number {
  return investments.reduce((sum, inv) => {
    const price = inv.current_price ?? inv.avg_buy_price;
    return sum + inv.units * price;
  }, 0);
}

export function computeTotalGainLoss(investments: DbInvestment[]): number {
  return investments.reduce((sum, inv) => {
    const current = inv.current_price ?? inv.avg_buy_price;
    return sum + inv.units * (current - inv.avg_buy_price);
  }, 0);
}
