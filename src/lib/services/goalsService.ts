import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newGoalSchema, safeValidate } from "@/lib/validation/schemas";
import { toast } from "sonner";
import type { DbFinancialGoal, NewDbFinancialGoal } from "@/types/database";

export async function fetchGoals(portalId: string): Promise<DbFinancialGoal[]> {
  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchGoals:", error.message);
    toast.error(`Goals load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function createGoal(
  goal: Omit<NewDbFinancialGoal, "portal_id">,
  portalId: string,
): Promise<DbFinancialGoal | null> {
  const input = { ...goal, deadline: goal.deadline || undefined };
  const validation = safeValidate(newGoalSchema, input);
  if (validation.success === false) {
    console.error("createGoal validation failed:", validation.errors);
    toast.error("Invalid goal data — please check the form");
    return null;
  }

  const { data, error } = await supabase
    .from("financial_goals")
    .insert({ ...validation.data, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    console.error("createGoal:", error.message);
    toast.error(`Goal not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function updateGoal(
  id: string,
  updates: Partial<DbFinancialGoal>,
  portalId: string,
): Promise<DbFinancialGoal | null> {
  const { data, error } = await supabase
    .from("financial_goals")
    .update(updates)
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId))
    .select()
    .single();
  if (error) {
    console.error("updateGoal:", error.message);
    toast.error(`Goal not updated: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteGoal(id: string, portalId: string): Promise<boolean> {
  const { error } = await supabase
    .from("financial_goals")
    .delete()
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    console.error("deleteGoal:", error.message);
    toast.error(`Goal not deleted: ${error.message}`);
    return false;
  }
  return true;
}
