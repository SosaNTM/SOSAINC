/**
 * Universal search index — aggregates all app data into a flat, searchable list.
 * Built once at module load time; search is a pure filter() call.
 */
import { INITIAL_VAULT_ITEMS } from "./vaultStore";
import { INITIAL_FILES, INITIAL_FOLDERS } from "./cloudStore";
import { INITIAL_TASKS } from "./tasksStore";
import { INITIAL_NOTES } from "./notesStore";

export type SearchGroup =
  | "Pages"
  | "Cloud Files"
  | "Vault"
  | "Tasks"
  | "Notes"
  | "Invoices"
  | "Transactions";

export interface SearchEntry {
  id: string;
  title: string;
  subtitle: string;
  group: SearchGroup;
  path: string;
  /** Emoji icon for rich-type entries (files, vault) */
  emoji?: string;
  /** Lucide icon name for page entries */
  iconName?: string;
  badge?: string;
  keywords: string; // collapsed string for fast .includes() matching
}

// ─── Pages ────────────────────────────────────────────────
const PAGE_ENTRIES: SearchEntry[] = [
  { id: "p_profile", title: "Profile", subtitle: "Account", group: "Pages", path: "/profile", iconName: "User", keywords: "profile account" },
  { id: "p_dashboard", title: "Dashboard", subtitle: "Finance", group: "Pages", path: "/dashboard", iconName: "LayoutDashboard", keywords: "dashboard finance overview" },
  { id: "p_costs", title: "Cost Breakdown", subtitle: "Finance", group: "Pages", path: "/costs", iconName: "PieChart", keywords: "cost breakdown pie finance" },
  { id: "p_transactions", title: "Transactions", subtitle: "Finance", group: "Pages", path: "/transactions", iconName: "ArrowLeftRight", keywords: "transactions payments finance" },
  { id: "p_channels", title: "Channels & Categories", subtitle: "Finance", group: "Pages", path: "/channels", iconName: "Layers", keywords: "channels categories finance" },
  { id: "p_plrules", title: "P&L Rules", subtitle: "Finance", group: "Pages", path: "/pl-rules", iconName: "SlidersHorizontal", keywords: "pl rules profit loss finance" },
  { id: "p_invoices", title: "Invoices", subtitle: "Finance", group: "Pages", path: "/invoices", iconName: "FileText", keywords: "invoices billing finance" },
  { id: "p_social_overview", title: "Social Overview", subtitle: "Social", group: "Pages", path: "/social/overview", iconName: "TrendingUp", keywords: "social overview analytics" },
  { id: "p_social_accounts", title: "Social Accounts", subtitle: "Social", group: "Pages", path: "/social/accounts", iconName: "Radio", keywords: "social accounts" },
  { id: "p_social_analytics", title: "Social Analytics", subtitle: "Social", group: "Pages", path: "/social/analytics", iconName: "BarChart3", keywords: "social analytics" },
  { id: "p_social_content", title: "Social Content", subtitle: "Social", group: "Pages", path: "/social/content", iconName: "FileImage", keywords: "social content media" },
  { id: "p_social_audience", title: "Social Audience", subtitle: "Social", group: "Pages", path: "/social/audience", iconName: "Users", keywords: "social audience followers" },
  { id: "p_social_competitors", title: "Social Competitors", subtitle: "Social", group: "Pages", path: "/social/competitors", iconName: "Swords", keywords: "social competitors" },
  { id: "p_vault", title: "Vault", subtitle: "Workspace", group: "Pages", path: "/vault", iconName: "Lock", keywords: "vault passwords secrets" },
  { id: "p_cloud", title: "Cloud", subtitle: "Workspace", group: "Pages", path: "/cloud", iconName: "Cloud", keywords: "cloud files storage" },
  { id: "p_tasks", title: "Tasks", subtitle: "Workspace", group: "Pages", path: "/tasks", iconName: "CheckSquare", keywords: "tasks todo" },
  { id: "p_notes", title: "Notes", subtitle: "Workspace", group: "Pages", path: "/notes", iconName: "StickyNote", keywords: "notes memo" },
  { id: "p_admin", title: "Administration", subtitle: "Admin", group: "Pages", path: "/admin", iconName: "ShieldCheck", keywords: "administration admin users" },
  { id: "p_settings", title: "Settings", subtitle: "Admin", group: "Pages", path: "/settings", iconName: "Settings", keywords: "settings preferences" },
];

