import { ALL_USERS } from "@/lib/authContext";

// ── Types ──
export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type IssuePriority = "none" | "urgent" | "high" | "medium" | "low";
export type ProjectStatus = "planning" | "in_progress" | "completed" | "paused";

export interface Milestone {
  id: string;
  name: string;
  projectId: string;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string;
  status: ProjectStatus;
  leadId: string;
  targetDate: Date | null;
  description: string;
  milestones: Milestone[];
}

export interface IssueComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string | null;
  creatorId: string;
  labels: string[];
  projectId: string | null;
  milestoneId: string | null;
  dueDate: Date | null;
  estimate: number | null;
  parentId: string | null;
  subIssueIds: string[];
  comments: IssueComment[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Constants ──
export const ISSUE_STATUSES: { key: IssueStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

export const ISSUE_PRIORITIES: { key: IssuePriority; label: string; color: string }[] = [
  { key: "urgent", label: "Urgent", color: "#ef4444" },
  { key: "high", label: "High", color: "#f97316" },
  { key: "medium", label: "Medium", color: "#eab308" },
  { key: "low", label: "Low", color: "#3b82f6" },
  { key: "none", label: "No Priority", color: "#6b7280" },
];

export const PROJECT_STATUSES: { key: ProjectStatus; label: string; color: string }[] = [
  { key: "planning", label: "Planning", color: "#8b5cf6" },
  { key: "in_progress", label: "In Progress", color: "#eab308" },
  { key: "completed", label: "Completed", color: "#22c55e" },
  { key: "paused", label: "Paused", color: "#6b7280" },
];

export const ISSUE_LABELS: { name: string; color: string }[] = [
  { name: "Bug", color: "#ef4444" },
  { name: "Feature", color: "#8b5cf6" },
  { name: "Improvement", color: "#3b82f6" },
  { name: "Design", color: "#ec4899" },
  { name: "Docs", color: "#14b8a6" },
];

export const ESTIMATE_OPTIONS = [1, 2, 3, 5, 8, 13];

// ── Helpers ──
function d(daysAgo: number, h = 10): Date {
  const dt = new Date(); dt.setDate(dt.getDate() - daysAgo); dt.setHours(h, 0, 0, 0); return dt;
}
function fut(days: number): Date {
  const dt = new Date(); dt.setDate(dt.getDate() + days); dt.setHours(23, 59, 59, 0); return dt;
}

// ── SEED DATA PER PORTAL ─────────────────────────────────────────────────────

const SEED_PROJECTS: Record<string, Project[]> = {
  sosa: [],
  keylo: [],
  redx: [],
  trustme: [],
};

const SEED_ISSUES: Record<string, Issue[]> = {
  sosa: [],
  keylo: [],
  redx: [],
  trustme: [],
};

// ── STORE STATE ───────────────────────────────────────────────────────────────

let _portal = "sosa";
const _projectsByPortal: Record<string, Project[]> = {};
const _issuesByPortal: Record<string, Issue[]> = {};

let _projects: Project[] = SEED_PROJECTS.sosa.map(p => ({ ...p }));
let _issues: Issue[] = SEED_ISSUES.sosa.map(i => ({ ...i }));

function ensurePortal(id: string) {
  if (!_projectsByPortal[id]) {
    _projectsByPortal[id] = (SEED_PROJECTS[id] ?? SEED_PROJECTS.sosa).map(p => ({ ...p }));
  }
  if (!_issuesByPortal[id]) {
    _issuesByPortal[id] = (SEED_ISSUES[id] ?? SEED_ISSUES.sosa).map(i => ({ ...i }));
  }
}

export function setActivePortal(id: string) {
  _projectsByPortal[_portal] = _projects;
  _issuesByPortal[_portal] = _issues;
  ensurePortal(id);
  _portal = id;
  _projects = _projectsByPortal[id];
  _issues = _issuesByPortal[id];
}

export function getInitialProjects(): Project[] { return _projects; }
export function getInitialIssues(): Issue[] { return _issues; }

// ── Backward-compatible exports (point to sosa seed) ──
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_ISSUES: Issue[] = [];

// Counter for new issue IDs
let issueCounter = 20;
export function generateIssueId(prefix: string = "ISS"): string {
  issueCounter++;
  return `${prefix}-${issueCounter}`;
}
