// ── useFinancialGoals ────────────────────────────────────────────────────────
//
// Portal-scoped: each portal has its own isolated goals data.
// Reads from portal-scoped localStorage key.
// Listens for storage events so the Dashboard stays in sync
// when goals are created, edited, or deleted on the Goals page.

import { useState, useEffect, useCallback } from "react";
import { usePortal } from "@/lib/portalContext";

export interface DashboardGoal {
  id: string | number;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  category: string;
  color: string;
  emoji?: string;
}

const KEY_PREFIX = "finance_goals";

function storageKey(portalId: string): string {
  return `${KEY_PREFIX}_${portalId}`;
}

/** Same initial goals used by Goals.tsx — keeps Dashboard consistent before first visit */
const INITIAL_GOALS: DashboardGoal[] = [
  { id: 1, name: "Emergency Fund",  target: 10_000, saved: 6_400, deadline: "Dec 2025", category: "Safety",  color: "#2ECC71", emoji: "🛡️" },
  { id: 2, name: "Japan Trip",      target: 3_500,  saved: 1_100, deadline: "Sep 2025", category: "Travel",  color: "#f59e0b", emoji: "✈️" },
  { id: 3, name: "MacBook Pro M4",  target: 2_499,  saved: 1_820, deadline: "Jun 2025", category: "Tech",    color: "#4A9EFF", emoji: "💻" },
  { id: 4, name: "Road Bike",       target: 1_800,  saved: 650,   deadline: "Jul 2025", category: "Fitness", color: "#ef4444", emoji: "🚴" },
  { id: 5, name: "Home Renovation", target: 8_000,  saved: 2_200, deadline: "Mar 2026", category: "Home",    color: "#C9A84C", emoji: "🏠" },
];

function readGoals(portalId: string): DashboardGoal[] {
  try {
    // Try portal-scoped key
    const raw = localStorage.getItem(storageKey(portalId));
    if (raw) return JSON.parse(raw) as DashboardGoal[];
    // Legacy migration: sosa reads from old non-portal key
    if (portalId === "sosa") {
      const legacy = localStorage.getItem("finance_goals");
      if (legacy) return JSON.parse(legacy) as DashboardGoal[];
    }
  } catch { /* corrupted */ }
  return INITIAL_GOALS;
}

export function useFinancialGoals() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [goals, setGoals] = useState<DashboardGoal[]>(() => readGoals(portalId));

  const refresh = useCallback(() => {
    setGoals(readGoals(portalId));
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

  // Re-read on window focus
  useEffect(() => {
    refresh();
    function onFocus() { refresh(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { goals, isLoading: false };
}
