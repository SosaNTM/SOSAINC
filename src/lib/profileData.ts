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

export const MOCK_NOTES: ProfileNote[] = [];

// ── CV Documents ──
export interface CvDocument {
  id: string;
  userId: string;
  fileName: string;
  sizeMb: number;
  uploadedAt: Date;
  current: boolean;
}

export const MOCK_CVS: CvDocument[] = [];

// ── Fiscal Data ──
export interface FiscalData {
  userId: string;
  codiceFiscale: string;
  piva: string;
  iban: string;
  taxRegime: string;
  documents: { name: string; sizeMb: number }[];
}

export const MOCK_FISCAL: FiscalData[] = [];

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

export const MOCK_GOALS: Goal[] = [];

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

export const MOCK_PROFILE_TASKS: ProfileTask[] = [];
