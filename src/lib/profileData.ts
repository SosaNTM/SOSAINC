import type { Role } from "./permissions";

// ── Profile Notes ──
export interface ProfileNote {
  id: string;
  userId: string;
  title: string;
  preview: string;
  tags: string[];
  pinned: boolean;
  createdAt: Date;
}

export const MOCK_NOTES: ProfileNote[] = [
  { id: "n1", userId: "usr_001", title: "Meeting Notes - Feb 24", preview: "Attendees, agenda, action items for the quarterly review...", tags: ["meeting"], pinned: true, createdAt: new Date("2025-02-24T10:00:00") },
  { id: "n2", userId: "usr_001", title: "Product Roadmap Q2", preview: "Features and milestones for next quarter launch...", tags: ["product"], pinned: false, createdAt: new Date("2025-02-23T14:00:00") },
  { id: "n3", userId: "usr_001", title: "Hiring Plan 2025", preview: "Key roles to fill: frontend dev, marketing lead...", tags: ["hr", "planning"], pinned: false, createdAt: new Date("2025-02-20T09:00:00") },
  { id: "n4", userId: "usr_002", title: "Ops Checklist - March", preview: "Server migration, vendor onboarding, compliance review...", tags: ["ops"], pinned: true, createdAt: new Date("2025-02-22T08:00:00") },
  { id: "n5", userId: "usr_002", title: "Team Feedback Summary", preview: "Collected 1:1 feedback from all direct reports...", tags: ["meeting", "hr"], pinned: false, createdAt: new Date("2025-02-18T16:00:00") },
  { id: "n6", userId: "usr_003", title: "Campaign Ideas Q2", preview: "Social media push, influencer partnerships, SEO audit...", tags: ["marketing"], pinned: true, createdAt: new Date("2025-02-21T11:00:00") },
  { id: "n7", userId: "usr_003", title: "Competitor Analysis", preview: "Benchmarking pricing and features against top 3 competitors...", tags: ["research"], pinned: false, createdAt: new Date("2025-02-19T13:00:00") },
  { id: "n8", userId: "usr_004", title: "Design System Updates", preview: "New component variants, color palette refinements...", tags: ["design"], pinned: true, createdAt: new Date("2025-02-23T10:00:00") },
  { id: "n9", userId: "usr_004", title: "Branding Exploration", preview: "Mood boards and typography options for rebrand...", tags: ["design", "branding"], pinned: false, createdAt: new Date("2025-02-17T15:00:00") },
];

// ── CV Documents ──
export interface CvDocument {
  id: string;
  userId: string;
  fileName: string;
  sizeMb: number;
  uploadedAt: Date;
  current: boolean;
}

export const MOCK_CVS: CvDocument[] = [
  { id: "cv1", userId: "usr_001", fileName: "Alessandro_Rossi_CV_2025.pdf", sizeMb: 2.4, uploadedAt: new Date("2025-02-15"), current: true },
  { id: "cv2", userId: "usr_001", fileName: "CV_2024_v2.pdf", sizeMb: 1.8, uploadedAt: new Date("2024-12-01"), current: false },
  { id: "cv3", userId: "usr_002", fileName: "Marco_Bianchi_CV_2025.pdf", sizeMb: 1.9, uploadedAt: new Date("2025-01-20"), current: true },
  { id: "cv4", userId: "usr_003", fileName: "Sara_Verdi_CV_2025.pdf", sizeMb: 2.1, uploadedAt: new Date("2025-02-01"), current: true },
  { id: "cv5", userId: "usr_003", fileName: "Sara_Verdi_CV_2024.pdf", sizeMb: 1.6, uploadedAt: new Date("2024-06-15"), current: false },
  { id: "cv6", userId: "usr_004", fileName: "Elena_Neri_CV_2025.pdf", sizeMb: 3.2, uploadedAt: new Date("2025-02-10"), current: true },
];

// ── Fiscal Data ──
export interface FiscalData {
  userId: string;
  codiceFiscale: string;
  piva: string;
  iban: string;
  taxRegime: string;
  documents: { name: string; sizeMb: number }[];
}

export const MOCK_FISCAL: FiscalData[] = [
  { userId: "usr_001", codiceFiscale: "RSSLSN85M01H501Z", piva: "IT12345678901", iban: "IT60X0542811101000000123456", taxRegime: "Regime Ordinario", documents: [{ name: "CU_2024.pdf", sizeMb: 1.1 }, { name: "Dichiarazione_2024.pdf", sizeMb: 3.2 }] },
  { userId: "usr_002", codiceFiscale: "BNCMRC90A15F205X", piva: "IT98765432101", iban: "IT28W0300203280123456789012", taxRegime: "Regime Ordinario", documents: [{ name: "CU_2024.pdf", sizeMb: 0.9 }] },
  { userId: "usr_003", codiceFiscale: "VRDSR95D55H501L", piva: "", iban: "IT40S0760111600001234567890", taxRegime: "Regime Forfettario", documents: [] },
  { userId: "usr_004", codiceFiscale: "NRELEN92R41A662K", piva: "", iban: "IT15T0300203280987654321098", taxRegime: "Regime Forfettario", documents: [{ name: "CU_2024.pdf", sizeMb: 1.0 }] },
];

