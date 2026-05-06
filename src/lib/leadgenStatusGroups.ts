import type { OutreachStatus } from "@/types/leadgen";

export type DashboardGroup = "uncontacted" | "contacted" | "in_progress" | "completed" | "archived";
export type DashboardPeriod = "all" | "week" | "month" | "quarter";

export const STATUS_TO_GROUP: Record<OutreachStatus, DashboardGroup> = {
  new:       "uncontacted",
  contacted: "contacted",
  replied:   "in_progress",
  qualified: "in_progress",
  converted: "completed",
  rejected:  "archived",
};

export const GROUP_LABELS: Record<DashboardGroup, string> = {
  uncontacted: "Non contattato",
  contacted:   "Contattato",
  in_progress: "In corso",
  completed:   "Completato",
  archived:    "Archiviato",
};

export const GROUP_TO_STATUSES: Record<DashboardGroup, OutreachStatus[]> = {
  uncontacted: ["new"],
  contacted:   ["contacted"],
  in_progress: ["replied", "qualified"],
  completed:   ["converted"],
  archived:    ["rejected"],
};

export const GROUP_COLOR: Record<DashboardGroup, string> = {
  uncontacted: "var(--text-tertiary)",
  contacted:   "var(--color-info)",
  in_progress: "var(--accent-primary)",
  completed:   "var(--color-success)",
  archived:    "var(--text-tertiary)",
};

export const ACTIVE_STATUSES: OutreachStatus[] = ["new", "contacted", "replied", "qualified", "converted"];

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  all:     "Tutti",
  week:    "Questa settimana",
  month:   "Questo mese",
  quarter: "Questo trimestre",
};
