/**
 * vaultFileService — Vault file upload/download/delete via Supabase Storage.
 *
 * Storage bucket : vault-files  (private, 50 MB limit)
 * Storage path   : {portalSlug}/{userId}/{timestamp}_{filename}
 * DB table       : vault_files
 *
 * Supabase only — no localStorage fallback. Storage errors surface to the user.
 */

import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { toast } from "sonner";

const BUCKET = "vault-files";
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VaultFile {
  id: string;
  portal_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function fetchVaultFiles(portalId: string): Promise<VaultFile[]> {
  const { data, error } = await supabase
    .from("vault_files")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchVaultFiles:", error.message);
    toast.error(`Vault files load failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as VaultFile[];
}

export async function uploadVaultFile(
  file: File,
  portalId: string,
  userId: string,
): Promise<VaultFile> {
  if (file.size > MAX_SIZE) throw new Error("File exceeds 50 MB limit");

  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${portalId}/${userId}/${ts}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (upErr) {
    toast.error(`Upload failed: ${upErr.message}`);
    throw upErr;
  }

  const { data, error: dbErr } = await supabase
    .from("vault_files")
    .insert({
      portal_id: toPortalUUID(portalId),
      uploaded_by: userId,
      file_name: file.name,
      file_path: storagePath,
      file_type: file.type || null,
      file_size: file.size,
    })
    .select()
    .single<VaultFile>();

  if (dbErr || !data) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    toast.error(`File metadata not saved: ${dbErr?.message ?? "unknown"}`);
    throw dbErr ?? new Error("Metadata insert failed");
  }
  return data;
}

export async function getFileUrl(vaultFile: VaultFile): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(vaultFile.file_path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteVaultFile(vaultFile: VaultFile): Promise<void> {
  await supabase.storage.from(BUCKET).remove([vaultFile.file_path]);
  const { error } = await supabase
    .from("vault_files")
    .delete()
    .eq("id", vaultFile.id)
    .eq("portal_id", toPortalUUID(vaultFile.portal_id));
  if (error) {
    toast.error(`File metadata not deleted: ${error.message}`);
    throw error;
  }
}

// ── Inventory attachments ─────────────────────────────────────────────────────

const INV_BUCKET = "inventory-files";

export interface InventoryAttachment {
  id: string;
  item_id: string;
  portal_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export async function fetchItemAttachments(
  itemId: string,
  portalId: string,
): Promise<InventoryAttachment[]> {
  const { data, error } = await supabase
    .from("inventory_attachments")
    .select("*")
    .eq("item_id", itemId)
    .eq("portal_id", toPortalUUID(portalId))
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchItemAttachments:", error.message);
    return [];
  }
  return (data ?? []) as InventoryAttachment[];
}

export async function uploadInventoryAttachment(
  file: File,
  itemId: string,
  portalId: string,
  userId: string,
): Promise<InventoryAttachment> {
  if (file.size > MAX_SIZE) throw new Error("File exceeds 50 MB limit");

  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${portalId}/inventory/${itemId}/${ts}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(INV_BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (upErr) {
    toast.error(`Upload failed: ${upErr.message}`);
    throw upErr;
  }

  const { data, error: dbErr } = await supabase
    .from("inventory_attachments")
    .insert({
      item_id: itemId,
      portal_id: toPortalUUID(portalId),
      uploaded_by: userId,
      file_name: file.name,
      file_path: storagePath,
      file_type: file.type || null,
      file_size: file.size,
    })
    .select()
    .single<InventoryAttachment>();

  if (dbErr || !data) {
    await supabase.storage.from(INV_BUCKET).remove([storagePath]);
    toast.error(`Attachment metadata not saved: ${dbErr?.message ?? "unknown"}`);
    throw dbErr ?? new Error("Metadata insert failed");
  }
  return data;
}

export async function getAttachmentUrl(att: InventoryAttachment): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(INV_BUCKET)
    .createSignedUrl(att.file_path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteInventoryAttachment(att: InventoryAttachment): Promise<void> {
  await supabase.storage.from(INV_BUCKET).remove([att.file_path]);
  const { error } = await supabase
    .from("inventory_attachments")
    .delete()
    .eq("id", att.id)
    .eq("portal_id", toPortalUUID(att.portal_id));
  if (error) {
    toast.error(`Attachment metadata not deleted: ${error.message}`);
    throw error;
  }
}

// ── Shared: file type helpers ─────────────────────────────────────────────────

export type PreviewKind = "image" | "pdf" | "video" | "audio" | "text" | "none";

export function getPreviewKind(mimeType: string | null, fileName: string): PreviewKind {
  const mime = mimeType?.toLowerCase() ?? "";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/") || ["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("video/") || ["mp4","webm","mov","avi"].includes(ext)) return "video";
  if (mime.startsWith("audio/") || ["mp3","wav","ogg","flac","aac"].includes(ext)) return "audio";
  if (mime.startsWith("text/") || ["txt","md","json","csv","xml","yaml","yml","log","ts","tsx","js","py"].includes(ext)) return "text";
  return "none";
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
