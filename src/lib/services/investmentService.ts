import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newInvestmentSchema, safeValidate } from "@/lib/validation/schemas";
import type { DbInvestment, NewDbInvestment } from "@/types/database";

const LS_KEY = (portalId: string) => `finance_investments_${portalId}`;

function readLocal(portalId: string): DbInvestment[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY(portalId)) ?? "[]"); }
  catch { return []; }
}
function writeLocal(portalId: string, data: DbInvestment[]): void {
  localStorage.setItem(LS_KEY(portalId), JSON.stringify(data));
}

export async function fetchInvestments(portalId: string): Promise<DbInvestment[]> {
  try {
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("name", { ascending: true });
    if (error) throw error;
    const result = data ?? [];
    writeLocal(portalId, result);
    return result;
  } catch {
    return readLocal(portalId);
  }
}

export async function createInvestment(
  investment: Omit<NewDbInvestment, "portal_id">,
  portalId: string,
): Promise<DbInvestment | null> {
  const validation = safeValidate(newInvestmentSchema, investment);
  if (!validation.success) {
    console.warn("createInvestment validation failed:", validation.errors);
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("investments")
      .insert({ ...investment, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    writeLocal(portalId, [data, ...readLocal(portalId)]);
    return data;
  } catch {
    return null;
  }
}

export async function updateInvestment(
  id: string,
  updates: Partial<DbInvestment>,
  portalId: string,
): Promise<DbInvestment | null> {
  try {
    const { data, error } = await supabase
      .from("investments")
      .update(updates)
      .eq("id", id)
      .eq("portal_id", toPortalUUID(portalId))
      .select()
      .single();
    if (error) throw error;
    writeLocal(portalId, readLocal(portalId).map((i) => (i.id === id ? data : i)));
    return data;
  } catch {
    return null;
  }
}

export async function deleteInvestment(id: string, portalId: string): Promise<boolean> {
  const snapshot = readLocal(portalId);
  writeLocal(portalId, snapshot.filter((i) => i.id !== id));
  try {
    const { error } = await supabase.from("investments").delete().eq("id", id).eq("portal_id", toPortalUUID(portalId));
    if (error) throw error;
    return true;
  } catch {
    writeLocal(portalId, snapshot); // rollback optimistic delete
    return false;
  }
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
