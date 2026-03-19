// ── useDashboardSubscriptions ────────────────────────────────────────────────
//
// Portal-scoped: reads subscriptions from the active portal's localStorage key.
// Maps the full Subscription type to the lighter DashboardSubscription shape.
// Listens for storage events + window focus for cross-page sync.

import { useState, useEffect, useCallback } from "react";
import { usePortal } from "@/lib/portalContext";
import type { Subscription } from "@/portals/finance/services/subscriptionCycles";

export interface DashboardSubscription {
  id: string;
  name: string;
  cost: number;
  billingDay: number;
  category: string;
  color: string;
  emoji: string;
  active: boolean;
}

const KEY_PREFIX = "finance_subscriptions";

function storageKey(portalId: string): string {
  return `${KEY_PREFIX}_${portalId}`;
}

/** Same initial subs used by Subscriptions.tsx */
const INITIAL_SUBS: Subscription[] = [
  { id: "sub-1",  name: "Netflix",          icon: "🎬", amount: 15.99, billing_cycle: "monthly", billing_day: 3,  start_date: "2024-01-03", next_billing_date: "2026-04-03", category: "Entertainment", color: "#e50914", is_active: true,  currency: "EUR", description: "" },
  { id: "sub-2",  name: "Spotify",          icon: "🎵", amount: 9.99,  billing_cycle: "monthly", billing_day: 8,  start_date: "2024-01-08", next_billing_date: "2026-04-08", category: "Entertainment", color: "#1db954", is_active: true,  currency: "EUR", description: "" },
  { id: "sub-3",  name: "iCloud+",          icon: "☁️", amount: 2.99,  billing_cycle: "monthly", billing_day: 12, start_date: "2024-01-12", next_billing_date: "2026-04-12", category: "Subscriptions",  color: "#3b82f6", is_active: true,  currency: "EUR", description: "" },
  { id: "sub-4",  name: "Adobe CC",         icon: "🎨", amount: 54.99, billing_cycle: "monthly", billing_day: 15, start_date: "2024-01-15", next_billing_date: "2026-04-15", category: "Subscriptions",  color: "#ff0000", is_active: true,  currency: "EUR", description: "" },
  { id: "sub-5",  name: "ChatGPT Plus",     icon: "🤖", amount: 20.00, billing_cycle: "monthly", billing_day: 18, start_date: "2024-01-18", next_billing_date: "2026-04-18", category: "Subscriptions",  color: "#10a37f", is_active: true,  currency: "EUR", description: "" },
  { id: "sub-6",  name: "Gym — Wellnesium", icon: "🏋️", amount: 49.00, billing_cycle: "monthly", billing_day: 1,  start_date: "2024-01-01", next_billing_date: "2026-04-01", category: "Healthcare",     color: "#f59e0b", is_active: true,  currency: "EUR", description: "" },
  { id: "sub-7",  name: "NordVPN",          icon: "🔒", amount: 4.49,  billing_cycle: "monthly", billing_day: 22, start_date: "2024-01-22", next_billing_date: "2026-04-22", category: "Subscriptions",  color: "#4687ff", is_active: false, currency: "EUR", description: "" },
  { id: "sub-8",  name: "Duolingo Plus",    icon: "🦜", amount: 6.99,  billing_cycle: "monthly", billing_day: 25, start_date: "2024-01-25", next_billing_date: "2026-04-25", category: "Education",      color: "#58cc02", is_active: true,  currency: "EUR", description: "" },
  { id: "sub-9",  name: "Disney+",          icon: "✨", amount: 8.99,  billing_cycle: "monthly", billing_day: 7,  start_date: "2024-01-07", next_billing_date: "2026-04-07", category: "Entertainment", color: "#113ccf", is_active: false, currency: "EUR", description: "" },
  { id: "sub-10", name: "The Guardian",     icon: "📰", amount: 5.99,  billing_cycle: "monthly", billing_day: 14, start_date: "2024-01-14", next_billing_date: "2026-04-14", category: "Education",      color: "#052962", is_active: true,  currency: "EUR", description: "" },
];

function readFromStorage(portalId: string): Subscription[] {
  try {
    // Portal-scoped key
    const raw = localStorage.getItem(storageKey(portalId));
    if (raw) return JSON.parse(raw) as Subscription[];
    // Legacy migration: sosa reads from old non-portal key
    if (portalId === "sosa") {
      const legacy = localStorage.getItem("finance_subscriptions");
      if (legacy) return JSON.parse(legacy) as Subscription[];
    }
  } catch { /* corrupted */ }
  return INITIAL_SUBS;
}

function mapToDashboard(sub: Subscription): DashboardSubscription {
  return {
    id: sub.id,
    name: sub.name,
    cost: sub.amount,
    billingDay: sub.billing_day,
    category: sub.category,
    color: sub.color ?? "#6b7280",
    emoji: sub.icon ?? "📦",
    active: sub.is_active,
  };
}

export function useDashboardSubscriptions() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [rawSubs, setRawSubs] = useState<Subscription[]>(() => readFromStorage(portalId));

  const refresh = useCallback(() => {
    setRawSubs(readFromStorage(portalId));
  }, [portalId]);

  // Re-load when portal switches
  useEffect(() => { refresh(); }, [refresh]);

  // Sync when another tab/page writes to portal-scoped localStorage
  useEffect(() => {
    const key = storageKey(portalId);
    function onStorage(e: StorageEvent) {
      if (e.key === key) refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [portalId, refresh]);

  // Re-read on mount and when navigating back to dashboard
  useEffect(() => {
    refresh();
    function onFocus() { refresh(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const subs = rawSubs
    .filter((s) => !s.deleted_at)
    .map(mapToDashboard);

  function toggleSub(id: string) {
    setRawSubs((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, is_active: !s.is_active } : s,
      );
      localStorage.setItem(storageKey(portalId), JSON.stringify(updated));
      return updated;
    });
  }

  const activeSubs = subs.filter((s) => s.active);
  const totalMonthly = activeSubs.reduce((acc, s) => acc + s.cost, 0);

  return { subs, activeSubs, totalMonthly, toggleSub };
}
