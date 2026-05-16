// ── useDashboardSubscriptions ────────────────────────────────────────────────
//
// Reads subscriptions from Supabase (no localStorage).
// Maps the full Subscription type to the lighter DashboardSubscription shape.

import { useCallback } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { useSubscriptions } from "./useSubscriptions";
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
  const { subs: rawSubs, refetch } = useSubscriptions();

  const toggleSub = useCallback(async (id: string) => {
    const sub = rawSubs.find((s) => s.id === id);
    if (!sub) return;
    await supabase
      .from("subscriptions")
      .update({ is_active: !sub.is_active, updated_at: new Date().toISOString() })
      .eq("id", id);
    refetch();
  }, [rawSubs, refetch]);

  const subs = rawSubs
    .filter((s) => !s.deleted_at)
    .map(mapToDashboard);

  const activeSubs = subs.filter((s) => s.active);
  const totalMonthly = activeSubs.reduce((acc, s) => acc + s.cost, 0);

  return { subs, activeSubs, totalMonthly, toggleSub };
}
