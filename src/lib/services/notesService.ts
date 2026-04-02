import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { DbNote, DbNoteFolder, NewDbNote, NewDbNoteFolder } from "@/types/database";

const LS_NOTES = (portalId: string) => `iconoff_notes_${portalId}`;
const LS_FOLDERS = (portalId: string) => `iconoff_note_folders_${portalId}`;

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function fetchNoteFolders(portalId: string): Promise<DbNoteFolder[]> {
  try {
    const { data, error } = await supabase
      .from("note_folders")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const result = data ?? [];
    localStorage.setItem(LS_FOLDERS(portalId), JSON.stringify(result));
    return result;
  } catch {
    try { return JSON.parse(localStorage.getItem(LS_FOLDERS(portalId)) ?? "[]"); }
    catch { return []; }
  }
}

export async function createNoteFolder(
  folder: Omit<NewDbNoteFolder, "portal_id">,
  portalId: string,
): Promise<DbNoteFolder | null> {
  try {
    const { data, error } = await supabase
      .from("note_folders")
      .insert({ ...folder, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function updateNoteFolder(
  id: string,
  updates: Partial<DbNoteFolder>,
): Promise<DbNoteFolder | null> {
  try {
    const { data, error } = await supabase
      .from("note_folders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deleteNoteFolder(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("note_folders").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function fetchNotes(
  portalId: string,
  folderId?: string | null,
): Promise<DbNote[]> {
  try {
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
    if (error) throw error;
    const result = data ?? [];
    localStorage.setItem(LS_NOTES(portalId), JSON.stringify(result));
    return result;
  } catch {
    try {
      const all: DbNote[] = JSON.parse(localStorage.getItem(LS_NOTES(portalId)) ?? "[]");
      return folderId !== undefined
        ? all.filter((n) => n.folder_id === folderId)
        : all;
    } catch {
      return [];
    }
  }
}

export async function createNote(
  note: Omit<NewDbNote, "portal_id">,
  portalId: string,
): Promise<DbNote | null> {
  try {
    const { data, error } = await supabase
      .from("notes")
      .insert({ ...note, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function updateNote(
  id: string,
  updates: Partial<DbNote>,
): Promise<DbNote | null> {
  try {
    const { data, error } = await supabase
      .from("notes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
