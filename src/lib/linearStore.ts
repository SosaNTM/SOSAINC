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
  sosa: [
    { id: "prj_01", name: "Website Redesign", emoji: "🎨", color: "#8b5cf6", status: "in_progress", leadId: "usr_004", targetDate: fut(30), description: "Complete overhaul of the company website with new branding and improved UX.", milestones: [{ id: "ms_01", name: "Research & Wireframes", projectId: "prj_01", order: 0 }, { id: "ms_02", name: "Visual Design", projectId: "prj_01", order: 1 }, { id: "ms_03", name: "Development", projectId: "prj_01", order: 2 }, { id: "ms_04", name: "Launch", projectId: "prj_01", order: 3 }] },
    { id: "prj_02", name: "Q1 Marketing Push", emoji: "📢", color: "#f97316", status: "in_progress", leadId: "usr_003", targetDate: fut(14), description: "Execute the Q1 marketing campaign across all channels.", milestones: [{ id: "ms_05", name: "Content Creation", projectId: "prj_02", order: 0 }, { id: "ms_06", name: "Campaign Launch", projectId: "prj_02", order: 1 }, { id: "ms_07", name: "Analysis & Report", projectId: "prj_02", order: 2 }] },
    { id: "prj_03", name: "Infrastructure Upgrade", emoji: "⚙️", color: "#22c55e", status: "planning", leadId: "usr_002", targetDate: fut(60), description: "Migrate core infrastructure to improve performance and reliability.", milestones: [{ id: "ms_08", name: "Alpha", projectId: "prj_03", order: 0 }, { id: "ms_09", name: "Beta", projectId: "prj_03", order: 1 }, { id: "ms_10", name: "Production", projectId: "prj_03", order: 2 }] },
  ],
  keylo: [
    { id: "kprj_01", name: "Winter Product Launch", emoji: "❄️", color: "#3b82f6", status: "in_progress", leadId: "usr_001", targetDate: fut(20), description: "Launch the Winter 2025 product collection across all sales channels.", milestones: [{ id: "kms_01", name: "Product Prep & Photography", projectId: "kprj_01", order: 0 }, { id: "kms_02", name: "Listings & SEO", projectId: "kprj_01", order: 1 }, { id: "kms_03", name: "Campaign Launch", projectId: "kprj_01", order: 2 }] },
    { id: "kprj_02", name: "TikTok Shop Growth", emoji: "📱", color: "#e11d48", status: "in_progress", leadId: "usr_003", targetDate: fut(45), description: "Scale TikTok Shop from 4K to 10K monthly orders via affiliate and live stream strategy.", milestones: [{ id: "kms_04", name: "Creator Outreach", projectId: "kprj_02", order: 0 }, { id: "kms_05", name: "Live Stream Setup", projectId: "kprj_02", order: 1 }, { id: "kms_06", name: "Scale & Optimize", projectId: "kprj_02", order: 2 }] },
    { id: "kprj_03", name: "Warehouse Automation", emoji: "🏭", color: "#059669", status: "planning", leadId: "usr_002", targetDate: fut(90), description: "Implement automated pick-and-pack and inventory tracking at 3PL.", milestones: [{ id: "kms_07", name: "WMS Integration", projectId: "kprj_03", order: 0 }, { id: "kms_08", name: "Pilot Testing", projectId: "kprj_03", order: 1 }, { id: "kms_09", name: "Full Rollout", projectId: "kprj_03", order: 2 }] },
  ],
  redx: [
    { id: "rprj_01", name: "MaxImpact Rebrand", emoji: "🎨", color: "#db2777", status: "in_progress", leadId: "usr_004", targetDate: fut(25), description: "Complete brand identity overhaul for MaxImpact — logo, colors, guidelines, and assets.", milestones: [{ id: "rms_01", name: "Discovery & Strategy", projectId: "rprj_01", order: 0 }, { id: "rms_02", name: "Identity Design", projectId: "rprj_01", order: 1 }, { id: "rms_03", name: "Rollout & Guidelines", projectId: "rprj_01", order: 2 }] },
    { id: "rprj_02", name: "Q1 Campaign Suite", emoji: "📣", color: "#f97316", status: "in_progress", leadId: "usr_003", targetDate: fut(10), description: "Deliver Q1 creative assets and media strategy for BoostBrand and XtremeDig.", milestones: [{ id: "rms_04", name: "Creative Brief", projectId: "rprj_02", order: 0 }, { id: "rms_05", name: "Asset Production", projectId: "rprj_02", order: 1 }, { id: "rms_06", name: "Campaign Live", projectId: "rprj_02", order: 2 }] },
    { id: "rprj_03", name: "Agency Website v3", emoji: "🌐", color: "#7c3aed", status: "planning", leadId: "usr_002", targetDate: fut(60), description: "Redesign the REDX agency website with case studies, new portfolio, and lead capture.", milestones: [{ id: "rms_07", name: "Concept", projectId: "rprj_03", order: 0 }, { id: "rms_08", name: "Design", projectId: "rprj_03", order: 1 }, { id: "rms_09", name: "Build & Launch", projectId: "rprj_03", order: 2 }] },
  ],
  trustme: [
    { id: "tprj_01", name: "GDPR Compliance Audit", emoji: "🔒", color: "#3b82f6", status: "in_progress", leadId: "usr_001", targetDate: fut(30), description: "Full GDPR gap analysis and remediation roadmap for 3 enterprise clients.", milestones: [{ id: "tms_01", name: "Data Mapping", projectId: "tprj_01", order: 0 }, { id: "tms_02", name: "Gap Analysis", projectId: "tprj_01", order: 1 }, { id: "tms_03", name: "Remediation Plan", projectId: "tprj_01", order: 2 }] },
    { id: "tprj_02", name: "ISO 27001 Certification", emoji: "📋", color: "#059669", status: "in_progress", leadId: "usr_002", targetDate: fut(120), description: "Guide AuditPlus through ISO 27001 implementation and external audit.", milestones: [{ id: "tms_04", name: "ISMS Setup", projectId: "tprj_02", order: 0 }, { id: "tms_05", name: "Risk Assessment", projectId: "tprj_02", order: 1 }, { id: "tms_06", name: "External Audit", projectId: "tprj_02", order: 2 }] },
    { id: "tprj_03", name: "KYC Platform Rollout", emoji: "🪪", color: "#d97706", status: "planning", leadId: "usr_003", targetDate: fut(75), description: "Deploy TrustMe KYC platform at SecureVerify and onboard their compliance team.", milestones: [{ id: "tms_07", name: "Integration", projectId: "tprj_03", order: 0 }, { id: "tms_08", name: "UAT", projectId: "tprj_03", order: 1 }, { id: "tms_09", name: "Go-Live", projectId: "tprj_03", order: 2 }] },
  ],
};

