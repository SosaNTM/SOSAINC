import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newGoalSchema, safeValidate } from "@/lib/validation/schemas";
import { toast } from "sonner";
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
    const remote = data ?? [];
    // Merge remote goals with any locally-persisted goals not yet synced to Supabase.
    const local = readLocal(portalId);
    const remoteIds = new Set(remote.map((g) => g.id));
    const localOnly = local.filter((g) => !remoteIds.has(g.id));
    const merged = [...remote, ...localOnly].sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );
    writeLocal(portalId, merged);
    return merged;
  } catch {
    return readLocal(portalId);
  }
}

export async function createGoal(
  goal: Omit<NewDbFinancialGoal, "portal_id">,
  portalId: string,
): Promise<DbFinancialGoal | null> {
  // Normalize empty deadline to undefined so the schema's .optional() applies correctly
  const input = { ...goal, deadline: goal.deadline || undefined };
  const validation = safeValidate(newGoalSchema, input);
  if (!validation.success) {
    console.error("createGoal validation failed:", validation.errors);
    toast.error("Invalid goal data — please check the form");
    return null;
  }

  // Use validation.data so Zod defaults (saved:0, is_achieved:false) are applied
  const payload = validation.data;

  try {
    const { data, error } = await supabase
      .from("financial_goals")
      .insert({ ...payload, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    const local = readLocal(portalId);
    writeLocal(portalId, [data, ...local]);
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("createGoal DB error:", msg);
    toast.error(`Goal not saved to database: ${msg}`);

    // Offline fallback — keeps the UI responsive but surfaces the error
    const offlineGoal: DbFinancialGoal = {
      id: crypto.randomUUID(),
      portal_id: toPortalUUID(portalId),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_achieved: false,
      saved: 0,
      deadline: null,
      category: null,
      color: "#6b7280",
      emoji: "🎯",
      ...payload,
    } as DbFinancialGoal;
    const local = readLocal(portalId);
    writeLocal(portalId, [offlineGoal, ...local]);
    return offlineGoal;
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("updateGoal DB error:", msg);
    toast.error(`Goal not updated: ${msg}`);
    return null;
  }
}

export async function deleteGoal(id: string, portalId: string): Promise<boolean> {
  const snapshot = readLocal(portalId);
  writeLocal(portalId, snapshot.filter((g) => g.id !== id));
  try {
    const { error } = await supabase
      .from("financial_goals")
      .delete()
      .eq("id", id)
      .eq("portal_id", toPortalUUID(portalId));
    if (error) throw error;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("deleteGoal DB error:", msg);
    toast.error(`Goal not deleted: ${msg}`);
    writeLocal(portalId, snapshot); // rollback optimistic delete
    return false;
  }
}
