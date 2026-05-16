import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newVaultItemSchema, safeValidate } from "@/lib/validation/schemas";
import { toast } from "sonner";
import type { DbVaultItem, NewDbVaultItem } from "@/types/database";
import { encryptVaultData, decryptVaultData } from "@/lib/vaultCrypto";

/**
 * AES-256-GCM encryption applied to encrypted_data on every write and
 * transparently decrypted on every read. Key derived from user_id + portal_id
 * via PBKDF2 (200k iters). See src/lib/vaultCrypto.ts.
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
  const rows = (data ?? []) as DbVaultItem[];
  // Decrypt encrypted_data on each row
  return Promise.all(rows.map(async (r) => ({
    ...r,
    encrypted_data: await decryptVaultData(r.encrypted_data, r.user_id, portalId),
  })));
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
  // Encrypt encrypted_data before insert
  const ciphertext = await encryptVaultData(item.encrypted_data, item.user_id, portalId);
  const { data, error } = await supabase
    .from("vault_items")
    .insert({ ...item, encrypted_data: ciphertext, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Vault item not saved: ${error.message}`);
    return null;
  }
  await logVaultAccess(data.id, "created", portalId);
  // Return with plaintext so caller's UI shows immediately
  return { ...data, encrypted_data: item.encrypted_data };
}

export async function updateVaultItem(
  id: string,
  updates: Partial<DbVaultItem>,
  portalId: string,
): Promise<DbVaultItem | null> {
  // Encrypt updated encrypted_data if present
  const next = { ...updates };
  if (typeof next.encrypted_data === "string" && next.user_id) {
    next.encrypted_data = await encryptVaultData(next.encrypted_data, next.user_id, portalId);
  } else if (typeof next.encrypted_data === "string") {
    // Need user_id — fetch existing row
    const { data: existing } = await supabase
      .from("vault_items").select("user_id").eq("id", id).single();
    if (existing) {
      next.encrypted_data = await encryptVaultData(next.encrypted_data, (existing as DbVaultItem).user_id, portalId);
    }
  }
  const { data, error } = await supabase
    .from("vault_items")
    .update(next)
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId))
    .select()
    .single();
  if (error) {
    toast.error(`Vault item not updated: ${error.message}`);
    return null;
  }
  await logVaultAccess(id, "updated", portalId);
  // Decrypt for return
  if (data) {
    return { ...data, encrypted_data: await decryptVaultData(data.encrypted_data, data.user_id, portalId) };
  }
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