// ─── Vault ────────────────────────────────────────────────
function vaultEmoji(type: string): string {
  switch (type) {
    case "credential": return "🔑";
    case "api_key": return "🗝️";
    case "document": return "📄";
    case "note": return "📝";
    default: return "🔒";
  }
}

const VAULT_ENTRIES: SearchEntry[] = INITIAL_VAULT_ITEMS.map((item) => ({
  id: `vault_${item.id}`,
  title: item.name,
  subtitle: item.category,
  group: "Vault" as SearchGroup,
  path: "/vault",
  emoji: vaultEmoji(item.type),
  badge: item.isLocked ? "Locked" : undefined,
  keywords: [
    item.name,
    item.category,
    item.type,
    item.credential?.username ?? "",
    item.credential?.url ?? "",
    item.apiKey?.service ?? "",
    item.document?.filename ?? "",
  ].join(" ").toLowerCase(),
}));

// ─── Cloud Files ───────────────────────────────────────────
function fileEmoji(type: string): string {
  switch (type) {
    case "pdf": return "📄";
    case "docx": return "📝";
    case "xlsx": return "📊";
    case "image": return "🖼️";
    case "zip": return "📦";
    case "pptx": return "📑";
    default: return "📎";
  }
}

const folderMap = Object.fromEntries(INITIAL_FOLDERS.map((f) => [f.id, f.name]));

const CLOUD_ENTRIES: SearchEntry[] = INITIAL_FILES
  .filter((f) => !f.isDeleted)
  .map((file) => ({
    id: `cloud_${file.id}`,
    title: file.name,
    subtitle: folderMap[file.folderId] ?? "Cloud",
    group: "Cloud Files" as SearchGroup,
    path: "/cloud",
    emoji: fileEmoji(file.type),
    keywords: [
      file.name,
      file.description ?? "",
      file.type,
      folderMap[file.folderId] ?? "",
    ].join(" ").toLowerCase(),
  }));

// ─── Tasks ────────────────────────────────────────────────
function taskEmoji(status: string): string {
  switch (status) {
    case "done": return "✅";
    case "in_progress": return "🔄";
    case "todo": return "🔵";
    default: return "⚪";
  }
}

const TASK_ENTRIES: SearchEntry[] = INITIAL_TASKS.map((task) => ({
  id: `task_${task.id}`,
  title: task.title,
  subtitle: `${task.id} · ${task.status.replace("_", " ")}`,
  group: "Tasks" as SearchGroup,
  path: "/tasks",
  emoji: taskEmoji(task.status),
  badge: task.priority === "urgent" ? "Urgent" : undefined,
  keywords: [task.title, task.description, task.id, task.status, ...task.labels].join(" ").toLowerCase(),
}));

// ─── Notes ────────────────────────────────────────────────
const NOTE_ENTRIES: SearchEntry[] = INITIAL_NOTES
  .filter((n) => !n.isArchived)
  .map((note) => ({
    id: `note_${note.id}`,
    title: note.title,
    subtitle: note.tags.length ? note.tags.join(", ") : "Note",
    group: "Notes" as SearchGroup,
    path: "/notes",
    emoji: "📓",
    keywords: [note.title, note.content, ...note.tags].join(" ").toLowerCase(),
  }));

// ─── Invoices (inline mock — mirrors invoiceStore) ─────────
const INVOICE_MOCK = [
  { id: "i1", number: "INV-2025-001", client: "Alpha Corp", status: "paid" },
  { id: "i2", number: "INV-2025-002", client: "Beta Solutions", status: "paid" },
  { id: "i3", number: "INV-2025-003", client: "Gamma Tech", status: "pending" },
  { id: "i4", number: "INV-2025-004", client: "Delta Group", status: "overdue" },
  { id: "i5", number: "INV-2025-005", client: "Epsilon Labs", status: "paid" },
  { id: "i6", number: "INV-2025-006", client: "Zeta Digital", status: "overdue" },
  { id: "i7", number: "INV-2025-007", client: "Alpha Corp", status: "paid" },
  { id: "i8", number: "INV-2025-008", client: "Beta Solutions", status: "pending" },
];

