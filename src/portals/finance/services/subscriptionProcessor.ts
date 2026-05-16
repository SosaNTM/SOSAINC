import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { toPortalUUID } from "@/lib/portalUUID";
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

/** Compute current balance by summing personal_transactions for this portal. */
async function computeBalance(portalId: string): Promise<number> {
  const { data, error } = await supabase
    .from("personal_transactions")
    .select("type, amount")
    .eq("portal_id", toPortalUUID(portalId));
  if (error || !data) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).reduce(
    (acc, t) => (t.type === "income" ? acc + Number(t.amount) : acc - Number(t.amount)),
    0,
  );
}

/**
 * Process all overdue billing cycles for a single subscription.
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

  while (true) {
    const billingDate = new Date(current.next_billing_date + "T00:00:00");
    billingDate.setHours(0, 0, 0, 0);
    if (billingDate > today) break;

    const billingDateStr = current.next_billing_date;

    // Check sufficient balance
    const currentBalance = await computeBalance(portalId);
    if (currentBalance < current.amount) {
      return { updatedSub: current, processed, failed, totalAmount, skippedInsufficientFunds: true };
    }

    // Record the charge as an expense transaction
    const { error: txErr } = await supabase
      .from("personal_transactions")
      .insert({
        user_id: userId,
        portal_id: toPortalUUID(portalId),
        type: "expense",
        amount: current.amount,
        currency: current.currency ?? "EUR",
        category: current.category || "Subscriptions",
        description: `Subscription: ${current.name}`,
        date: billingDateStr,
        is_recurring: true,
        recurring_interval: "monthly",
      });

    if (txErr) {
      console.warn("[subscriptionProcessor] Failed to record personal_transaction:", txErr.message);
      failed++;
      const nextDate = calculateNextBillingDate(
        billingDate,
        current.billing_cycle as BillingCycle,
        current.billing_day,
      );
      current = { ...current, next_billing_date: nextDate.toISOString().slice(0, 10) };
      continue;
    }

    // Record in subscription_transactions ledger
    const { error: ledgerErr } = await supabase
      .from("subscription_transactions")
      .insert({
        subscription_id: current.id,
        user_id: userId,
        portal_id: toPortalUUID(portalId),
        amount: current.amount,
        billing_date: billingDateStr,
        status: "completed",
      });
    if (ledgerErr) {
      console.warn("[subscriptionProcessor] Failed to record subscription_transaction:", ledgerErr.message);
    }

    totalAmount += current.amount;
    processed++;

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

  // Persist updated next_billing_date
  if (processed > 0) {
    const { error: updErr } = await supabase
      .from("subscriptions")
      .update({
        next_billing_date: current.next_billing_date,
        updated_at: current.updated_at,
      })
      .eq("id", current.id)
      .eq("portal_id", toPortalUUID(portalId));
    if (updErr) {
      console.warn("[subscriptionProcessor] Failed to update next_billing_date:", updErr.message);
    }
  }

  return { updatedSub: current, processed, failed, totalAmount };
}

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

  const updatedSubs = subscriptions.map((s) => updatedMap.get(s.id) ?? s);

  if (processed > 0) {
    broadcastFinanceUpdate("transaction_added");
  }

  return { processed, failed, skippedInsufficientFunds, totalAmount, updatedSubs, toasts };
}
