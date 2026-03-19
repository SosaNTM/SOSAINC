import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { localAdd } from "@/lib/personalTransactionStore";
import { broadcastFinanceUpdate } from "@/lib/financeRealtime";
import {
  type Subscription,
  type BillingCycle,
  calculateNextBillingDate,
  getDueSubscriptionsForDate,
} from "./subscriptionCycles";

export interface ProcessResult {
  processed: number;
  failed: number;
  totalAmount: number;
  updatedSubs: Subscription[];
  toasts: string[];
}

/**
 * Process all overdue billing cycles for a single subscription.
 *
 * Handles catch-up: if next_billing_date is several cycles in the past,
 * every missed cycle gets its own transaction with the correct historical date.
 *
 * Returns the updated subscription (with new next_billing_date) and counters.
 */
export async function processSubscription(
  sub: Subscription,
  userId: string,
  portalId: string,
): Promise<{ updatedSub: Subscription; processed: number; failed: number; totalAmount: number }> {
  if (!sub.is_active || sub.deleted_at) {
    return { updatedSub: sub, processed: 0, failed: 0, totalAmount: 0 };
  }

  let current = { ...sub };
  let processed = 0;
  let failed = 0;
  let totalAmount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Iterate until next_billing_date is in the future (catch-up loop)
  while (true) {
    const billingDate = new Date(current.next_billing_date + "T00:00:00");
    billingDate.setHours(0, 0, 0, 0);
    if (billingDate > today) break;

    const billingDateStr = current.next_billing_date;

    // 1. Add to personal_transactions (appears in Finance → Transactions, Budget, Analytics)
    try {
      localAdd(
        {
          user_id: userId,
          type: "expense",
          amount: current.amount,
          currency: current.currency ?? "EUR",
          category: current.category || "Subscriptions",
          description: `Subscription: ${current.name}`,
          date: billingDateStr,
          is_recurring: true,
          recurring_interval: "monthly",
        },
        userId,
        portalId,
      );
    } catch {
      // local store failed — mark as failed but continue advancing date
      failed++;
      const nextDate = calculateNextBillingDate(
        billingDate,
        current.billing_cycle as BillingCycle,
        current.billing_day,
      );
      current = { ...current, next_billing_date: nextDate.toISOString().slice(0, 10) };
      continue;
    }

    // 2. Record in Supabase subscription_transactions (best-effort)
    try {
      await supabase.from("subscription_transactions").insert({
        subscription_id: current.id,
        user_id: userId,
        amount: current.amount,
        billing_date: billingDateStr,
        status: "completed",
      });
    } catch {
      // Graceful degradation — Supabase may not be configured yet
    }

    totalAmount += current.amount;
    processed++;

    // 3. Advance to next cycle
    const nextDate = calculateNextBillingDate(
      billingDate,
      current.billing_cycle as BillingCycle,
      current.billing_day,
    );
    current = {
      ...current,
      next_billing_date: nextDate.toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };
  }

  // 4. Persist updated next_billing_date to Supabase (best-effort)
  if (processed > 0) {
    try {
      await supabase
        .from("subscriptions")
        .update({
          next_billing_date: current.next_billing_date,
          updated_at: current.updated_at,
        })
        .eq("id", current.id);
    } catch {
      // Graceful degradation
    }
  }

  return { updatedSub: current, processed, failed, totalAmount };
}

/**
 * Process all subscriptions due today or overdue.
 * Returns a full report including the updated subscription array.
 */
export async function processAllDueSubscriptions(
  subscriptions: Subscription[],
  userId: string,
  portalId: string,
): Promise<ProcessResult> {
  const due = getDueSubscriptionsForDate(subscriptions, new Date());

  let processed = 0;
  let failed = 0;
  let totalAmount = 0;
  const toasts: string[] = [];
  const updatedMap = new Map<string, Subscription>();

  await Promise.allSettled(
    due.map(async (sub) => {
      const result = await processSubscription(sub, userId, portalId);
      updatedMap.set(sub.id, result.updatedSub);
      processed += result.processed;
      failed += result.failed;
      totalAmount += result.totalAmount;

      if (result.processed > 0) {
        const cycles = result.processed > 1 ? ` (${result.processed}×)` : "";
        toasts.push(
          `💳 ${sub.name}${cycles} — €${(sub.amount * result.processed).toFixed(2)} charged`,
        );
      }
    }),
  );

  // Merge updated subs back into the full list
  const updatedSubs = subscriptions.map((s) => updatedMap.get(s.id) ?? s);

  // Broadcast so Dashboard, Budget, Analytics refresh
  if (processed > 0) {
    broadcastFinanceUpdate("transaction_added");
  }

  return { processed, failed, totalAmount, updatedSubs, toasts };
}
