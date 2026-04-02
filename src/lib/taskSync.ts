/**
 * taskSync.ts — bidirectional mapping between the frontend Issue/Project
 * interface (linearStore.ts) and the Supabase tasks/projects tables.
 *
 * The Supabase schema stores:
 *   - due_date as DATE string (YYYY-MM-DD)
 *   - assigned_to / creator_id instead of assigneeId / creatorId
 *   - no subIssueIds (derived client-side from parent_id)
 *   - no comments (kept local only for now)
 *   - no milestoneId (not in tasks table)
 */

import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { Issue, Project } from "@/lib/linearStore";

// ── Row shapes returned by Supabase ──────────────────────────────────────────

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  creator_id: string;
  labels: string[];
  project_id: string | null;
  due_date: string | null;
  estimate: number | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  user_id: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

// ── Converters ───────────────────────────────────────────────────────────────

export function taskRowToIssue(row: TaskRow, allRows: TaskRow[]): Issue {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    status: row.status as Issue["status"],
    priority: row.priority as Issue["priority"],
    assigneeId: row.assigned_to,
    creatorId: row.creator_id,
    labels: row.labels ?? [],
    projectId: row.project_id,
    milestoneId: null,
    dueDate: row.due_date ? new Date(row.due_date) : null,
    estimate: row.estimate ?? null,
    parentId: row.parent_id,
    subIssueIds: allRows.filter(r => r.parent_id === row.id).map(r => r.id),
    comments: [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function issueToTaskRow(issue: Issue, userId: string) {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description ?? "",
    status: issue.status,
    priority: issue.priority,
    assigned_to: issue.assigneeId,
    creator_id: issue.creatorId || userId,
    labels: issue.labels,
    project_id: issue.projectId,
    due_date: issue.dueDate ? issue.dueDate.toISOString().split("T")[0] : null,
    estimate: issue.estimate,
    parent_id: issue.parentId,
    updated_at: new Date().toISOString(),
  };
}

function projectRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    emoji: "📋",
    color: row.color ?? "#6b7280",
    status: row.status as Project["status"],
    leadId: row.user_id,
    targetDate: null,
    description: row.description ?? "",
    milestones: [],
  };
}

function projectToRow(project: Project, userId: string) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    user_id: project.leadId || userId,
    color: project.color,
    updated_at: new Date().toISOString(),
  };
}

// ── Load ─────────────────────────────────────────────────────────────────────

export async function loadTasksFromSupabase(portalId?: string): Promise<Issue[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (portalId) query = query.eq("portal_id", toPortalUUID(portalId));

  const { data, error } = await query;
  if (error || !data) return [];
  const rows = data as TaskRow[];
  return rows.map(r => taskRowToIssue(r, rows));
}

export async function loadProjectsFromSupabase(portalId?: string): Promise<Project[]> {
  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (portalId) query = query.eq("portal_id", toPortalUUID(portalId));

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as ProjectRow[]).map(projectRowToProject);
}

// ── Write (with graceful fallback if Supabase table doesn't exist) ────────────

export async function upsertTask(issue: Issue, userId: string): Promise<void> {
  try {
    const { error } = await supabase.from("tasks").upsert(issueToTaskRow(issue, userId), { onConflict: "id" });
    // TODO: Replace with structured error logging (Sentry, etc.)
    if (error) console.warn("Failed to sync task to Supabase:", error.message);
  } catch {
    // Supabase not available — task lives in localStorage only
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    // TODO: Replace with structured error logging (Sentry, etc.)
    if (error) console.warn("Failed to delete task from Supabase:", error.message);
  } catch {
    // Supabase not available
  }
}

export async function upsertProject(project: Project, userId: string): Promise<void> {
  try {
    const { error } = await supabase.from("projects").upsert(projectToRow(project, userId), { onConflict: "id" });
    // TODO: Replace with structured error logging (Sentry, etc.)
    if (error) console.warn("Failed to sync project to Supabase:", error.message);
  } catch {
    // Supabase not available
  }
}
