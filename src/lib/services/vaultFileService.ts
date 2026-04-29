/**
 * vaultFileService — Vault file upload/download/delete via Supabase Storage.
 *
 * Storage bucket : vault-files  (private, 50 MB limit)
 * Storage path   : {portalSlug}/{userId}/{timestamp}_{filename}
 * DB table       : vault_files  (portal_id TEXT = slug)
 *
 * Fallback: if Supabase is unreachable the service stores a base64 data-URL
 * in localStorage so the UI keeps working in dev/offline.
 */

import { supabase } from "@/lib/supabase";

const BUCKET = "vault-files";
const LS_KEY = (portalId: string) => `SOSA INC_vault_files_${portalId}`;
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VaultFile {
  id: string;
  portal_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;     // storage path OR "local:{base64url}" for offline items
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function readLocal(portalId: string): VaultFile[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY(portalId)) ?? "[]"); }
  catch { return []; }
}

function writeLocal(portalId: string, files: VaultFile[]): void {
  localStorage.setItem(LS_KEY(portalId), JSON.stringify(files));
}

function localAdd(portalId: string, file: VaultFile): void {
  writeLocal(portalId, [file, ...readLocal(portalId)]);
}

function localRemove(portalId: string, id: string): void {
  writeLocal(portalId, readLocal(portalId).filter((f) => f.id !== id));
}

// ── API ───────────────────────────────────────────────────────────────────────

/** Fetch all vault files for a portal, newest first. */
export async function fetchVaultFiles(portalId: string): Promise<VaultFile[]> {
  try {
    const { data, error } = await supabase
      .from("vault_files")
      .select("*")
      .eq("portal_id", portalId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as VaultFile[];
    writeLocal(portalId, rows); // keep local cache in sync
    return rows;
  } catch {
    return readLocal(portalId);
  }
}

/**
 * Upload a file to Supabase Storage and insert a metadata row.
 * Falls back to a base64 local record if Storage/DB is unreachable.
 */
export async function uploadVaultFile(
  file: File,
  portalId: string,
  userId: string,
): Promise<VaultFile> {
  if (file.size > MAX_SIZE) throw new Error("File exceeds 50 MB limit");

  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${portalId}/${userId}/${ts}_${safeName}`;

  // ── Try Supabase Storage ──────────────────────────────────────────────────
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (!upErr) {
    const { data, error: dbErr } = await supabase
      .from("vault_files")
      .insert({
        portal_id: portalId,
        uploaded_by: userId,
        file_name: file.name,
        file_path: storagePath,
        file_type: file.type || null,
        file_size: file.size,
      })
      .select()
      .single<VaultFile>();

    if (!dbErr && data) {
      localAdd(portalId, data);
      return data;
    }
    // DB insert failed — clean up the orphaned storage object
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  // ── Local fallback: store as base64 data-URL ──────────────────────────────
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const fallback: VaultFile = {
    id: `local_${ts}`,
    portal_id: portalId,
    uploaded_by: userId,
    file_name: file.name,
    file_path: `local:${base64}`,
    file_type: file.type || null,
    file_size: file.size,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localAdd(portalId, fallback);
  return fallback;
}

/**
 * Returns a URL that can be used to display or download a file.
 * - Remote: a 1-hour signed URL from Supabase Storage
 * - Local:  the embedded data-URL
 */
export async function getFileUrl(vaultFile: VaultFile): Promise<string | null> {
  if (vaultFile.file_path.startsWith("local:")) {
    return vaultFile.file_path.slice(6); // strip "local:" prefix
  }
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(vaultFile.file_path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Delete a vault file from Storage + DB + local cache. */
export async function deleteVaultFile(vaultFile: VaultFile): Promise<void> {
  localRemove(vaultFile.portal_id, vaultFile.id);
  if (!vaultFile.file_path.startsWith("local:")) {
    await supabase.storage.from(BUCKET).remove([vaultFile.file_path]);
  }
  await supabase.from("vault_files").delete().eq("id", vaultFile.id);
}

// ── Inventory attachments (reuses same storage bucket logic) ──────────────────

const INV_BUCKET = "inventory-files";
const INV_LS_KEY = (portalId: string) => `SOSA INC_inv_attachments_${portalId}`;

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

function readLocalAttachments(portalId: string): InventoryAttachment[] {
  try { return JSON.parse(localStorage.getItem(INV_LS_KEY(portalId)) ?? "[]"); }
  catch { return []; }
}

function writeLocalAttachments(portalId: string, atts: InventoryAttachment[]): void {
  localStorage.setItem(INV_LS_KEY(portalId), JSON.stringify(atts));
}

export async function fetchItemAttachments(
  itemId: string,
  portalId: string,
): Promise<InventoryAttachment[]> {
  try {
    const { data, error } = await supabase
      .from("inventory_attachments")
      .select("*")
      .eq("item_id", itemId)
      .eq("portal_id", portalId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as InventoryAttachment[];
  } catch {
    return readLocalAttachments(portalId).filter((a) => a.item_id === itemId);
  }
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

  if (!upErr) {
    const { data, error: dbErr } = await supabase
      .from("inventory_attachments")
      .insert({
        item_id: itemId,
        portal_id: portalId,
        uploaded_by: userId,
        file_name: file.name,
        file_path: storagePath,
        file_type: file.type || null,
        file_size: file.size,
      })
      .select()
      .single<InventoryAttachment>();

    if (!dbErr && data) {
      const all = readLocalAttachments(portalId);
      writeLocalAttachments(portalId, [data, ...all]);
      return data;
    }
    await supabase.storage.from(INV_BUCKET).remove([storagePath]);
  }

  // Local fallback
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const fallback: InventoryAttachment = {
    id: `local_${ts}`,
    item_id: itemId,
    portal_id: portalId,
    uploaded_by: userId,
    file_name: file.name,
    file_path: `local:${base64}`,
    file_type: file.type || null,
    file_size: file.size,
    created_at: new Date().toISOString(),
  };
  const all = readLocalAttachments(portalId);
  writeLocalAttachments(portalId, [fallback, ...all]);
  return fallback;
}

export async function getAttachmentUrl(att: InventoryAttachment): Promise<string | null> {
  if (att.file_path.startsWith("local:")) return att.file_path.slice(6);
  const { data, error } = await supabase.storage
    .from(INV_BUCKET)
    .createSignedUrl(att.file_path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteInventoryAttachment(att: InventoryAttachment): Promise<void> {
  const all = readLocalAttachments(att.portal_id);
  writeLocalAttachments(att.portal_id, all.filter((a) => a.id !== att.id));
  if (!att.file_path.startsWith("local:")) {
    await supabase.storage.from(INV_BUCKET).remove([att.file_path]);
  }
  await supabase.from("inventory_attachments").delete().eq("id", att.id);
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
