import { useEffect, useRef } from "react";
import type { Subscription } from "../services/subscriptionCycles";
import { processAllDueSubscriptions } from "../services/subscriptionProcessor";

/**
 * Automatically processes overdue subscriptions on portal load.
 *
 * - Runs once on mount (catches up any missed cycles while the user was offline)
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
