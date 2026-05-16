import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { toast } from "sonner";
import type { DbTask, DbProject, NewDbTask, NewDbProject, DbTaskComment, NewDbTaskComment } from "@/types/database";

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function fetchProjects(portalId: string): Promise<DbProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("name", { ascending: true });
  if (error) {
    console.error("fetchProjects:", error.message);
    toast.error(`Projects load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function upsertProject(
  project: Omit<NewDbProject, "portal_id"> & { id?: string },
  portalId: string,
): Promise<DbProject | null> {
  const { data, error } = await supabase
    .from("projects")
    .upsert({ ...project, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Project not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteProject(id: string, portalId?: string): Promise<boolean> {
  let q = supabase.from("projects").delete().eq("id", id);
  if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
  const { error } = await q;
  if (error) {
    toast.error(`Project not deleted: ${error.message}`);
    return false;
  }
  return true;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function fetchTasks(
  portalId: string,
  projectId?: string,
): Promise<DbTask[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("portal_id", toPortalUUID(portalId))
    .order("created_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) {
    console.error("fetchTasks:", error.message);
    toast.error(`Tasks load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function upsertTask(
  task: Omit<NewDbTask, "portal_id"> & { id?: string },
  portalId: string,
): Promise<DbTask | null> {
  const { data, error } = await supabase
    .from("tasks")
    .upsert({ ...task, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Task not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteTask(id: string, portalId: string): Promise<boolean> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    toast.error(`Task not deleted: ${error.message}`);
    return false;
  }
  return true;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(taskId: string): Promise<DbTaskComment[]> {
  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchComments:", error.message);
    return [];
  }
  return data ?? [];
}

export async function createComment(
  comment: Omit<NewDbTaskComment, "portal_id">,
  portalId: string,
): Promise<DbTaskComment | null> {
  const { data, error } = await supabase
    .from("task_comments")
    .insert({ ...comment, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    toast.error(`Comment not saved: ${error.message}`);
    return null;
  }
  return data;
}

export async function deleteComment(id: string, portalId?: string): Promise<boolean> {
  let q = supabase.from("task_comments").delete().eq("id", id);
  if (portalId) q = q.eq("portal_id", toPortalUUID(portalId));
  const { error } = await q;
  if (error) {
    toast.error(`Comment not deleted: ${error.message}`);
    return false;
  }
  return true;
}
