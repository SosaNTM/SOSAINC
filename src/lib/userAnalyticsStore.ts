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

export function getUserAnalytics(_userId: string): UserAnalytics {
  const today = new Date();
  const activityByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    return { day: `${d.getDate()}/${d.getMonth() + 1}`, short: DAYS_SHORT[d.getDay()], actions: 0 };
  });

  const nowMonth = today.getMonth();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const mIdx = (nowMonth - 5 + i + 12) % 12;
    return { month: MONTHS[mIdx], invoices: 0, revenue: 0 };
  });

  const portalsActivity: UserPortalActivity[] = PORTALS.map((p) => ({
    portalId: p.id,
    portalName: p.name,
    accent: p.accent,
    sessions: 0,
    actionsCount: 0,
    lastActiveDaysAgo: 0,
  }));

  return {
    totalSessions: 0,
    totalLogins: 0,
    avgSessionMinutes: 0,
    activityByDay,
    paymentStats: { totalInvoices: 0, totalRevenue: 0, paid: 0, pending: 0, overdue: 0, draft: 0, monthly },
    portalsActivity,
  };
}
