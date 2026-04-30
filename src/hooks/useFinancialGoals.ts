// ── useFinancialGoals ────────────────────────────────────────────────────────
//
// Portal-scoped: each portal has its own isolated goals data.
// Primary: Supabase via goalsService. Fallback: portal-scoped localStorage cache.

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePortal } from "@/lib/portalContext";
import { fetchGoals } from "@/lib/services/goalsService";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import type { DbFinancialGoal } from "@/types/database";

export interface DashboardGoal {
  id: string | number;
  name: string;
  target: number;
  deadline: string;
  category: string;
  color: string;
  emoji?: string;
}

function dbGoalToDisplay(g: DbFinancialGoal): DashboardGoal {
  return {
    id: g.id,
    name: g.name,
    target: g.target,
    deadline: g.deadline ?? "",
    category: g.category ?? "",
    color: g.color ?? "#6b7280",
    emoji: g.emoji ?? undefined,
  };
}

export function useFinancialGoals() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [goals, setGoals] = useState<DashboardGoal[]>(() => {
    try {
      const raw = localStorage.getItem(`finance_goals_${portalId}`);
      if (raw) return (JSON.parse(raw) as ReturnType<typeof JSON.parse>[]).map(dbGoalToDisplay);
    } catch { /* ignore */ }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => !localStorage.getItem(`finance_goals_${portalId}`));

  const refresh = useCallback(async () => {
    try {
      const data = await fetchGoals(portalId);
      setGoals(data.map(dbGoalToDisplay));
    } catch {
      toast.warning("Goals: using cached data — server unreachable", { id: "goals-offline" });
    } finally {
      setIsLoading(false);
    }
  }, [portalId]);

  // Re-load when portal switches
  useEffect(() => { void refresh(); }, [refresh]);

  // Re-read on window focus
  useEffect(() => {
    function onFocus() { void refresh(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // Real-time Postgres Changes — live updates from other users/tabs
  useRealtimeTable<DbFinancialGoal>("financial_goals", portalId, {
    onInsert: (row) => setGoals((prev) => [dbGoalToDisplay(row), ...prev]),
    onUpdate: (row) => setGoals((prev) => prev.map((g) => g.id === row.id ? dbGoalToDisplay(row) : g)),
    onDelete: (id)  => setGoals((prev) => prev.filter((g) => g.id !== id)),
  });

  return { goals, isLoading };
}
