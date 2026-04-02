import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newVaultItemSchema, safeValidate } from "@/lib/validation/schemas";
import type { DbVaultItem, NewDbVaultItem } from "@/types/database";

/**
 * SECURITY NOTE:
 * encrypted_data must be encrypted client-side before calling createVaultItem/updateVaultItem.
 * Never pass plaintext credentials to this service.
 * Recommended: encrypt with AES-256-GCM using a user-derived key before storing.
 */

const LS_KEY = (portalId: string) => `iconoff_vault_items_${portalId}`;

function readLocal(portalId: string): DbVaultItem[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY(portalId)) ?? "[]"); }
  catch { return []; }
}
function writeLocal(portalId: string, data: DbVaultItem[]): void {
  localStorage.setItem(LS_KEY(portalId), JSON.stringify(data));
}

export async function fetchVaultItems(
  portalId: string,
  type?: DbVaultItem["type"],
): Promise<DbVaultItem[]> {
  try {
    let query = supabase
      .from("vault_items")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("is_favorite", { ascending: false })
      .order("name", { ascending: true })
      .limit(1000);
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) throw error;
    const result = data ?? [];
    writeLocal(portalId, result);
    return result;
  } catch {
    return readLocal(portalId);
  }
}

export async function createVaultItem(
  item: Omit<NewDbVaultItem, "portal_id">,
  portalId: string,
): Promise<DbVaultItem | null> {
  const validation = safeValidate(newVaultItemSchema, item);
  if (!validation.success) {
    console.warn("createVaultItem validation failed:", validation.errors);
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("vault_items")
      .insert({ ...item, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    writeLocal(portalId, [data, ...readLocal(portalId)]);
    // Log access
    await logVaultAccess(data.id, "created", portalId);
    return data;
  } catch {
    return null;
  }
}

export async function updateVaultItem(
  id: string,
  updates: Partial<DbVaultItem>,
  portalId: string,
): Promise<DbVaultItem | null> {
  try {
    const { data, error } = await supabase
      .from("vault_items")
      .update(updates)
      .eq("id", id)
      .eq("portal_id", toPortalUUID(portalId))
      .select()
      .single();
    if (error) throw error;
    writeLocal(portalId, readLocal(portalId).map((v) => (v.id === id ? data : v)));
    await logVaultAccess(id, "updated", portalId);
    return data;
  } catch {
    return null;
  }
}

export async function deleteVaultItem(id: string, portalId: string): Promise<boolean> {
  const snapshot = readLocal(portalId);
  writeLocal(portalId, snapshot.filter((v) => v.id !== id));
  try {
    const { error } = await supabase.from("vault_items").delete().eq("id", id).eq("portal_id", toPortalUUID(portalId));
    if (error) throw error;
    await logVaultAccess(id, "deleted", portalId); // log only after success
    return true;
  } catch {
    writeLocal(portalId, snapshot); // rollback optimistic delete
    return false;
  }
}

export async function recordVaultAccess(id: string, portalId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("vault_items")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) await logVaultAccess(id, "accessed", portalId);
  } catch {
    // non-critical — never throw
  }
}

async function logVaultAccess(
  itemId: string,
  action: "created" | "updated" | "accessed" | "deleted" | "restored" | "shared",
  portalId: string,
): Promise<void> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return;
    await supabase.from("vault_item_history").insert({
      item_id: itemId,
      user_id: data.user.id,
      portal_id: toPortalUUID(portalId),
      action,
    });
  } catch {
    // non-critical — never throw
  }
}
