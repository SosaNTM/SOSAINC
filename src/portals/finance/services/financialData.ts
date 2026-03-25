// ── Single source of truth for personal finance data ─────────────────────────
//
// Both Dashboard.tsx and Overview.tsx import from here.
// All numbers derive from the same base so they are always consistent.

// ── Current snapshot ──────────────────────────────────────────────────────────

export const SNAPSHOT = {
  cash:            0,
  investments:     0,
  debt:            0,
  monthlyIncome:   0,
  monthlyExpenses: 0,
} as const;

export const ASSETS       = 0;
export const NET_WORTH    = 0;
export const SAVINGS_RATE = 0;

// ── Monthly history ───────────────────────────────────────────────────────────
// Net worth = cash + investments - debt (verify each row).

export interface MonthData {
  key: string;        // "2026-03" — used for period filtering
  label: string;      // "Mar 26"  — used on chart axes
  income: number;
  expenses: number;
  cash: number;
  investments: number;
  debt: number;
}

export function monthNetWorth(m: MonthData): number {
  return m.cash + m.investments - m.debt;
}

export const MONTHLY_HISTORY: MonthData[] = [];

// ── Balance trend slices (for Dashboard sparkline) ────────────────────────────

export type DashboardPeriod = "1d" | "7d" | "1m" | "3m" | "1y" | "all";

const nw = (m: MonthData) => ({ label: m.label, balance: monthNetWorth(m) });

export const BALANCE_TRENDS: Record<DashboardPeriod, { label: string; balance: number }[]> = {
  "1d":  [],
  "7d":  [],
  "1m":  [],
  "3m":  [],
  "1y":  [],
  "all": [],
};

// Dead code removed: ALL_TRANSACTIONS, GOALS, PERSONAL_SUBSCRIPTIONS
// These are now managed via localStorage stores (personalTransactionStore,
// finance_goals in Goals.tsx, finance_subscriptions in Subscriptions.tsx).
