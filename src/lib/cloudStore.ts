export type PermissionLevel = "read" | "write" | "admin";

export interface FolderPermission {
  userId: string;
  level: PermissionLevel;
}

export interface CloudFolder {
  id: string;
  name: string;
  parentId: string | null;
  permissions: FolderPermission[];
  inheritPermissions: boolean;
  createdAt: Date;
  isDeleted?: boolean;
  // Password protection
  isLocked?: boolean;
  passwordHash?: string | null;
  passwordSetBy?: string | null;
  passwordSetAt?: Date | null;
  lockAutoTimeoutMinutes?: number;
  failedAttempts?: number;
  lockedUntil?: Date | null;
}

// Mock passwords (in real app these would be server-side hashes)
export const MOCK_FOLDER_PASSWORDS: Record<string, string> = {
  f_root_finance: "finance2025",
  f_root_hr: "hr_secret",
};

export interface CloudFile {
  id: string;
  name: string;
  folderId: string;
  size: number;
  type: "pdf" | "docx" | "xlsx" | "image" | "zip" | "pptx" | "other";
  ownerId: string;
  modifiedAt: Date;
  createdAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  originalFolderId: string | null;
  originalFolderPath: string | null;
  permanentDeleteAt: Date | null;
  // Enhanced metadata
  description?: string | null;
  mimeType?: string;
  extension?: string;
  uploadedBy?: string;
  lastModifiedBy?: string | null;
  dimensions?: { width: number; height: number };
  duration?: number;
  sheetNames?: string[];
  pageCount?: number;
  sectionId?: string | null;
}

export interface FolderSection {
  id: string;
  folderId: string;
  name: string;
  sortOrder: number;
  isCollapsed: boolean;
  createdBy: string;
  createdAt: Date;
}

function d(daysAgo: number, h = 10): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(h, 0, 0, 0);
  return dt;
}

export const INITIAL_FOLDERS: CloudFolder[] = [
  { id: "f_root_projects", name: "Projects", parentId: null, permissions: [{ userId: "usr_001", level: "admin" }, { userId: "usr_002", level: "admin" }, { userId: "usr_003", level: "write" }, { userId: "usr_004", level: "write" }], inheritPermissions: false, createdAt: d(60) },
  { id: "f_client_a", name: "Client A", parentId: "f_root_projects", permissions: [], inheritPermissions: true, createdAt: d(45) },
  { id: "f_internal", name: "Internal", parentId: "f_root_projects", permissions: [], inheritPermissions: true, createdAt: d(40) },
  { id: "f_root_marketing", name: "Marketing", parentId: null, permissions: [{ userId: "usr_001", level: "admin" }, { userId: "usr_002", level: "write" }, { userId: "usr_003", level: "admin" }, { userId: "usr_004", level: "write" }], inheritPermissions: false, createdAt: d(50) },
  { id: "f_root_finance", name: "Finance", parentId: null, permissions: [{ userId: "usr_001", level: "admin" }, { userId: "usr_002", level: "admin" }, { userId: "usr_003", level: "read" }, { userId: "usr_004", level: "read" }], inheritPermissions: false, createdAt: d(55), isLocked: true, passwordHash: "finance2025", passwordSetBy: "usr_001", passwordSetAt: d(14), lockAutoTimeoutMinutes: 30, failedAttempts: 0, lockedUntil: null },
  { id: "f_root_hr", name: "HR & Legal", parentId: null, permissions: [{ userId: "usr_001", level: "admin" }, { userId: "usr_002", level: "admin" }, { userId: "usr_003", level: "read" }, { userId: "usr_004", level: "read" }], inheritPermissions: false, createdAt: d(50), isLocked: true, passwordHash: "hr_secret", passwordSetBy: "usr_001", passwordSetAt: d(14), lockAutoTimeoutMinutes: 15, failedAttempts: 0, lockedUntil: null },
  { id: "f_root_templates", name: "Templates", parentId: null, permissions: [{ userId: "usr_001", level: "admin" }, { userId: "usr_002", level: "write" }, { userId: "usr_003", level: "read" }, { userId: "usr_004", level: "read" }], inheritPermissions: false, createdAt: d(58) },
  { id: "f_root_archive", name: "Archive", parentId: null, permissions: [{ userId: "usr_001", level: "admin" }, { userId: "usr_002", level: "admin" }, { userId: "usr_003", level: "read" }, { userId: "usr_004", level: "read" }], inheritPermissions: false, createdAt: d(90) },
];

