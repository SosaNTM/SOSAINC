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
const INITIAL_SUBS: Subscription[] = [];

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
