// ── useSubscriptions ──────────────────────────────────────────────────────────
//
// Loads subscriptions from Supabase. No localStorage cache.
// Exposes syncSub / softDeleteSub helpers for Supabase writes.

import { useState, useEffect, useCallback } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { useAuth } from "@/lib/authContext";
import { usePortalDB } from "@/lib/portalContextDB";
import type { Subscription, BillingCycle } from "@/portals/finance/services/subscriptionCycles";

function dbToSub(row: Record<string, unknown>): Subscription {
  return {
    id:                  row.id as string,
    user_id:             row.user_id as string | undefined,
    name:                row.name as string,
    description:         row.description as string | undefined,
    amount:              Number(row.amount),
    currency:            (row.currency as string) ?? "EUR",
    category:            (row.category as string) ?? "",
    billing_cycle:       (row.billing_cycle as BillingCycle) ?? "monthly",
    billing_day:         (row.billing_day as number) ?? 1,
    start_date:          (row.start_date as string) ?? "",
    next_billing_date:   (row.next_billing_date as string) ?? "",
    is_active:           (row.is_active as boolean) ?? true,
    color:               row.color as string | undefined,
    icon:                row.icon as string | undefined,
    account_id:          row.account_id as string | undefined,
    deleted_at:          row.deleted_at as string | undefined,
    created_at:          row.created_at as string | undefined,
    updated_at:          row.updated_at as string | undefined,
  };
}

function subToDbRow(
  sub: Subscription,
  userId: string,
  portalId: string,
): Record<string, unknown> {
  return {
    id:                sub.id,
    user_id:           userId,
    portal_id:         portalId,
    name:              sub.name,
    description:       sub.description ?? null,
    amount:            sub.amount,
    currency:          sub.currency ?? "EUR",
    category:          sub.category,
    billing_cycle:     sub.billing_cycle,
    billing_day:       sub.billing_day,
    start_date:        sub.start_date || null,
    next_billing_date: sub.next_billing_date || null,
    is_active:         sub.is_active,
    status:            sub.is_active ? "active" : "paused",
    color:             sub.color ?? null,
    icon:              sub.icon ?? null,
    account_id:        sub.account_id ?? null,
    deleted_at:        sub.deleted_at ?? null,
    updated_at:        new Date().toISOString(),
  };
}

export interface UseSubscriptionsResult {
  subs:              Subscription[];
  isLoading:         boolean;
  setSubs:           React.Dispatch<React.SetStateAction<Subscription[]>>;
  syncSub:           (sub: Subscription) => Promise<void>;
  softDeleteSub:     (id: string) => Promise<void>;
  refetch:           () => void;
}

export function useSubscriptions(): UseSubscriptionsResult {
  const { user } = useAuth();
  const { currentPortalId } = usePortalDB();

  const [subs,      setSubs]      = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick,      setTick]      = useState(0);

  const load = useCallback(async () => {
    if (!user || !currentPortalId) { setIsLoading(false); return; }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSubs((data as Record<string, unknown>[]).map(dbToSub));
    } else {
      setSubs([]);
    }
    setIsLoading(false);
  }, [user, currentPortalId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const syncSub = useCallback(async (sub: Subscription): Promise<void> => {
    if (!user || !currentPortalId) return;
    await supabase
      .from("subscriptions")
      .upsert(subToDbRow(sub, user.id, currentPortalId), { onConflict: "id" });
  }, [user, currentPortalId]);

  const softDeleteSub = useCallback(async (id: string): Promise<void> => {
    if (!user || !currentPortalId) return;
    await supabase
      .from("subscriptions")
      .update({ deleted_at: new Date().toISOString(), is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("portal_id", currentPortalId);
  }, [user, currentPortalId]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { subs, isLoading, setSubs, syncSub, softDeleteSub, refetch };
}
