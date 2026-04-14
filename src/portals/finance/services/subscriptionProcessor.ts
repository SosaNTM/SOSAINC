import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { localAdd, localGetAll } from "@/lib/personalTransactionStore";
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
  skippedInsufficientFunds: number;
  totalAmount: number;
  updatedSubs: Subscription[];
  toasts: string[];
}

/** Compute current balance from local transaction store. */
function computeBalance(portalId: string): number {
  return localGetAll(portalId).reduce(
    (acc, t) => (t.type === "income" ? acc + Number(t.amount) : acc - Number(t.amount)),
    0,
  );
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
): Promise<{ updatedSub: Subscription; processed: number; failed: number; totalAmount: number; skippedInsufficientFunds?: boolean }> {
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

    // 0. Check if balance is sufficient before charging
    const currentBalance = computeBalance(portalId);
    if (currentBalance < current.amount) {
      // Insufficient funds — skip this charge cycle entirely
      return { updatedSub: current, processed, failed, totalAmount, skippedInsufficientFunds: true };
    }

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
    } catch (e) {
      console.warn("[subscriptionProcessor] Failed to record local transaction:", e);
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
        portal_id: portalId,
        amount: current.amount,
        billing_date: billingDateStr,
        status: "completed",
      });
    } catch (e) {
      console.warn("[subscriptionProcessor] Failed to record subscription_transaction:", e);
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
    } catch (e) {
      console.warn("[subscriptionProcessor] Failed to update subscription next_billing_date in Supabase:", e);
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
  let skippedInsufficientFunds = 0;
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

      if (result.skippedInsufficientFunds) {
        skippedInsufficientFunds++;
        toasts.push(
          `⚠ ${sub.name} skipped — insufficient balance for €${sub.amount.toFixed(2)} charge`,
        );
      } else if (result.processed > 0) {
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

  return { processed, failed, skippedInsufficientFunds, totalAmount, updatedSubs, toasts };
}
