import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { DbTask, DbProject, NewDbTask, NewDbProject, DbTaskComment, NewDbTaskComment } from "@/types/database";

const LS_TASKS = (portalId: string) => `iconoff_tasks_${portalId}`;
const LS_PROJECTS = (portalId: string) => `iconoff_projects_${portalId}`;

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function fetchProjects(portalId: string): Promise<DbProject[]> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("name", { ascending: true });
    if (error) throw error;
    const result = data ?? [];
    localStorage.setItem(LS_PROJECTS(portalId), JSON.stringify(result));
    return result;
  } catch {
    try { return JSON.parse(localStorage.getItem(LS_PROJECTS(portalId)) ?? "[]"); }
    catch { return []; }
  }
}

export async function upsertProject(
  project: Omit<NewDbProject, "portal_id"> & { id?: string },
  portalId: string,
): Promise<DbProject | null> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .upsert({ ...project, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deleteProject(id: string, portalId?: string): Promise<boolean> {
  try {
    let q = supabase.from("projects").delete().eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { error } = await q;
    return !error;
  } catch {
    return false;
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function fetchTasks(
  portalId: string,
  projectId?: string,
): Promise<DbTask[]> {
  try {
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("created_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query;
    if (error) throw error;
    const result = data ?? [];
    localStorage.setItem(LS_TASKS(portalId), JSON.stringify(result));
    return result;
  } catch {
    try { return JSON.parse(localStorage.getItem(LS_TASKS(portalId)) ?? "[]"); }
    catch { return []; }
  }
}

export async function upsertTask(
  task: Omit<NewDbTask, "portal_id"> & { id?: string },
  portalId: string,
): Promise<DbTask | null> {
  // Optimistic local update
  try {
    const { data, error } = await supabase
      .from("tasks")
      .upsert({ ...task, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deleteTask(id: string, portalId?: string): Promise<boolean> {
  try {
    let q = supabase.from("tasks").delete().eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { error } = await q;
    return !error;
  } catch {
    return false;
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(taskId: string): Promise<DbTaskComment[]> {
  try {
    const { data, error } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createComment(
  comment: Omit<NewDbTaskComment, "portal_id">,
  portalId: string,
): Promise<DbTaskComment | null> {
  try {
    const { data, error } = await supabase
      .from("task_comments")
      .insert({ ...comment, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function deleteComment(id: string, portalId?: string): Promise<boolean> {
  try {
    let q = supabase.from("task_comments").delete().eq("id", id);
    if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
    const { error } = await q;
    return !error;
  } catch {
    return false;
  }
}