const fileBase = { isDeleted: false, deletedAt: null, deletedBy: null, originalFolderId: null, originalFolderPath: null, permanentDeleteAt: null };

export const INITIAL_FILES: CloudFile[] = [
  // Projects root
  { id: "cf_01", name: "Project_Overview.pdf", folderId: "f_root_projects", size: 1200000, type: "pdf", ownerId: "usr_001", modifiedAt: d(2), createdAt: d(30), ...fileBase, description: "General project overview document covering scope and milestones", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_001", lastModifiedBy: "usr_002", pageCount: 12 },
  { id: "cf_02", name: "Timeline_Q1.xlsx", folderId: "f_root_projects", size: 890000, type: "xlsx", ownerId: "usr_002", modifiedAt: d(3), createdAt: d(25), ...fileBase, description: "Q1 project timeline with Gantt chart", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_002", lastModifiedBy: "usr_002", sheetNames: ["Timeline", "Resources", "Budget"] },
  { id: "cf_03", name: "Meeting_Notes_Jan.docx", folderId: "f_root_projects", size: 245000, type: "docx", ownerId: "usr_001", modifiedAt: d(5), createdAt: d(20), ...fileBase, description: "January all-hands meeting notes", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_001", lastModifiedBy: null },
  { id: "cf_04", name: "Resources.zip", folderId: "f_root_projects", size: 8500000, type: "zip", ownerId: "usr_002", modifiedAt: d(7), createdAt: d(15), ...fileBase, description: "Bundled project resources and assets", mimeType: "application/zip", extension: "zip", uploadedBy: "usr_002", lastModifiedBy: null },
  { id: "cf_05", name: "Kickoff_Deck.pptx", folderId: "f_root_projects", size: 3400000, type: "pptx", ownerId: "usr_001", modifiedAt: d(1), createdAt: d(10), ...fileBase, description: "Project kickoff presentation deck", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: "pptx", uploadedBy: "usr_001", lastModifiedBy: "usr_003" },
  // Client A
  { id: "cf_06", name: "Proposal_v3.pdf", folderId: "f_client_a", size: 2100000, type: "pdf", ownerId: "usr_002", modifiedAt: d(0, 14), createdAt: d(8), ...fileBase, description: "Final client proposal v3", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_002", lastModifiedBy: "usr_001", pageCount: 24, sectionId: "sec_contracts_1" },
  { id: "cf_07", name: "Deliverables_Checklist.xlsx", folderId: "f_client_a", size: 420000, type: "xlsx", ownerId: "usr_001", modifiedAt: d(1), createdAt: d(6), ...fileBase, description: "Deliverables tracking checklist", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_001", lastModifiedBy: "usr_001", sheetNames: ["Deliverables"], sectionId: "sec_deliverables_1" },
  { id: "cf_08", name: "Client_Logo.png", folderId: "f_client_a", size: 1800000, type: "image", ownerId: "usr_004", modifiedAt: d(4), createdAt: d(12), ...fileBase, description: "Official client logo - high resolution", mimeType: "image/png", extension: "png", uploadedBy: "usr_004", lastModifiedBy: null, dimensions: { width: 1920, height: 1080 }, sectionId: "sec_deliverables_1" },
  // Extra Client A files for sections
  { id: "cf_ca_01", name: "NDA_Signed.pdf", folderId: "f_client_a", size: 540000, type: "pdf", ownerId: "usr_001", modifiedAt: d(6), createdAt: d(15), ...fileBase, description: "Signed NDA with Client A", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_001", lastModifiedBy: null, pageCount: 2, sectionId: "sec_contracts_1" },
  { id: "cf_ca_02", name: "Amendment_v2.pdf", folderId: "f_client_a", size: 890000, type: "pdf", ownerId: "usr_002", modifiedAt: d(3), createdAt: d(10), ...fileBase, description: "Contract amendment v2", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_002", lastModifiedBy: null, pageCount: 5, sectionId: "sec_contracts_1" },
  { id: "cf_ca_03", name: "Final_Report.pdf", folderId: "f_client_a", size: 2400000, type: "pdf", ownerId: "usr_001", modifiedAt: d(1), createdAt: d(5), ...fileBase, description: "Final project report", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_001", lastModifiedBy: "usr_002", pageCount: 18, sectionId: "sec_deliverables_1" },
  { id: "cf_ca_04", name: "Kickoff_Email.docx", folderId: "f_client_a", size: 120000, type: "docx", ownerId: "usr_003", modifiedAt: d(8), createdAt: d(20), ...fileBase, description: "Initial kickoff email thread", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_003", lastModifiedBy: null, sectionId: "sec_comms_1" },
  { id: "cf_ca_05", name: "Status_Update_Feb.docx", folderId: "f_client_a", size: 95000, type: "docx", ownerId: "usr_003", modifiedAt: d(2), createdAt: d(4), ...fileBase, description: "February status update", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_003", lastModifiedBy: null, sectionId: "sec_comms_1" },
  { id: "cf_ca_06", name: "README.txt", folderId: "f_client_a", size: 4000, type: "other", ownerId: "usr_001", modifiedAt: d(15), createdAt: d(30), ...fileBase, description: null, mimeType: "text/plain", extension: "txt", uploadedBy: "usr_001", lastModifiedBy: null },
  { id: "cf_ca_07", name: "Budget_Draft.xlsx", folderId: "f_client_a", size: 890000, type: "xlsx", ownerId: "usr_002", modifiedAt: d(5), createdAt: d(12), ...fileBase, description: null, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_002", lastModifiedBy: null, sheetNames: ["Budget"] },
  // Internal
  { id: "cf_09", name: "Architecture_Diagram.pdf", folderId: "f_internal", size: 3200000, type: "pdf", ownerId: "usr_002", modifiedAt: d(2), createdAt: d(14), ...fileBase, description: "System architecture diagram", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_002", lastModifiedBy: "usr_002", pageCount: 1 },
  { id: "cf_10", name: "Sprint_Backlog.xlsx", folderId: "f_internal", size: 560000, type: "xlsx", ownerId: "usr_002", modifiedAt: d(0, 9), createdAt: d(5), ...fileBase, description: "Current sprint backlog and task assignments", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_002", lastModifiedBy: "usr_002", sheetNames: ["Backlog", "Done"] },
  // Marketing
  { id: "cf_11", name: "Campaign_Brief.docx", folderId: "f_root_marketing", size: 540000, type: "docx", ownerId: "usr_003", modifiedAt: d(1), createdAt: d(10), ...fileBase, description: "Q1 marketing campaign brief", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_003", lastModifiedBy: null, sectionId: "sec_campaigns_1" },
  { id: "cf_12", name: "Social_Calendar.xlsx", folderId: "f_root_marketing", size: 780000, type: "xlsx", ownerId: "usr_003", modifiedAt: d(0, 11), createdAt: d(8), ...fileBase, description: "Social media content calendar", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_003", lastModifiedBy: "usr_003", sheetNames: ["Calendar"], sectionId: "sec_campaigns_1" },
  { id: "cf_13", name: "Brand_Assets.zip", folderId: "f_root_marketing", size: 12000000, type: "zip", ownerId: "usr_004", modifiedAt: d(3), createdAt: d(20), ...fileBase, description: "Complete brand asset package", mimeType: "application/zip", extension: "zip", uploadedBy: "usr_004", lastModifiedBy: null, sectionId: "sec_brand_1" },
  { id: "cf_14", name: "Landing_Mockup.png", folderId: "f_root_marketing", size: 4200000, type: "image", ownerId: "usr_004", modifiedAt: d(2), createdAt: d(6), ...fileBase, description: "Landing page mockup design", mimeType: "image/png", extension: "png", uploadedBy: "usr_004", lastModifiedBy: "usr_003", dimensions: { width: 1440, height: 900 }, sectionId: "sec_brand_1" },
  // Finance
  { id: "cf_15", name: "Q4_Financial_Report.xlsx", folderId: "f_root_finance", size: 1800000, type: "xlsx", ownerId: "usr_001", modifiedAt: d(1), createdAt: d(30), ...fileBase, description: "Q4 financial report with P&L and balance sheet", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_001", lastModifiedBy: "usr_001", sheetNames: ["P&L", "Balance Sheet", "Cash Flow"] },
  { id: "cf_16", name: "Invoice_Template.docx", folderId: "f_root_finance", size: 320000, type: "docx", ownerId: "usr_002", modifiedAt: d(5), createdAt: d(40), ...fileBase, description: "Standard invoice template", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_002", lastModifiedBy: null },
  { id: "cf_17", name: "Budget_2025.xlsx", folderId: "f_root_finance", size: 2400000, type: "xlsx", ownerId: "usr_001", modifiedAt: d(0, 8), createdAt: d(15), ...fileBase, description: "Annual budget plan for 2025", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_001", lastModifiedBy: "usr_002", sheetNames: ["Overview", "Departments"] },
  { id: "cf_18", name: "Tax_Summary.pdf", folderId: "f_root_finance", size: 980000, type: "pdf", ownerId: "usr_001", modifiedAt: d(4), createdAt: d(22), ...fileBase, description: "Annual tax summary document", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_001", lastModifiedBy: null, pageCount: 8 },
  { id: "cf_19", name: "Expense_Report_Feb.pdf", folderId: "f_root_finance", size: 1500000, type: "pdf", ownerId: "usr_002", modifiedAt: d(2), createdAt: d(5), ...fileBase, description: "February expense report", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_002", lastModifiedBy: null, pageCount: 3 },
  { id: "cf_20", name: "Payroll_Jan.xlsx", folderId: "f_root_finance", size: 670000, type: "xlsx", ownerId: "usr_001", modifiedAt: d(8), createdAt: d(35), ...fileBase, description: null, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_001", lastModifiedBy: null, sheetNames: ["January"] },
  // HR & Legal
  { id: "cf_21", name: "Employee_Handbook.pdf", folderId: "f_root_hr", size: 4500000, type: "pdf", ownerId: "usr_001", modifiedAt: d(10), createdAt: d(60), ...fileBase, description: "Company employee handbook - latest version", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_001", lastModifiedBy: "usr_001", pageCount: 45 },
  { id: "cf_22", name: "NDA_Template.docx", folderId: "f_root_hr", size: 180000, type: "docx", ownerId: "usr_002", modifiedAt: d(15), createdAt: d(50), ...fileBase, description: "Non-disclosure agreement template", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_002", lastModifiedBy: null },
  { id: "cf_23", name: "Benefits_Overview.pptx", folderId: "f_root_hr", size: 2800000, type: "pptx", ownerId: "usr_001", modifiedAt: d(6), createdAt: d(25), ...fileBase, description: "Employee benefits overview presentation", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: "pptx", uploadedBy: "usr_001", lastModifiedBy: null },
  // Templates
  { id: "cf_24", name: "Project_Proposal_Template.docx", folderId: "f_root_templates", size: 290000, type: "docx", ownerId: "usr_001", modifiedAt: d(20), createdAt: d(55), ...fileBase, description: "Standard project proposal template", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_001", lastModifiedBy: null },
  { id: "cf_25", name: "Financial_Model_Template.xlsx", folderId: "f_root_templates", size: 1100000, type: "xlsx", ownerId: "usr_001", modifiedAt: d(12), createdAt: d(45), ...fileBase, description: "Financial modelling template with projections", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", uploadedBy: "usr_001", lastModifiedBy: null, sheetNames: ["Model", "Assumptions", "Projections"] },
  { id: "cf_26", name: "Presentation_Template.pptx", folderId: "f_root_templates", size: 5200000, type: "pptx", ownerId: "usr_004", modifiedAt: d(8), createdAt: d(30), ...fileBase, description: "Company branded presentation template", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: "pptx", uploadedBy: "usr_004", lastModifiedBy: null },
  { id: "cf_27", name: "Report_Template.docx", folderId: "f_root_templates", size: 340000, type: "docx", ownerId: "usr_001", modifiedAt: d(18), createdAt: d(50), ...fileBase, description: null, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_001", lastModifiedBy: null },
  // Archive
  { id: "cf_28", name: "Old_Website_Assets.zip", folderId: "f_root_archive", size: 45000000, type: "zip", ownerId: "usr_004", modifiedAt: d(60), createdAt: d(90), ...fileBase, description: null, mimeType: "application/zip", extension: "zip", uploadedBy: "usr_004", lastModifiedBy: null },
  { id: "cf_29", name: "2023_Annual_Report.pdf", folderId: "f_root_archive", size: 8900000, type: "pdf", ownerId: "usr_001", modifiedAt: d(45), createdAt: d(80), ...fileBase, description: "2023 company annual report", mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_001", lastModifiedBy: null, pageCount: 32 },
  { id: "cf_30", name: "Legacy_Contracts.zip", folderId: "f_root_archive", size: 22000000, type: "zip", ownerId: "usr_002", modifiedAt: d(50), createdAt: d(85), ...fileBase, description: null, mimeType: "application/zip", extension: "zip", uploadedBy: "usr_002", lastModifiedBy: null },
  { id: "cf_31", name: "Product_v1_Specs.pdf", folderId: "f_root_archive", size: 1200000, type: "pdf", ownerId: "usr_001", modifiedAt: d(70), createdAt: d(88), ...fileBase, description: null, mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_001", lastModifiedBy: null, pageCount: 6 },
  { id: "cf_32", name: "Old_Marketing_Plan.docx", folderId: "f_root_archive", size: 680000, type: "docx", ownerId: "usr_003", modifiedAt: d(55), createdAt: d(82), ...fileBase, description: null, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", uploadedBy: "usr_003", lastModifiedBy: null },
  { id: "cf_33", name: "Archived_Invoices.zip", folderId: "f_root_archive", size: 15000000, type: "zip", ownerId: "usr_002", modifiedAt: d(40), createdAt: d(75), ...fileBase, description: null, mimeType: "application/zip", extension: "zip", uploadedBy: "usr_002", lastModifiedBy: null },
  { id: "cf_34", name: "Team_Photos_2023.zip", folderId: "f_root_archive", size: 32000000, type: "zip", ownerId: "usr_004", modifiedAt: d(65), createdAt: d(70), ...fileBase, description: null, mimeType: "application/zip", extension: "zip", uploadedBy: "usr_004", lastModifiedBy: null },
  { id: "cf_35", name: "Deprecated_Docs.pdf", folderId: "f_root_archive", size: 2300000, type: "pdf", ownerId: "usr_001", modifiedAt: d(58), createdAt: d(78), ...fileBase, description: null, mimeType: "application/pdf", extension: "pdf", uploadedBy: "usr_001", lastModifiedBy: null, pageCount: 15 },

  // Trash items
  { id: "cf_t1", name: "Old_Proposal_v1.pdf", folderId: "trash", size: 890000, type: "pdf", ownerId: "usr_002", modifiedAt: d(10), createdAt: d(30),
    isDeleted: true, deletedAt: d(3), deletedBy: "usr_002", originalFolderId: "f_client_a", originalFolderPath: "Projects > Client A", permanentDeleteAt: (() => { const dt = d(3); dt.setDate(dt.getDate() + 60); return dt; })() },
  { id: "cf_t2", name: "Budget_Draft.xlsx", folderId: "trash", size: 1200000, type: "xlsx", ownerId: "usr_001", modifiedAt: d(14), createdAt: d(40),
    isDeleted: true, deletedAt: d(7), deletedBy: "usr_001", originalFolderId: "f_root_finance", originalFolderPath: "Finance", permanentDeleteAt: (() => { const dt = d(7); dt.setDate(dt.getDate() + 60); return dt; })() },
  { id: "cf_t3", name: "Old_Logo.png", folderId: "trash", size: 3400000, type: "image", ownerId: "usr_004", modifiedAt: d(50), createdAt: d(60),
    isDeleted: true, deletedAt: d(45), deletedBy: "usr_003", originalFolderId: "f_root_marketing", originalFolderPath: "Marketing", permanentDeleteAt: (() => { const dt = d(45); dt.setDate(dt.getDate() + 60); return dt; })() },
  { id: "cf_t4", name: "Draft_Notes.docx", folderId: "trash", size: 120000, type: "docx", ownerId: "usr_001", modifiedAt: d(60), createdAt: d(70),
    isDeleted: true, deletedAt: d(58), deletedBy: "usr_004", originalFolderId: "f_root_hr", originalFolderPath: "HR & Legal", permanentDeleteAt: (() => { const dt = d(58); dt.setDate(dt.getDate() + 60); return dt; })() },
];

export const INITIAL_SECTIONS: FolderSection[] = [
  // Client A sections
  { id: "sec_contracts_1", folderId: "f_client_a", name: "Contracts", sortOrder: 0, isCollapsed: false, createdBy: "usr_001", createdAt: d(40) },
  { id: "sec_deliverables_1", folderId: "f_client_a", name: "Deliverables", sortOrder: 1, isCollapsed: false, createdBy: "usr_001", createdAt: d(38) },
  { id: "sec_comms_1", folderId: "f_client_a", name: "Communications", sortOrder: 2, isCollapsed: true, createdBy: "usr_003", createdAt: d(35) },
  // Marketing sections
  { id: "sec_campaigns_1", folderId: "f_root_marketing", name: "Campaigns", sortOrder: 0, isCollapsed: false, createdBy: "usr_003", createdAt: d(45) },
  { id: "sec_brand_1", folderId: "f_root_marketing", name: "Brand Assets", sortOrder: 1, isCollapsed: false, createdBy: "usr_004", createdAt: d(42) },
];

export const TOTAL_STORAGE_GB = 10;
export const USED_STORAGE_GB = 4.2;

export function getFileTypeIcon(type: CloudFile["type"]): { emoji: string; color: string } {
  switch (type) {
    case "pdf": return { emoji: "📄", color: "#ef4444" };
    case "docx": return { emoji: "📝", color: "#3b82f6" };
    case "xlsx": return { emoji: "📊", color: "#22c55e" };
    case "image": return { emoji: "🖼️", color: "#a855f7" };
    case "zip": return { emoji: "📦", color: "#f59e0b" };
    case "pptx": return { emoji: "📑", color: "#f97316" };
    default: return { emoji: "📎", color: "#6b7280" };
  }
}

export function getFileTypeLabel(type: CloudFile["type"]): string {
  switch (type) {
    case "pdf": return "PDF Document";
    case "docx": return "Word Document";
    case "xlsx": return "Spreadsheet";
    case "image": return "Image";
    case "zip": return "Archive";
    case "pptx": return "Presentation";
    default: return "File";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getUserPermission(
  folderId: string,
  userId: string,
  userRole: string,
  folders: CloudFolder[]
): PermissionLevel | null {
  if (userRole === "owner") return "admin";

  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return null;

  if (!folder.inheritPermissions || !folder.parentId) {
    const perm = folder.permissions.find((p) => p.userId === userId);
    return perm?.level || null;
  }

  return getUserPermission(folder.parentId, userId, userRole, folders);
}

export function getFolderPath(folderId: string, folders: CloudFolder[]): string {
  const segments: string[] = [];
  let cur: string | null = folderId;
  while (cur) {
    const f = folders.find((x) => x.id === cur);
    if (!f) break;
    segments.unshift(f.name);
    cur = f.parentId;
  }
  return segments.join(" > ");
}

export function daysUntilPermanentDelete(file: CloudFile): number {
  if (!file.permanentDeleteAt) return 60;
  const diff = file.permanentDeleteAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getCountdownSeverity(days: number): "normal" | "warning" | "critical" {
  if (days <= 14) return "critical";
  if (days <= 30) return "warning";
  return "normal";
}
