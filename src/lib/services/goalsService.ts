import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newGoalSchema, safeValidate } from "@/lib/validation/schemas";
import type { DbFinancialGoal, NewDbFinancialGoal } from "@/types/database";

const LS_KEY = (portalId: string) => `finance_goals_${portalId}`;

function readLocal(portalId: string): DbFinancialGoal[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY(portalId)) ?? "[]"); }
  catch { return []; }
}
function writeLocal(portalId: string, data: DbFinancialGoal[]): void {
  localStorage.setItem(LS_KEY(portalId), JSON.stringify(data));
}

export async function fetchGoals(portalId: string): Promise<DbFinancialGoal[]> {
  try {
    const { data, error } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("created_at", { ascending: false });
    if (error) throw error;
    const result = data ?? [];
    writeLocal(portalId, result);
    return result;
  } catch {
    return readLocal(portalId);
  }
}

export async function createGoal(
  goal: Omit<NewDbFinancialGoal, "portal_id">,
  portalId: string,
): Promise<DbFinancialGoal | null> {
  const validation = safeValidate(newGoalSchema, goal);
  if (!validation.success) {
    console.warn("createGoal validation failed:", validation.errors);
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("financial_goals")
      .insert({ ...goal, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    const local = readLocal(portalId);
    writeLocal(portalId, [data, ...local]);
    return data;
  } catch {
    return null;
  }
}

export async function updateGoal(
  id: string,
  updates: Partial<DbFinancialGoal>,
  portalId: string,
): Promise<DbFinancialGoal | null> {
  try {
    const { data, error } = await supabase
      .from("financial_goals")
      .update(updates)
      .eq("id", id)
      .eq("portal_id", toPortalUUID(portalId))
      .select()
      .single();
    if (error) throw error;
    writeLocal(portalId, readLocal(portalId).map((g) => (g.id === id ? data : g)));
    return data;
  } catch {
    return null;
  }
}

export async function deleteGoal(id: string, portalId: string): Promise<boolean> {
  const snapshot = readLocal(portalId);
  writeLocal(portalId, snapshot.filter((g) => g.id !== id));
  try {
    const { error } = await supabase.from("financial_goals").delete().eq("id", id).eq("portal_id", toPortalUUID(portalId));
    if (error) throw error;
    return true;
  } catch {
    writeLocal(portalId, snapshot); // rollback optimistic delete
    return false;
  }
}

export async function addToGoal(
  id: string,
  amount: number,
  portalId: string,
): Promise<DbFinancialGoal | null> {
  // Fetch just the one goal — avoid loading all goals
  try {
    const { data, error } = await supabase
      .from("financial_goals")
      .select("saved, target")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    const newSaved = Math.min(data.saved + amount, data.target);
    return updateGoal(id, { saved: newSaved, is_achieved: newSaved >= data.target }, portalId);
  } catch {
    return null;
  }
}
