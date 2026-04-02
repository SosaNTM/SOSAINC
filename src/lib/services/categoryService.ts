import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { DbFinanceCategory, NewDbFinanceCategory } from "@/types/database";

const LS_KEY = (portalId: string) => `finance_categories_${portalId}`;

function readLocal(portalId: string): DbFinanceCategory[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY(portalId)) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal(portalId: string, data: DbFinanceCategory[]): void {
  localStorage.setItem(LS_KEY(portalId), JSON.stringify(data));
}

export async function fetchCategories(portalId: string): Promise<DbFinanceCategory[]> {
  try {
    const { data, error } = await supabase
      .from("finance_transaction_categories")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const result = data ?? [];
    writeLocal(portalId, result);
    return result;
  } catch {
    return readLocal(portalId);
  }
}

export async function createCategory(
  category: Omit<NewDbFinanceCategory, "portal_id">,
  portalId: string,
): Promise<DbFinanceCategory | null> {
  try {
    const { data, error } = await supabase
      .from("finance_transaction_categories")
      .insert({ ...category, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<DbFinanceCategory, "id" | "portal_id" | "created_at" | "updated_at">>,
  portalId?: string,
): Promise<DbFinanceCategory | null> {
  try {
    let q = supabase.from("finance_transaction_categories").update(updates).eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { data, error } = await q.select().single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deleteCategory(id: string, portalId?: string): Promise<boolean> {
  try {
    let q = supabase.from("finance_transaction_categories").update({ is_active: false }).eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { error } = await q;
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
