// ── Finance Realtime Channel ───────────────────────────────────────────────────
//
// Lightweight broadcast event bus via Supabase Realtime.
// Any component that mutates personal_transactions broadcasts here,
// and all subscribers (Budget, Dashboard, Analytics) re-fetch their data.
//
// Does NOT require Supabase Realtime Postgres Changes — uses client-side
// broadcast so it works even without Row Level Security.

import { supabase } from "./supabase";

const CHANNEL_NAME = "finance-updates";
const LOCAL_EVENT_NAME = "finance-local-update";

export type FinanceEvent =
  | "transaction_added"
  | "transaction_updated"
  | "transaction_deleted";

// Singleton channel shared across the app
let _channel = supabase.channel(CHANNEL_NAME);
let _subscribed = false;

function ensureSubscribed() {
  if (_subscribed) return;
  _channel.subscribe();
  _subscribed = true;
}

/**
 * Broadcast a finance mutation event to all open components.
 * Uses both Supabase Realtime (cross-tab) and a DOM CustomEvent (same-tab)
 * so listeners always fire regardless of Supabase configuration.
 */
export function broadcastFinanceUpdate(event: FinanceEvent, payload?: Record<string, unknown>) {
  // Same-tab: DOM custom event (always works)
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT_NAME, { detail: { event, ...payload } }));

  // Cross-tab: Supabase Realtime broadcast
  try {
    ensureSubscribed();
    _channel.send({
      type: "broadcast",
      event,
      payload: { ...payload, timestamp: Date.now() },
    });
  } catch {
    // Supabase not configured — local event already dispatched
  }
}

/**
 * Subscribe to finance update events.
 * Listens to both DOM CustomEvent (same-tab) and Supabase Realtime (cross-tab).
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeToFinanceUpdates(
  callback: (event: FinanceEvent, payload: Record<string, unknown>) => void
): () => void {
  // Same-tab listener
  const onLocal = (e: Event) => {
    const detail = (e as CustomEvent).detail ?? {};
    callback(detail.event ?? "transaction_added", detail);
  };
  window.addEventListener(LOCAL_EVENT_NAME, onLocal);

  // Cross-tab listener (Supabase Realtime)
  let sub: ReturnType<typeof supabase.channel> | null = null;
  try {
    sub = supabase
      .channel(`${CHANNEL_NAME}-${Math.random()}`)
      .on("broadcast", { event: "transaction_added" },   ({ payload }) => callback("transaction_added",   payload ?? {}))
      .on("broadcast", { event: "transaction_updated" }, ({ payload }) => callback("transaction_updated", payload ?? {}))
      .on("broadcast", { event: "transaction_deleted" }, ({ payload }) => callback("transaction_deleted", payload ?? {}))
      .subscribe();
  } catch {
    // Supabase not configured — local listener still active
  }

  return () => {
    window.removeEventListener(LOCAL_EVENT_NAME, onLocal);
    if (sub) supabase.removeChannel(sub);
  };
}
