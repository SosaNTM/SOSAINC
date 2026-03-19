// ── Single source of truth for personal finance data ─────────────────────────
//
// Both Dashboard.tsx and Overview.tsx import from here.
// All numbers derive from the same base so they are always consistent.

// ── Current snapshot ──────────────────────────────────────────────────────────

export const SNAPSHOT = {
  cash:            12_800,   // checking + savings
  investments:     50_000,   // stocks + ETFs
  debt:            15_480,   // mortgage remainder
  monthlyIncome:    4_850,
  monthlyExpenses:  2_940,
} as const;

export const ASSETS       = SNAPSHOT.cash + SNAPSHOT.investments;   // 62_800
export const NET_WORTH    = ASSETS - SNAPSHOT.debt;                  // 47_320
export const SAVINGS_RATE = Math.round(
  ((SNAPSHOT.monthlyIncome - SNAPSHOT.monthlyExpenses) / SNAPSHOT.monthlyIncome) * 100,
); // 39

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

export const MONTHLY_HISTORY: MonthData[] = [
  // NW:                                                               31_000
  { key: "2025-07", label: "Jul 25", income: 4200, expenses: 2800, cash:  4_000, investments: 44_000, debt: 17_000 },
  // NW:                                                               32_700
  { key: "2025-08", label: "Aug 25", income: 4500, expenses: 3100, cash:  4_800, investments: 44_700, debt: 16_800 },
  // NW:                                                               34_100
  { key: "2025-09", label: "Sep 25", income: 4700, expenses: 2900, cash:  5_300, investments: 45_400, debt: 16_600 },
  // NW:                                                               35_700
  { key: "2025-10", label: "Oct 25", income: 4850, expenses: 3200, cash:  5_800, investments: 46_200, debt: 16_300 },
  // NW:                                                               37_500
  { key: "2025-11", label: "Nov 25", income: 5100, expenses: 3050, cash:  6_500, investments: 47_000, debt: 16_000 },
  // NW:                                                               38_000
  { key: "2025-12", label: "Dec 25", income: 4850, expenses: 3800, cash:  6_200, investments: 47_600, debt: 15_800 },
  // NW:                                                               39_600
  { key: "2026-01", label: "Jan 26", income: 4850, expenses: 2750, cash:  7_000, investments: 48_200, debt: 15_600 },
  // NW:                                                               41_510
  { key: "2026-02", label: "Feb 26", income: 5450, expenses: 2980, cash:  8_000, investments: 49_000, debt: 15_490 },
  // NW:                                                               47_320  ← matches SNAPSHOT
  { key: "2026-03", label: "Mar 26", income: 4850, expenses: 2940, cash: 12_800, investments: 50_000, debt: 15_480 },
];

// ── Balance trend slices (for Dashboard sparkline) ────────────────────────────

export type DashboardPeriod = "1d" | "7d" | "1m" | "3m" | "1y" | "all";

const nw = (m: MonthData) => ({ label: m.label, balance: monthNetWorth(m) });

export const BALANCE_TRENDS: Record<DashboardPeriod, { label: string; balance: number }[]> = {
  "1d": [{ label: "Now", balance: NET_WORTH }],
  "7d": [
    { label: "Mar 11", balance: 45_890 },
    { label: "Mar 12", balance: 46_100 },
    { label: "Mar 13", balance: 46_340 },
    { label: "Mar 14", balance: 46_280 },
    { label: "Mar 15", balance: 46_700 },
    { label: "Mar 16", balance: 46_980 },
    { label: "Mar 17", balance: NET_WORTH },
  ],
  "1m":  MONTHLY_HISTORY.slice(-5).map(nw),
  "3m":  MONTHLY_HISTORY.slice(-3).map(nw),
  "1y":  MONTHLY_HISTORY.map(nw),
  "all": MONTHLY_HISTORY.map(nw),
};

// Dead code removed: ALL_TRANSACTIONS, GOALS, PERSONAL_SUBSCRIPTIONS
// These are now managed via localStorage stores (personalTransactionStore,
// finance_goals in Goals.tsx, finance_subscriptions in Subscriptions.tsx).
