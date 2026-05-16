import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newVaultItemSchema, safeValidate } from "@/lib/validation/schemas";
import { toast } from "sonner";
import type { DbVaultItem, NewDbVaultItem } from "@/types/database";

/**
 * SECURITY NOTE:
 * encrypted_data must be encrypted client-side before calling createVaultItem/updateVaultItem.
 * Never pass plaintext credentials to this service.
 * Recommended: encrypt with AES-256-GCM using a user-derived key before storing.
 */

export async function fetchVaultItems(
  portalId: string,
  type?: DbVaultItem["type"],
): Promise<DbVaultItem[]> {
  let query = supabase
    .from("vault_items")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("is_favorite", { ascending: false })
    .order("name", { ascending: true })
    .limit(1000);
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) {
    console.error("fetchVaultItems:", error.message);
    toast.error(`Vault load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function createVaultItem(
  item: Omit<NewDbVaultItem, "portal_id">,
  portalId: string,
): Promise<DbVaultItem | null> {
  const validation = safeValidate(newVaultItemSchema, item);
  if (validation.success === false) {
    console.warn("createVaultItem validation failed:", validation.errors);
    return null;
  }
  const { data, error } = await supabase
    .from("vault_items")
    .insert({ ...item, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Vault item not saved: ${error.message}`);
    return null;
  }
  await logVaultAccess(data.id, "created", portalId);
  return data;
}

export async function updateVaultItem(
  id: string,
  updates: Partial<DbVaultItem>,
  portalId: string,
): Promise<DbVaultItem | null> {
  const { data, error } = await supabase
    .from("vault_items")
    .update(updates)
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId))
    .select()
    .single();
  if (error) {
    toast.error(`Vault item not updated: ${error.message}`);
    return null;
  }
  await logVaultAccess(id, "updated", portalId);
  return data;
}

export async function deleteVaultItem(id: string, portalId: string): Promise<boolean> {
  const { error } = await supabase
    .from("vault_items")
    .delete()
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    toast.error(`Vault item not deleted: ${error.message}`);
    return false;
  }
  await logVaultAccess(id, "deleted", portalId);
  return true;
}

export async function recordVaultAccess(id: string, portalId: string): Promise<void> {
  const { error } = await supabase
    .from("vault_items")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (!error) await logVaultAccess(id, "accessed", portalId);
}

async function logVaultAccess(
  itemId: string,
  action: "created" | "updated" | "accessed" | "deleted" | "restored" | "shared",
  portalId: string,
): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return;
  await supabase.from("vault_item_history").insert({
    item_id: itemId,
    user_id: data.user.id,
    portal_id: toPortalUUID(portalId),
    action,
  });
}