const SEED_ISSUES: Record<string, Issue[]> = {
  sosa: [
    { id: "WEB-1", title: "Create wireframes for homepage", description: "Design low-fi wireframes for the new homepage layout including hero, features, and CTA sections.", status: "done", priority: "high", assigneeId: "usr_004", creatorId: "usr_001", labels: ["Design"], projectId: "prj_01", milestoneId: "ms_01", dueDate: d(2), estimate: 5, parentId: null, subIssueIds: ["WEB-2", "WEB-3"], comments: [{ id: "ic1", authorId: "usr_001", content: "Looking great, approved!", createdAt: d(3) }], createdAt: d(14), updatedAt: d(2) },
    { id: "WEB-2", title: "Mobile wireframes", description: "Responsive wireframes for mobile breakpoints.", status: "done", priority: "medium", assigneeId: "usr_004", creatorId: "usr_004", labels: ["Design"], projectId: "prj_01", milestoneId: "ms_01", dueDate: d(3), estimate: 3, parentId: "WEB-1", subIssueIds: [], comments: [], createdAt: d(12), updatedAt: d(3) },
    { id: "WEB-3", title: "Tablet wireframes", description: "Tablet-specific layout adjustments.", status: "done", priority: "low", assigneeId: "usr_004", creatorId: "usr_004", labels: ["Design"], projectId: "prj_01", milestoneId: "ms_01", dueDate: d(4), estimate: 2, parentId: "WEB-1", subIssueIds: [], comments: [], createdAt: d(12), updatedAt: d(4) },
    { id: "WEB-4", title: "Design new color system", description: "Create a cohesive color palette with semantic tokens for the new brand.", status: "in_progress", priority: "high", assigneeId: "usr_004", creatorId: "usr_001", labels: ["Design"], projectId: "prj_01", milestoneId: "ms_02", dueDate: fut(3), estimate: 5, parentId: null, subIssueIds: [], comments: [{ id: "ic2", authorId: "usr_004", content: "Working on dark mode palette now.", createdAt: d(1) }], createdAt: d(7), updatedAt: d(1) },
    { id: "WEB-5", title: "Implement responsive navigation", description: "Build the main nav component with mobile hamburger menu.", status: "todo", priority: "medium", assigneeId: "usr_002", creatorId: "usr_001", labels: ["Feature"], projectId: "prj_01", milestoneId: "ms_03", dueDate: fut(10), estimate: 8, parentId: null, subIssueIds: [], comments: [], createdAt: d(5), updatedAt: d(5) },
    { id: "WEB-6", title: "Fix header z-index issue", description: "Header overlaps with modal on mobile Safari.", status: "backlog", priority: "low", assigneeId: null, creatorId: "usr_002", labels: ["Bug"], projectId: "prj_01", milestoneId: null, dueDate: null, estimate: 1, parentId: null, subIssueIds: [], comments: [], createdAt: d(3), updatedAt: d(3) },
    { id: "MKT-1", title: "Write blog post series", description: "Create 4-part blog series on industry trends for Q1.", status: "in_progress", priority: "high", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Feature", "Docs"], projectId: "prj_02", milestoneId: "ms_05", dueDate: fut(5), estimate: 8, parentId: null, subIssueIds: ["MKT-2"], comments: [{ id: "ic3", authorId: "usr_003", content: "Part 1 and 2 are drafted.", createdAt: d(1) }], createdAt: d(10), updatedAt: d(1) },
    { id: "MKT-2", title: "SEO optimization for blog posts", description: "Research keywords and optimize meta tags.", status: "todo", priority: "medium", assigneeId: "usr_003", creatorId: "usr_003", labels: ["Improvement"], projectId: "prj_02", milestoneId: "ms_05", dueDate: fut(7), estimate: 3, parentId: "MKT-1", subIssueIds: [], comments: [], createdAt: d(8), updatedAt: d(8) },
    { id: "MKT-3", title: "Launch social media campaign", description: "Schedule and launch posts across Instagram, LinkedIn, YouTube.", status: "in_review", priority: "urgent", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Feature"], projectId: "prj_02", milestoneId: "ms_06", dueDate: fut(1), estimate: 5, parentId: null, subIssueIds: [], comments: [{ id: "ic4", authorId: "usr_003", content: "All posts scheduled. Awaiting final approval.", createdAt: d(0, 14) }], createdAt: d(6), updatedAt: d(0, 14) },
    { id: "MKT-4", title: "Design email newsletter template", description: "Create responsive HTML email template for monthly newsletter.", status: "done", priority: "medium", assigneeId: "usr_004", creatorId: "usr_003", labels: ["Design"], projectId: "prj_02", milestoneId: "ms_05", dueDate: d(1), estimate: 3, parentId: null, subIssueIds: [], comments: [], createdAt: d(8), updatedAt: d(1) },
    { id: "INF-1", title: "Audit current database performance", description: "Run benchmarks and identify bottlenecks in the current setup.", status: "todo", priority: "high", assigneeId: "usr_002", creatorId: "usr_001", labels: ["Improvement"], projectId: "prj_03", milestoneId: "ms_08", dueDate: fut(7), estimate: 5, parentId: null, subIssueIds: ["INF-2"], comments: [], createdAt: d(4), updatedAt: d(4) },
    { id: "INF-2", title: "Document current architecture", description: "Create diagrams of current infrastructure.", status: "backlog", priority: "low", assigneeId: null, creatorId: "usr_002", labels: ["Docs"], projectId: "prj_03", milestoneId: "ms_08", dueDate: null, estimate: 2, parentId: "INF-1", subIssueIds: [], comments: [], createdAt: d(4), updatedAt: d(4) },
    { id: "INF-3", title: "Set up staging environment", description: "Create a staging env that mirrors production for testing migrations.", status: "backlog", priority: "medium", assigneeId: "usr_002", creatorId: "usr_002", labels: ["Feature"], projectId: "prj_03", milestoneId: "ms_09", dueDate: fut(30), estimate: 8, parentId: null, subIssueIds: [], comments: [], createdAt: d(3), updatedAt: d(3) },
    { id: "GEN-1", title: "Update company-wide password policy", description: "Review and strengthen password requirements across all systems.", status: "todo", priority: "medium", assigneeId: "usr_001", creatorId: "usr_001", labels: ["Improvement"], projectId: null, milestoneId: null, dueDate: fut(14), estimate: 2, parentId: null, subIssueIds: [], comments: [], createdAt: d(2), updatedAt: d(2) },
    { id: "GEN-2", title: "Fix broken links in documentation", description: "Several links in the internal docs are returning 404.", status: "cancelled", priority: "low", assigneeId: null, creatorId: "usr_003", labels: ["Bug", "Docs"], projectId: null, milestoneId: null, dueDate: null, estimate: 1, parentId: null, subIssueIds: [], comments: [{ id: "ic5", authorId: "usr_003", content: "Docs were deprecated, closing.", createdAt: d(1) }], createdAt: d(5), updatedAt: d(1) },
  ],
  keylo: [
    { id: "KLO-1", title: "Shoot winter collection photography", description: "Coordinate product photography session for 48 new SKUs.", status: "done", priority: "urgent", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Design"], projectId: "kprj_01", milestoneId: "kms_01", dueDate: d(3), estimate: 8, parentId: null, subIssueIds: [], comments: [{ id: "kic1", authorId: "usr_001", content: "Photos approved, ready for listing.", createdAt: d(2) }], createdAt: d(14), updatedAt: d(2) },
    { id: "KLO-2", title: "Write product descriptions for all 48 SKUs", description: "SEO-optimised copy for Shopify & Amazon listings.", status: "in_progress", priority: "high", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Docs", "Feature"], projectId: "kprj_01", milestoneId: "kms_02", dueDate: fut(4), estimate: 5, parentId: null, subIssueIds: [], comments: [{ id: "kic2", authorId: "usr_003", content: "30 of 48 done.", createdAt: d(1) }], createdAt: d(7), updatedAt: d(1) },
    { id: "KLO-3", title: "Set up Amazon EU listings", description: "Upload new collection to Amazon Seller Central EU.", status: "todo", priority: "high", assigneeId: "usr_002", creatorId: "usr_001", labels: ["Feature"], projectId: "kprj_01", milestoneId: "kms_02", dueDate: fut(6), estimate: 3, parentId: null, subIssueIds: [], comments: [], createdAt: d(5), updatedAt: d(5) },
    { id: "KLO-4", title: "Schedule TikTok live streams", description: "Book 4 live stream sessions with top creators for launch week.", status: "in_progress", priority: "urgent", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Feature"], projectId: "kprj_02", milestoneId: "kms_05", dueDate: fut(2), estimate: 5, parentId: null, subIssueIds: [], comments: [{ id: "kic3", authorId: "usr_003", content: "2 creators confirmed, 2 pending.", createdAt: d(0, 15) }], createdAt: d(5), updatedAt: d(0, 15) },
    { id: "KLO-5", title: "Outreach to 20 micro-influencers", description: "DM campaign targeting fashion micro-influencers in EU.", status: "in_review", priority: "high", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Feature"], projectId: "kprj_02", milestoneId: "kms_04", dueDate: fut(1), estimate: 3, parentId: null, subIssueIds: [], comments: [{ id: "kic4", authorId: "usr_003", content: "18/20 responded positively. Sending samples next.", createdAt: d(0, 11) }], createdAt: d(6), updatedAt: d(0, 11) },
    { id: "KLO-6", title: "Negotiate WMS integration contract", description: "Review and sign new WMS integration contract with 3PL.", status: "todo", priority: "medium", assigneeId: "usr_001", creatorId: "usr_001", labels: ["Docs"], projectId: "kprj_03", milestoneId: "kms_07", dueDate: fut(15), estimate: 2, parentId: null, subIssueIds: [], comments: [], createdAt: d(4), updatedAt: d(4) },
    { id: "KLO-7", title: "Barcode & RFID tagging setup", description: "Implement barcode scanning at warehouse intake.", status: "backlog", priority: "medium", assigneeId: "usr_002", creatorId: "usr_002", labels: ["Feature"], projectId: "kprj_03", milestoneId: "kms_08", dueDate: fut(45), estimate: 8, parentId: null, subIssueIds: [], comments: [], createdAt: d(3), updatedAt: d(3) },
    { id: "KLO-8", title: "Fix Shopify checkout discount bug", description: "Stacking coupon codes is bypassing maximum discount rule.", status: "todo", priority: "urgent", assigneeId: "usr_002", creatorId: "usr_002", labels: ["Bug"], projectId: null, milestoneId: null, dueDate: fut(1), estimate: 2, parentId: null, subIssueIds: [], comments: [{ id: "kic5", authorId: "usr_001", content: "This is causing revenue leakage — urgent fix.", createdAt: d(0, 9) }], createdAt: d(2), updatedAt: d(0, 9) },
  ],
  redx: [
    { id: "RDX-1", title: "MaxImpact logo concepts (3 directions)", description: "Present 3 distinct logo directions for client feedback.", status: "done", priority: "high", assigneeId: "usr_004", creatorId: "usr_001", labels: ["Design"], projectId: "rprj_01", milestoneId: "rms_01", dueDate: d(2), estimate: 8, parentId: null, subIssueIds: [], comments: [{ id: "ric1", authorId: "usr_001", content: "Client loved direction 2, moving forward.", createdAt: d(1) }], createdAt: d(12), updatedAt: d(1) },
    { id: "RDX-2", title: "Develop full brand identity system", description: "Typography, color palette, iconography, grid system for MaxImpact.", status: "in_progress", priority: "high", assigneeId: "usr_004", creatorId: "usr_001", labels: ["Design"], projectId: "rprj_01", milestoneId: "rms_02", dueDate: fut(8), estimate: 13, parentId: null, subIssueIds: [], comments: [{ id: "ric2", authorId: "usr_004", content: "Color system done, working on typography.", createdAt: d(1) }], createdAt: d(8), updatedAt: d(1) },
    { id: "RDX-3", title: "Build BoostBrand Q1 ad creatives", description: "Produce 30 social ad variants for Meta and Google campaigns.", status: "in_progress", priority: "urgent", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Design", "Feature"], projectId: "rprj_02", milestoneId: "rms_05", dueDate: fut(3), estimate: 8, parentId: null, subIssueIds: [], comments: [{ id: "ric3", authorId: "usr_003", content: "22 of 30 variants completed.", createdAt: d(0, 16) }], createdAt: d(5), updatedAt: d(0, 16) },
    { id: "RDX-4", title: "Write XtremeDig campaign brief", description: "Document target audience, messaging, channels, KPIs for Q1.", status: "in_review", priority: "high", assigneeId: "usr_003", creatorId: "usr_002", labels: ["Docs"], projectId: "rprj_02", milestoneId: "rms_04", dueDate: fut(1), estimate: 3, parentId: null, subIssueIds: [], comments: [{ id: "ric4", authorId: "usr_002", content: "Brief is ready, client reviewing.", createdAt: d(0, 12) }], createdAt: d(4), updatedAt: d(0, 12) },
    { id: "RDX-5", title: "Create agency website sitemap", description: "Map out all pages and content hierarchy for new agency site.", status: "todo", priority: "medium", assigneeId: "usr_002", creatorId: "usr_001", labels: ["Docs", "Feature"], projectId: "rprj_03", milestoneId: "rms_07", dueDate: fut(20), estimate: 2, parentId: null, subIssueIds: [], comments: [], createdAt: d(3), updatedAt: d(3) },
    { id: "RDX-6", title: "Define case study template", description: "Standardise format for 8 case studies to feature on new website.", status: "backlog", priority: "low", assigneeId: null, creatorId: "usr_002", labels: ["Docs"], projectId: "rprj_03", milestoneId: "rms_07", dueDate: null, estimate: 2, parentId: null, subIssueIds: [], comments: [], createdAt: d(2), updatedAt: d(2) },
    { id: "RDX-7", title: "Fix video compression pipeline bug", description: "Client deliverable videos are exporting at wrong bitrate in batch mode.", status: "todo", priority: "urgent", assigneeId: "usr_002", creatorId: "usr_002", labels: ["Bug"], projectId: null, milestoneId: null, dueDate: fut(1), estimate: 3, parentId: null, subIssueIds: [], comments: [{ id: "ric5", authorId: "usr_001", content: "Holding up client delivery — fix ASAP.", createdAt: d(0, 10) }], createdAt: d(1), updatedAt: d(0, 10) },
    { id: "RDX-8", title: "Renew Adobe CC agency license", description: "Current license expires end of month. Renew with annual plan.", status: "backlog", priority: "medium", assigneeId: "usr_001", creatorId: "usr_001", labels: ["Improvement"], projectId: null, milestoneId: null, dueDate: fut(12), estimate: 1, parentId: null, subIssueIds: [], comments: [], createdAt: d(3), updatedAt: d(3) },
  ],
  trustme: [
    { id: "TME-1", title: "Complete GDPR data flow maps for TrustFin", description: "Map all personal data flows across TrustFin systems and third parties.", status: "done", priority: "high", assigneeId: "usr_002", creatorId: "usr_001", labels: ["Docs"], projectId: "tprj_01", milestoneId: "tms_01", dueDate: d(2), estimate: 8, parentId: null, subIssueIds: [], comments: [{ id: "tic1", authorId: "usr_001", content: "Approved by DPO. Ready for gap analysis.", createdAt: d(1) }], createdAt: d(14), updatedAt: d(1) },
    { id: "TME-2", title: "Identify GDPR gaps & risk ratings", description: "Cross-reference data flows against GDPR requirements and score each gap.", status: "in_progress", priority: "urgent", assigneeId: "usr_002", creatorId: "usr_001", labels: ["Improvement"], projectId: "tprj_01", milestoneId: "tms_02", dueDate: fut(5), estimate: 8, parentId: null, subIssueIds: ["TME-3"], comments: [{ id: "tic2", authorId: "usr_002", content: "14 of 22 items assessed.", createdAt: d(0, 15) }], createdAt: d(7), updatedAt: d(0, 15) },
    { id: "TME-3", title: "Prepare DPO report", description: "Executive summary of GDPR gaps for the Data Protection Officer.", status: "todo", priority: "high", assigneeId: "usr_002", creatorId: "usr_002", labels: ["Docs"], projectId: "tprj_01", milestoneId: "tms_03", dueDate: fut(8), estimate: 3, parentId: "TME-2", subIssueIds: [], comments: [], createdAt: d(5), updatedAt: d(5) },
    { id: "TME-4", title: "Set up ISMS documentation framework", description: "Establish ISO 27001 ISMS documentation structure for AuditPlus.", status: "in_progress", priority: "high", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Feature", "Docs"], projectId: "tprj_02", milestoneId: "tms_04", dueDate: fut(14), estimate: 5, parentId: null, subIssueIds: [], comments: [{ id: "tic3", authorId: "usr_003", content: "Scope statement and SoA template ready.", createdAt: d(1) }], createdAt: d(8), updatedAt: d(1) },
    { id: "TME-5", title: "Conduct ISO 27001 risk assessment", description: "Identify and assess information security risks for AuditPlus assets.", status: "todo", priority: "medium", assigneeId: "usr_003", creatorId: "usr_001", labels: ["Improvement"], projectId: "tprj_02", milestoneId: "tms_05", dueDate: fut(30), estimate: 13, parentId: null, subIssueIds: [], comments: [], createdAt: d(4), updatedAt: d(4) },
    { id: "TME-6", title: "Design KYC API integration spec", description: "Technical specification for SecureVerify's KYC platform API endpoints.", status: "todo", priority: "high", assigneeId: "usr_002", creatorId: "usr_001", labels: ["Docs", "Feature"], projectId: "tprj_03", milestoneId: "tms_07", dueDate: fut(20), estimate: 5, parentId: null, subIssueIds: [], comments: [], createdAt: d(3), updatedAt: d(3) },
    { id: "TME-7", title: "Draft AML policy update for TrustFin", description: "Revise AML policy to reflect new FATF recommendations.", status: "in_review", priority: "urgent", assigneeId: "usr_001", creatorId: "usr_001", labels: ["Docs"], projectId: null, milestoneId: null, dueDate: fut(2), estimate: 5, parentId: null, subIssueIds: [], comments: [{ id: "tic4", authorId: "usr_002", content: "Legal reviewed. Minor amendments needed.", createdAt: d(0, 13) }], createdAt: d(4), updatedAt: d(0, 13) },
    { id: "TME-8", title: "Set up Plaid sandbox for KYC testing", description: "Configure Plaid sandbox environment for open banking identity checks.", status: "backlog", priority: "medium", assigneeId: null, creatorId: "usr_002", labels: ["Feature"], projectId: "tprj_03", milestoneId: "tms_07", dueDate: null, estimate: 3, parentId: null, subIssueIds: [], comments: [], createdAt: d(2), updatedAt: d(2) },
  ],
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
export const INITIAL_PROJECTS: Project[] = SEED_PROJECTS.sosa;
export const INITIAL_ISSUES: Issue[] = SEED_ISSUES.sosa;

// Counter for new issue IDs
let issueCounter = 20;
export function generateIssueId(prefix: string = "ISS"): string {
  issueCounter++;
  return `${prefix}-${issueCounter}`;
}
