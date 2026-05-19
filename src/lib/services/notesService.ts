import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { toast } from "sonner";
import type { DbNote, DbNoteFolder, NewDbNote, NewDbNoteFolder } from "@/types/database";

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function fetchNoteFolders(portalId: string): Promise<DbNoteFolder[]> {
  const { data, error } = await supabase
    .from("note_folders")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("fetchNoteFolders:", error.message);
    toast.error(`Folders load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function createNoteFolder(
  folder: Omit<NewDbNoteFolder, "portal_id">,
  portalId: string,
): Promise<DbNoteFolder | null> {
  const { data, error } = await supabase
    .from("note_folders")
    .insert({ ...folder, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Folder not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function updateNoteFolder(
  id: string,
  updates: Partial<DbNoteFolder>,
  portalId?: string,
): Promise<DbNoteFolder | null> {
  let query = supabase
    .from("note_folders")
    .update(updates)
    .eq("id", id);
  if (portalId) query = query.eq("portal_id", toPortalUUID(portalId));
  const { data, error } = await query.select().single();
  if (error) {
    toast.error(`Folder not updated: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteNoteFolder(id: string, portalId?: string): Promise<boolean> {
  let query = supabase.from("note_folders").delete().eq("id", id);
  if (portalId) query = query.eq("portal_id", toPortalUUID(portalId));
  const { error } = await query;
  if (error) {
    toast.error(`Folder not deleted: ${error.message}`);
    return false;
  }
  return true;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function fetchNotes(
  portalId: string,
  folderId?: string | null,
): Promise<DbNote[]> {
  let query = supabase
    .from("notes")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .eq("is_archived", false)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(500);

  if (folderId !== undefined) {
    query = folderId === null
      ? query.is("folder_id", null)
      : query.eq("folder_id", folderId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchNotes:", error.message);
    toast.error(`Notes load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function createNote(
  note: Omit<NewDbNote, "portal_id">,
  portalId: string,
): Promise<DbNote | null> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ ...note, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Note not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function updateNote(
  id: string,
  updates: Partial<DbNote>,
  portalId?: string,
): Promise<DbNote | null> {
  let query = supabase
    .from("notes")
    .update(updates)
    .eq("id", id);
  if (portalId) query = query.eq("portal_id", toPortalUUID(portalId));
  const { data, error } = await query.select().single();
  if (error) {
    toast.error(`Note not updated: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteNote(id: string, portalId?: string): Promise<boolean> {
  let query = supabase.from("notes").delete().eq("id", id);
  if (portalId) query = query.eq("portal_id", toPortalUUID(portalId));
  const { error } = await query;
  if (error) {
    toast.error(`Note not deleted: ${error.message}`);
    return false;
  }
  return true;
}
