/**
 * Per-user analytics: payment stats, portal activity, session data.
 * All data is deterministically seeded from the userId for mock consistency.
 */

import { PORTALS } from "./portalContext";

// Simple seeded random — same userId always produces same sequence
function seeded(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    return ((h >>> 0) / 0xffffffff);
  };
}

export interface UserPaymentStats {
  totalInvoices: number;
  totalRevenue: number;
  paid: number;
  pending: number;
  overdue: number;
  draft: number;
  monthly: { month: string; invoices: number; revenue: number }[];
}

export interface UserPortalActivity {
  portalId: string;
  portalName: string;
  accent: string;
  sessions: number;
  actionsCount: number;
  lastActiveDaysAgo: number;
}

export interface UserAnalytics {
  totalSessions: number;
  totalLogins: number;
  avgSessionMinutes: number;
  activityByDay: { day: string; short: string; actions: number }[];
  paymentStats: UserPaymentStats;
  portalsActivity: UserPortalActivity[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function getUserAnalytics(userId: string): UserAnalytics {
  const rng = seeded(userId + "_analytics");

  // Sessions / logins
  const totalSessions = 40 + Math.floor(rng() * 120);
  const totalLogins = totalSessions + Math.floor(rng() * 20);
  const avgSessionMinutes = 8 + Math.floor(rng() * 35);

  // Activity by day (last 14 days)
  const today = new Date();
  const activityByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isWeekend ? 2 : 12;
    const actions = Math.floor(rng() * base * 2);
    return {
      day: `${d.getDate()}/${d.getMonth() + 1}`,
      short: DAYS_SHORT[d.getDay()],
      actions,
    };
  });

  // Monthly invoice stats (last 6 months)
  const nowMonth = today.getMonth();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const mIdx = (nowMonth - 5 + i + 12) % 12;
    const invoices = 3 + Math.floor(rng() * 8);
    const revenue = (invoices * (4000 + Math.floor(rng() * 12000)));
    return { month: MONTHS[mIdx], invoices, revenue };
  });

  const totalInvoices = monthly.reduce((s, m) => s + m.invoices, 0);
  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const paid = Math.floor(totalInvoices * (0.5 + rng() * 0.3));
  const pending = Math.floor((totalInvoices - paid) * 0.6);
  const overdue = Math.floor((totalInvoices - paid - pending) * 0.7);
  const draft = totalInvoices - paid - pending - overdue;

  // Portal activity
  const portalsActivity: UserPortalActivity[] = PORTALS.map((p) => ({
    portalId: p.id,
    portalName: p.name,
    accent: p.accent,
    sessions: 5 + Math.floor(rng() * 40),
    actionsCount: 20 + Math.floor(rng() * 200),
    lastActiveDaysAgo: Math.floor(rng() * 7),
  }));

  return {
    totalSessions,
    totalLogins,
    avgSessionMinutes,
    activityByDay,
    paymentStats: { totalInvoices, totalRevenue, paid, pending, overdue, draft, monthly },
    portalsActivity,
  };
}