// ── Goals ──
export interface Goal {
  id: string;
  userId: string;
  title: string;
  progress: number; // 0-100
  target?: string;
  current?: string;
  dueDate: Date;
  setBy: string; // userId
  quarter: string;
  completed: boolean;
}

export const MOCK_GOALS: Goal[] = [
  { id: "g1", userId: "usr_001", title: "Close 5 new client deals", progress: 60, target: "5", current: "3", dueDate: new Date("2025-03-31"), setBy: "usr_001", quarter: "Q1 2025", completed: false },
  { id: "g2", userId: "usr_001", title: "Launch new product landing", progress: 100, dueDate: new Date("2025-02-28"), setBy: "usr_001", quarter: "Q1 2025", completed: true },
  { id: "g3", userId: "usr_002", title: "Reduce operational costs by 10%", progress: 45, dueDate: new Date("2025-03-31"), setBy: "usr_001", quarter: "Q1 2025", completed: false },
  { id: "g4", userId: "usr_002", title: "Onboard 2 new vendors", progress: 100, target: "2", current: "2", dueDate: new Date("2025-02-15"), setBy: "usr_001", quarter: "Q1 2025", completed: true },
  { id: "g5", userId: "usr_003", title: "Grow social media followers by 25%", progress: 72, dueDate: new Date("2025-03-31"), setBy: "usr_001", quarter: "Q1 2025", completed: false },
  { id: "g6", userId: "usr_003", title: "Publish 12 blog posts", progress: 58, target: "12", current: "7", dueDate: new Date("2025-03-31"), setBy: "usr_001", quarter: "Q1 2025", completed: false },
  { id: "g7", userId: "usr_004", title: "Complete design system v2", progress: 80, dueDate: new Date("2025-03-31"), setBy: "usr_001", quarter: "Q1 2025", completed: false },
  { id: "g8", userId: "usr_004", title: "Redesign onboarding flow", progress: 100, dueDate: new Date("2025-02-20"), setBy: "usr_001", quarter: "Q1 2025", completed: true },
];

// ── Profile Tasks (mock for profile tab) ──
export interface ProfileTask {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  dueDate: Date;
  assigneeId: string;
  creatorId: string;
}

export const MOCK_PROFILE_TASKS: ProfileTask[] = [
  { id: "pt1", title: "Update website hero section", priority: "high", status: "todo", dueDate: new Date("2025-02-28"), assigneeId: "usr_004", creatorId: "usr_002" },
  { id: "pt2", title: "Review client contract", priority: "medium", status: "in_progress", dueDate: new Date("2025-03-05"), assigneeId: "usr_001", creatorId: "usr_002" },
  { id: "pt3", title: "Prepare Q1 report", priority: "high", status: "todo", dueDate: new Date("2025-03-10"), assigneeId: "usr_002", creatorId: "usr_001" },
  { id: "pt4", title: "Order office supplies", priority: "low", status: "todo", dueDate: new Date("2025-03-10"), assigneeId: "usr_003", creatorId: "usr_001" },
  { id: "pt5", title: "Design email template", priority: "medium", status: "done", dueDate: new Date("2025-02-20"), assigneeId: "usr_004", creatorId: "usr_003" },
  { id: "pt6", title: "Social media calendar", priority: "medium", status: "in_progress", dueDate: new Date("2025-03-01"), assigneeId: "usr_003", creatorId: "usr_002" },
  { id: "pt7", title: "Vendor negotiation prep", priority: "high", status: "todo", dueDate: new Date("2025-03-03"), assigneeId: "usr_002", creatorId: "usr_001" },
  { id: "pt8", title: "Brand guidelines update", priority: "low", status: "in_progress", dueDate: new Date("2025-03-15"), assigneeId: "usr_004", creatorId: "usr_001" },
  { id: "pt9", title: "Write campaign brief", priority: "medium", status: "todo", dueDate: new Date("2025-03-07"), assigneeId: "usr_003", creatorId: "usr_001" },
  { id: "pt10", title: "Server migration plan", priority: "high", status: "in_progress", dueDate: new Date("2025-03-12"), assigneeId: "usr_002", creatorId: "usr_001" },
];
