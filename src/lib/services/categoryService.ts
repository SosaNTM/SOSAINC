import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { toast } from "sonner";
import type { DbFinanceCategory, NewDbFinanceCategory } from "@/types/database";

export async function fetchCategories(portalId: string): Promise<DbFinanceCategory[]> {
  const { data, error } = await supabase
    .from("finance_transaction_categories")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("fetchCategories:", error.message);
    toast.error(`Categories load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function createCategory(
  category: Omit<NewDbFinanceCategory, "portal_id">,
  portalId: string,
): Promise<DbFinanceCategory | null> {
  const { data, error } = await supabase
    .from("finance_transaction_categories")
    .insert({ ...category, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    console.error("createCategory:", error.message);
    toast.error(`Category not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<DbFinanceCategory, "id" | "portal_id" | "created_at" | "updated_at">>,
  portalId?: string,
): Promise<DbFinanceCategory | null> {
  let q = supabase.from("finance_transaction_categories").update(updates).eq("id", id);
  if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
  const { data, error } = await q.select().single();
  if (error) {
    console.error("updateCategory:", error.message);
    toast.error(`Category not updated: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteCategory(id: string, portalId?: string): Promise<boolean> {
  let q = supabase.from("finance_transaction_categories").update({ is_active: false }).eq("id", id);
  if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
  const { error } = await q;
  if (error) {
    console.error("deleteCategory:", error.message);
    toast.error(`Category not deleted: ${error.message}`);
    return false;
  }
  return true;
}
