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
const INITIAL_GOALS: DashboardGoal[] = [];

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
