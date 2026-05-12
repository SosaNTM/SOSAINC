// ── useSubscriptions ──────────────────────────────────────────────────────────
//
// Loads subscriptions from Supabase (primary) with localStorage merge fallback.
// Exposes setSubs for the subscription processor's next_billing_date updates,
// plus syncSub / softDeleteSub helpers for Supabase writes.

import { useState, useEffect, useCallback } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { usePortalDB } from "@/lib/portalContextDB";
import { STORAGE_SUBSCRIPTIONS_PREFIX, STORAGE_SUBSCRIPTIONS_LEGACY } from "@/constants/storageKeys";
import type { Subscription, BillingCycle } from "@/portals/finance/services/subscriptionCycles";

function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
  return !!url && !url.includes("placeholder");
}

function subsStorageKey(portalId: string): string {
  return `${STORAGE_SUBSCRIPTIONS_PREFIX}_${portalId}`;
}

function loadLocal(portalId: string): Subscription[] {
  try {
    const raw = localStorage.getItem(subsStorageKey(portalId));
    if (raw) return JSON.parse(raw) as Subscription[];
    if (portalId === "sosa") {
      const legacy = localStorage.getItem(STORAGE_SUBSCRIPTIONS_LEGACY);
      if (legacy) return JSON.parse(legacy) as Subscription[];
    }
  } catch { /* ignore */ }
  return [];
}

function saveLocal(portalId: string, subs: Subscription[]): void {
  try {
    localStorage.setItem(subsStorageKey(portalId), JSON.stringify(subs));
  } catch { /* ignore */ }
}

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
  const { portal } = usePortal();
  const { currentPortalId } = usePortalDB();
  const portalId = portal?.id ?? "sosa";

  const [subs,      setSubs]      = useState<Subscription[]>(() => loadLocal(portalId));
  const [isLoading, setIsLoading] = useState(true);
  const [tick,      setTick]      = useState(0);

  // Reload localStorage when portal switches
  useEffect(() => {
    setSubs(loadLocal(portalId));
  }, [portalId]);

  // Persist to portal-scoped localStorage whenever subs change
  useEffect(() => {
    saveLocal(portalId, subs);
  }, [subs, portalId]);

  const load = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }

    if (isSupabaseConfigured() && currentPortalId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("portal_id", currentPortalId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const remote = (data as Record<string, unknown>[]).map(dbToSub);
        const remoteIds = new Set(remote.map((s) => s.id));
        const local = loadLocal(portalId);
        // Keep local-only entries not yet synced to Supabase
        const localOnly = local.filter(
          (s) => s.id.startsWith("local_") && !remoteIds.has(s.id),
        );
        setSubs([...remote, ...localOnly]);
        setIsLoading(false);
        return;
      }
    }

    // Fallback: localStorage
    setSubs(loadLocal(portalId));
    setIsLoading(false);
  }, [user, portalId, currentPortalId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Upsert a subscription to Supabase (best-effort — local state already updated by caller)
  const syncSub = useCallback(async (sub: Subscription): Promise<void> => {
    if (!user || !isSupabaseConfigured() || !currentPortalId) return;
    await supabase
      .from("subscriptions")
      .upsert(subToDbRow(sub, user.id, currentPortalId), { onConflict: "id" });
  }, [user, currentPortalId]);

  // Soft-delete: mark deleted_at + is_active=false in Supabase
  const softDeleteSub = useCallback(async (id: string): Promise<void> => {
    if (!user || !isSupabaseConfigured() || !currentPortalId) return;
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