function invoiceEmoji(status: string): string {
  switch (status) {
    case "paid": return "✅";
    case "pending": return "🕐";
    case "overdue": return "🔴";
    default: return "📋";
  }
}

const INVOICE_ENTRIES: SearchEntry[] = INVOICE_MOCK.map((inv) => ({
  id: `inv_${inv.id}`,
  title: `${inv.number} — ${inv.client}`,
  subtitle: inv.client,
  group: "Invoices" as SearchGroup,
  path: "/invoices",
  emoji: invoiceEmoji(inv.status),
  badge: inv.status === "overdue" ? "Overdue" : undefined,
  keywords: [inv.number, inv.client, inv.status].join(" ").toLowerCase(),
}));

// ─── Transactions (inline mock) ────────────────────────────
const TRANSACTION_MOCK = [
  { id: "t1", description: "Enterprise SaaS License Q4", category: "Licensing", type: "income" },
  { id: "t2", description: "Client Alpha – Monthly Retainer", category: "Services", type: "income" },
  { id: "t3", description: "December Developer Salaries", category: "Production Staff", type: "expense" },
  { id: "t4", description: "Google Ads Campaign", category: "Marketing & Ads", type: "expense" },
  { id: "t5", description: "Consulting – Beta Corp Integration", category: "Consulting", type: "income" },
  { id: "t6", description: "AWS Infrastructure Dec", category: "Infrastructure", type: "expense" },
  { id: "t7", description: "Office Rent December", category: "Rent", type: "expense" },
  { id: "t8", description: "Product Sales – Widget Pro", category: "Sales", type: "income" },
  { id: "t9", description: "Freelance UI Designer", category: "Subcontractors", type: "expense" },
  { id: "t10", description: "JetBrains & Figma Licenses", category: "Software Licenses", type: "expense" },
  { id: "t11", description: "Consulting – Gamma Ltd", category: "Consulting", type: "income" },
  { id: "t12", description: "Admin Staff Salaries", category: "Admin & Management", type: "expense" },
  { id: "t13", description: "Raw Materials Order #47", category: "Materials & Supplies", type: "expense" },
  { id: "t14", description: "Licensing – Delta Inc Annual", category: "Licensing", type: "income" },
  { id: "t15", description: "Quarterly Tax Payment", category: "Taxes & Contributions", type: "expense" },
  { id: "t16", description: "Services – Omega Support Contract", category: "Services", type: "income" },
  { id: "t17", description: "Electricity & Internet Nov", category: "Utilities & Insurance", type: "expense" },
  { id: "t18", description: "Sales – Bulk Order #12", category: "Sales", type: "income" },
  { id: "t19", description: "Legal Consulting Fee", category: "Other", type: "expense" },
  { id: "t20", description: "Backend Developer Contract", category: "Production Staff", type: "expense" },
];

const TRANSACTION_ENTRIES: SearchEntry[] = TRANSACTION_MOCK.map((tx) => ({
  id: `tx_${tx.id}`,
  title: tx.description,
  subtitle: tx.category,
  group: "Transactions" as SearchGroup,
  path: "/transactions",
  emoji: tx.type === "income" ? "💚" : "🔴",
  keywords: [tx.description, tx.category, tx.type].join(" ").toLowerCase(),
}));

// ─── Full index ────────────────────────────────────────────
export const SEARCH_INDEX: SearchEntry[] = [
  ...PAGE_ENTRIES,
  ...VAULT_ENTRIES,
  ...CLOUD_ENTRIES,
  ...TASK_ENTRIES,
  ...NOTE_ENTRIES,
  ...INVOICE_ENTRIES,
  ...TRANSACTION_ENTRIES,
];

export const GROUP_ORDER: SearchGroup[] = [
  "Pages",
  "Cloud Files",
  "Vault",
  "Tasks",
  "Notes",
  "Invoices",
  "Transactions",
];

/** Max results shown per group in the dropdown */
export const MAX_PER_GROUP = 4;

export function searchAll(query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SEARCH_INDEX.filter((e) => e.keywords.includes(q) || e.title.toLowerCase().includes(q));
}
