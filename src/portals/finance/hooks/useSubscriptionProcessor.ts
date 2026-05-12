import { useEffect, useRef } from "react";
import type { Subscription } from "../services/subscriptionCycles";
import { processAllDueSubscriptions } from "../services/subscriptionProcessor";

// Cross-tab lock: if another tab ran the processor within the last 60 seconds, skip.
// The Supabase UNIQUE on (subscription_id, billing_date) prevents DB duplicates,
// but localStorage can still accumulate duplicate entries without this guard.
const LOCK_TTL_MS = 60_000;

function acquireProcessorLock(portalId: string): boolean {
  const key = `sub_processor_lock_${portalId}`;
  const existing = localStorage.getItem(key);
  const now = Date.now();
  if (existing && now - parseInt(existing, 10) < LOCK_TTL_MS) return false;
  localStorage.setItem(key, String(now));
  return true;
}

/**
 * Automatically processes overdue subscriptions on portal load.
 *
 * - Runs once on mount (catches up any missed cycles while the user was offline)
 * - Uses a localStorage timestamp lock to prevent concurrent processing across tabs
 * - Updates the subscription list via setSubs
 * - Emits a toast for each processed subscription
 *
 * Does nothing if userId is null (unauthenticated) or there are no subs.
 */
export function useSubscriptionProcessor(
  subs: Subscription[],
  setSubs: (updater: (prev: Subscription[]) => Subscription[]) => void,
  userId: string | null,
  onToast: (message: string) => void,
  portalId: string,
): void {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    if (!userId) return;
    if (subs.length === 0) return;
    if (!acquireProcessorLock(portalId)) return;

    hasRun.current = true;

    processAllDueSubscriptions(subs, userId, portalId).then((result) => {
      if (result.processed === 0) return;

      // Update subscription next_billing_date in state
      setSubs((prev) => {
        const updatedMap = new Map(result.updatedSubs.map((s) => [s.id, s]));
        return prev.map((s) => updatedMap.get(s.id) ?? s);
      });

      // Show toast(s)
      if (result.toasts.length === 1) {
        onToast(result.toasts[0]);
      } else {
        onToast(
          `💳 ${result.processed} subscriptions processed — €${result.totalAmount.toFixed(2)} total`,
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally runs only on mount
}
