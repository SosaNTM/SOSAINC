// ── Subscription cycle types & utilities ─────────────────────────────────────

export type BillingCycle =
  | "monthly"       // every month, same day
  | "quarterly"     // every 3 months
  | "quadrimestral" // every 4 months
  | "biannual"      // every 6 months
  | "annual";       // every 12 months

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly:       "Monthly",
  quarterly:     "Quarterly",
  quadrimestral: "Every 4 months",
  biannual:      "Biannual",
  annual:        "Annual",
};

export const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly:       1,
  quarterly:     3,
  quadrimestral: 4,
  biannual:      6,
  annual:        12,
};

// ── Subscription entity ───────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  category: string;
  billing_cycle: BillingCycle;
  billing_day: number;
  start_date: string;        // YYYY-MM-DD
  next_billing_date: string; // YYYY-MM-DD
  is_active: boolean;
  color?: string;
  icon?: string;             // emoji
  account_id?: string;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Clamp a billing day to the actual last day of a given month. */
function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

/**
 * Given the current billing date, advance by one cycle and return the next
 * billing date on `billingDay`, clamped to the last day of that month.
 *
 * @param currentDate  The date of the most-recent billing (or start date)
 * @param cycle        The billing cycle
 * @param billingDay   The desired day-of-month (1–31)
 */
export function calculateNextBillingDate(
  currentDate: Date,
  cycle: BillingCycle,
  billingDay: number,
): Date {
  const months = BILLING_CYCLE_MONTHS[cycle];
  const nextMonth = currentDate.getMonth() + months;
  const year = currentDate.getFullYear() + Math.floor(nextMonth / 12);
  const month = nextMonth % 12;
  const day = clampDay(year, month, billingDay);
  return new Date(year, month, day);
}

/**
 * Compute the first billing date on or after `startDate` for a given
 * billing day. Used when creating a new subscription.
 */
export function getFirstBillingDateFromStart(
  startDate: string,
  billingDay: number,
): Date | null {
  if (!startDate || billingDay < 1 || billingDay > 31) return null;
  const start = new Date(startDate + "T00:00:00");
  if (isNaN(start.getTime())) return null;

  const year = start.getFullYear();
  const month = start.getMonth();

  // Try the billing day in the same month
  const dayThisMonth = clampDay(year, month, billingDay);
  const candidate = new Date(year, month, dayThisMonth);
  if (candidate >= start) return candidate;

  // Otherwise use the next month
  const nm = month + 1;
  const ny = nm > 11 ? year + 1 : year;
  const normalizedMonth = nm % 12;
  return new Date(ny, normalizedMonth, clampDay(ny, normalizedMonth, billingDay));
}

// ── Status helpers ────────────────────────────────────────────────────────────

/** True if the subscription has a billing due today or in the past. */
export function isDueTodayOrOverdue(sub: Subscription): boolean {
  if (!sub.is_active || sub.deleted_at) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const billing = new Date(sub.next_billing_date + "T00:00:00");
  billing.setHours(0, 0, 0, 0);
  return billing <= today;
}

/** Filter subscriptions due on or before a given date. */
export function getDueSubscriptionsForDate(
  subscriptions: Subscription[],
  date: Date,
): Subscription[] {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return subscriptions.filter((s) => {
    if (!s.is_active || s.deleted_at) return false;
    const billing = new Date(s.next_billing_date + "T00:00:00");
    billing.setHours(0, 0, 0, 0);
    return billing <= d;
  });
}

/** Days until next billing date (negative = overdue). */
export function daysUntilBilling(sub: Subscription): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const billing = new Date(sub.next_billing_date + "T00:00:00");
  billing.setHours(0, 0, 0, 0);
  return Math.ceil((billing.getTime() - today.getTime()) / 86_400_000);
}

/** Normalize any billing cycle amount to its monthly equivalent. */
export function toMonthlyAmount(sub: Subscription): number {
  return sub.amount / BILLING_CYCLE_MONTHS[sub.billing_cycle];
}
