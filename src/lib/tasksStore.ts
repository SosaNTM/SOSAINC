import { ALL_USERS } from "@/lib/authContext";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low";

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  creatorId: string;
  watcherIds: string[];
  labels: string[];
  dueDate: Date | null;
  completedAt: Date | null;
  comments: Comment[];
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

export const STATUSES: { key: TaskStatus; label: string; icon: string }[] = [
  { key: "backlog", label: "Backlog", icon: "⚪" },
  { key: "todo", label: "To Do", icon: "🔵" },
  { key: "in_progress", label: "In Progress", icon: "🟡" },
  { key: "done", label: "Done", icon: "🟢" },
];

export const PRIORITIES: { key: TaskPriority; label: string; emoji: string; color: string; bg: string }[] = [
  { key: "urgent", label: "Urgent", emoji: "🔴", color: "#dc2626", bg: "rgba(220,38,38,0.10)" },
  { key: "high", label: "High", emoji: "🟠", color: "#ea580c", bg: "rgba(234,88,12,0.10)" },
  { key: "medium", label: "Medium", emoji: "🟡", color: "#ca8a04", bg: "rgba(202,138,4,0.10)" },
  { key: "low", label: "Low", emoji: "🟢", color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
];

export const LABEL_OPTIONS = ["finance", "marketing", "ops", "legal", "product", "design", "hr", "other"];

export const LABEL_COLORS: Record<string, string> = {
  finance: "#6ee7b7", marketing: "#fb923c", ops: "#38bdf8", legal: "#a78bfa",
  product: "#34d399", design: "#c084fc", hr: "#f472b6", other: "#94a3b8",
};

function d(daysAgo: number, h = 10): Date {
  const dt = new Date(); dt.setDate(dt.getDate() - daysAgo); dt.setHours(h, 0, 0, 0); return dt;
}
function due(daysFromNow: number): Date {
  const dt = new Date(); dt.setDate(dt.getDate() + daysFromNow); dt.setHours(23, 59, 59, 0); return dt;
}

export const INITIAL_TASKS: Task[] = [
  // empty — ready for real data
]; const _UNUSED_TASKS: Task[] = [
  { id: "TSK-001", title: "Research competitor pricing", description: "Analyze top 5 competitors' pricing models and create comparison matrix.", status: "backlog", priority: "low", assigneeId: "usr_003", creatorId: "usr_001", watcherIds: [], labels: ["marketing"], dueDate: null, completedAt: null, comments: [], attachments: [], createdAt: d(10), updatedAt: d(10) },
  { id: "TSK-002", title: "Set up error monitoring", description: "Integrate Sentry or similar for frontend error tracking.", status: "backlog", priority: "medium", assigneeId: null, creatorId: "usr_002", watcherIds: ["usr_001"], labels: ["ops", "product"], dueDate: null, completedAt: null, comments: [], attachments: [], createdAt: d(8), updatedAt: d(8) },
  { id: "TSK-003", title: "Update team handbook", description: "Add new policies and onboarding checklist to the handbook.", status: "backlog", priority: "low", assigneeId: "usr_002", creatorId: "usr_001", watcherIds: [], labels: ["hr"], dueDate: due(20), completedAt: null, comments: [], attachments: [], createdAt: d(12), updatedAt: d(12) },

  // To Do (5)
  { id: "TSK-004", title: "Fix payment gateway timeout", description: "Users report timeout errors on large transactions. Investigate and fix.", status: "todo", priority: "urgent", assigneeId: "usr_002", creatorId: "usr_001", watcherIds: ["usr_003"], labels: ["finance", "ops"], dueDate: due(1), completedAt: null,
    comments: [{ id: "c1", authorId: "usr_001", content: "This is critical — multiple clients affected.", createdAt: d(1, 9) }, { id: "c2", authorId: "usr_002", content: "Looking into it now. Seems like a timeout config issue.", createdAt: d(0, 14) }],
    attachments: [], createdAt: d(3), updatedAt: d(0, 14) },
  { id: "TSK-005", title: "Design new invoice template", description: "Create a cleaner, branded invoice template for clients.", status: "todo", priority: "high", assigneeId: "usr_004", creatorId: "usr_001", watcherIds: [], labels: ["design", "finance"], dueDate: due(5), completedAt: null, comments: [], attachments: [], createdAt: d(5), updatedAt: d(5) },
  { id: "TSK-006", title: "Write Q1 marketing report", description: "Compile metrics from all channels and summarize performance.", status: "todo", priority: "medium", assigneeId: "usr_003", creatorId: "usr_002", watcherIds: ["usr_001"], labels: ["marketing"], dueDate: due(7), completedAt: null, comments: [], attachments: [], createdAt: d(4), updatedAt: d(4) },
  { id: "TSK-007", title: "Review vendor contracts", description: "3 vendor contracts expiring this quarter — review and renegotiate.", status: "todo", priority: "high", assigneeId: "usr_001", creatorId: "usr_002", watcherIds: [], labels: ["legal", "finance"], dueDate: due(-2), completedAt: null,
    comments: [{ id: "c3", authorId: "usr_002", content: "Contracts uploaded to Vault. @Alessandro please review.", createdAt: d(2) }],
    attachments: [{ id: "a1", filename: "vendor_contract_A.pdf", size: 2400000, uploadedBy: "usr_002", uploadedAt: d(2) }], createdAt: d(6), updatedAt: d(2) },
  { id: "TSK-008", title: "Prepare onboarding deck", description: "Create presentation for new hires starting March.", status: "todo", priority: "low", assigneeId: "usr_003", creatorId: "usr_001", watcherIds: ["usr_004"], labels: ["hr"], dueDate: due(10), completedAt: null, comments: [], attachments: [], createdAt: d(3), updatedAt: d(3) },

  // In Progress (4)
  { id: "TSK-009", title: "Migrate database to new region", description: "Move primary DB from EU-west to EU-central for better latency.", status: "in_progress", priority: "urgent", assigneeId: "usr_002", creatorId: "usr_001", watcherIds: ["usr_001"], labels: ["ops"], dueDate: due(3), completedAt: null,
    comments: [{ id: "c4", authorId: "usr_002", content: "Migration started. ETA: 2 days. Read replicas already moved.", createdAt: d(1) }, { id: "c5", authorId: "usr_001", content: "Keep me updated on downtime window.", createdAt: d(0, 11) }],
    attachments: [], createdAt: d(7), updatedAt: d(0, 11) },
  { id: "TSK-010", title: "Launch social media campaign", description: "Execute the Q1 social media campaign across all platforms.", status: "in_progress", priority: "high", assigneeId: "usr_003", creatorId: "usr_001", watcherIds: ["usr_004"], labels: ["marketing"], dueDate: due(-1), completedAt: null,
    comments: [{ id: "c6", authorId: "usr_003", content: "Instagram and LinkedIn posts scheduled. YouTube pending.", createdAt: d(1, 15) }],
    attachments: [], createdAt: d(5), updatedAt: d(1, 15) },
  { id: "TSK-011", title: "Redesign settings page", description: "Modernize the settings page with new component library.", status: "in_progress", priority: "medium", assigneeId: "usr_004", creatorId: "usr_002", watcherIds: [], labels: ["design", "product"], dueDate: due(4), completedAt: null, comments: [], attachments: [], createdAt: d(4), updatedAt: d(2) },
  { id: "TSK-012", title: "Client proposal - Acme Corp", description: "Draft proposal for the Acme Corp enterprise deal.", status: "in_progress", priority: "high", assigneeId: "usr_001", creatorId: "usr_001", watcherIds: ["usr_002"], labels: ["finance"], dueDate: due(2), completedAt: null,
    comments: [{ id: "c7", authorId: "usr_001", content: "First draft ready. Need pricing review from Marco.", createdAt: d(0, 16) }],
    attachments: [{ id: "a2", filename: "acme_proposal_v1.docx", size: 890000, uploadedBy: "usr_001", uploadedAt: d(0, 16) }], createdAt: d(6), updatedAt: d(0, 16) },

  // Done (3)
  { id: "TSK-013", title: "Set up CI/CD pipeline", description: "Configure automated testing and deployment pipeline.", status: "done", priority: "high", assigneeId: "usr_002", creatorId: "usr_001", watcherIds: [], labels: ["ops", "product"], dueDate: d(3), completedAt: d(2), comments: [], attachments: [], createdAt: d(14), updatedAt: d(2) },
  { id: "TSK-014", title: "Create brand style guide", description: "Document all brand assets, colors, typography, and usage guidelines.", status: "done", priority: "medium", assigneeId: "usr_004", creatorId: "usr_001", watcherIds: ["usr_003"], labels: ["design"], dueDate: d(1), completedAt: d(1), comments: [], attachments: [], createdAt: d(10), updatedAt: d(1) },
  { id: "TSK-015", title: "Tax filing preparation", description: "Gather all documents for Q4 tax filing.", status: "done", priority: "urgent", assigneeId: "usr_001", creatorId: "usr_001", watcherIds: ["usr_002"], labels: ["finance", "legal"], dueDate: d(5), completedAt: d(4), comments: [], attachments: [], createdAt: d(20), updatedAt: d(4) },
]; // eslint-disable-line @typescript-eslint/no-unused-vars
