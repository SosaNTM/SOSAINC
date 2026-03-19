// Shared period state — syncs Dashboard and Revenue & Costs pages

export type Period = "daily" | "lastMonth" | "thisYear" | "custom";

export interface CustomRange {
  from: string; // YYYY-MM-DD
  to: string;
}

type Listener = () => void;

let currentPeriod: Period = "thisYear";
let currentCustomRange: CustomRange = { from: "2025-12-01", to: "2025-12-20" };
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const periodStore = {
  get: () => currentPeriod,
  set: (p: Period) => {
    currentPeriod = p;
    notify();
  },
  getCustomRange: () => currentCustomRange,
  setCustomRange: (r: CustomRange) => {
    currentCustomRange = r;
    notify();
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/* ───── Generate daily data from monthly totals (seeded pseudo-random) ───── */

export interface DailyRecord {
  month: string;
  revenue: number;
  directCosts: number;
  indirectCosts: number;
}

/**
 * Deterministic daily distribution from monthly totals.
 * Weekdays get ~120% of the daily average, weekends get ~50%.
 * A small sinusoidal variation adds realism without randomness.
 */
export function generateDailyFromMonthly(
  monthLabel: string,
  daysInMonth: number,
  revenue: number,
  directCosts: number,
  indirectCosts: number,
  _seed: number = 42
): DailyRecord[] {
  // Determine the JS day-of-week (0=Sun..6=Sat) for day 1 of the month
  const monthIndex: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const mi = monthIndex[monthLabel] ?? 0;
  const startDow = new Date(2025, mi, 1).getDay(); // 0=Sun

  const weights: number[] = [];
  for (let d = 0; d < daysInMonth; d++) {
    const dow = (startDow + d) % 7;
    const isWeekend = dow === 0 || dow === 6;
    // Base: weekday=1.2, weekend=0.5
    const base = isWeekend ? 0.5 : 1.2;
    // Add subtle deterministic variation: ±10% sinusoidal
    const variation = 1 + 0.1 * Math.sin((d * 2 * Math.PI) / 7 + mi);
    weights.push(base * variation);
  }
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  return weights.map((w, i) => {
    const factor = w / totalWeight;
    return {
      month: `${monthLabel} ${i + 1}`,
      revenue: Math.round(revenue * factor),
      directCosts: Math.round(directCosts * factor),
      indirectCosts: Math.round(indirectCosts * factor),
    };
  });
}