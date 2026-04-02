/**
 * One-time migration utility: reads existing localStorage data and pushes it to Supabase.
 * Safe to run multiple times — uses upsert where possible to avoid duplicates.
 *
 * Call `runMigration(userId, portalId)` once per portal after the user logs in.
 * Stores migration state in localStorage under `iconoff_migration_done_<portalId>`.
 */

import { createTransaction } from "@/lib/services/personalTransactionService";
import { createGoal } from "@/lib/services/goalsService";
import { createInvestment } from "@/lib/services/investmentService";
import { upsertBudgetLimit } from "@/lib/services/budgetService";
import { localGetAll } from "@/lib/personalTransactionStore";
import { STORAGE_GOALS_PREFIX } from "@/constants/storageKeys";
import { loadInvestments } from "@/lib/investmentStore";
import { loadBudgetLimits } from "@/portals/finance/services/budgetStorage";
import type { NewDbPersonalTransaction } from "@/types/database";

const MIGRATION_FLAG = (portalId: string) => `iconoff_migration_done_${portalId}`;

export interface MigrationResult {
  transactions: number;
  goals: number;
  investments: number;
  budgetLimits: number;
  errors: string[];
}

function isMigrationDone(portalId: string): boolean {
  return localStorage.getItem(MIGRATION_FLAG(portalId)) === "1";
}

function markMigrationDone(portalId: string): void {
  localStorage.setItem(MIGRATION_FLAG(portalId), "1");
}

/**
 * Migrate personal transactions from localStorage to Supabase.
 */
async function migrateTransactions(userId: string, portalId: string): Promise<{ count: number; errors: string[] }> {
  const local = localGetAll(portalId);
  if (local.length === 0) return { count: 0, errors: [] };

  let count = 0;
  const errors: string[] = [];

  for (const tx of local) {
    // Skip items that look like they came from Supabase already (uuid format without "local_" or "seed_")
    if (!tx.id.startsWith("local_") && !tx.id.startsWith("seed_")) continue;

    const payload: Omit<NewDbPersonalTransaction, "portal_id"> = {
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency ?? "EUR",
      category: tx.category ?? null,
      category_id: null,
      description: tx.description ?? null,
      date: tx.date,
      cost_classification: (tx.cost_classification as NewDbPersonalTransaction["cost_classification"]) ?? null,
      payment_method: tx.payment_method ?? null,
      reference: null,
      tags: null,
    };

    const result = await createTransaction(payload, portalId);
    if (result) {
      count++;
    } else {
      errors.push(`Transaction "${tx.description || tx.category}" on ${tx.date}: failed`);
    }
  }

  return { count, errors };
}

/**
 * Migrate financial goals from localStorage to Supabase.
 */
async function migrateGoals(userId: string, portalId: string): Promise<{ count: number; errors: string[] }> {
  const key = `${STORAGE_GOALS_PREFIX}_${portalId}`;
  let goals: Array<{ id: unknown; name?: string; target?: number; saved?: number; deadline?: string; category?: string; color?: string; emoji?: string }> = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) goals = JSON.parse(raw);
  } catch {
    return { count: 0, errors: [] };
  }

  if (goals.length === 0) return { count: 0, errors: [] };

  let count = 0;
  const errors: string[] = [];

  for (const g of goals) {
    if (!g.name || !g.target) continue;
    // Skip already-migrated UUIDs
    if (typeof g.id === "string" && g.id.match(/^[0-9a-f-]{36}$/)) continue;

    const result = await createGoal(
      {
        user_id: userId,
        name: g.name,
        target: Number(g.target),
        saved: Number(g.saved ?? 0),
        deadline: g.deadline ?? null,
        category: g.category ?? null,
        color: g.color ?? null,
        emoji: g.emoji ?? null,
        is_achieved: Number(g.saved ?? 0) >= Number(g.target),
      },
      portalId,
    );

    if (result) {
      count++;
    } else {
      errors.push(`Goal "${g.name}": failed`);
    }
  }

  return { count, errors };
}

/**
 * Migrate investments from localStorage to Supabase.
 */
async function migrateInvestments(userId: string, portalId: string): Promise<{ count: number; errors: string[] }> {
  const investments = loadInvestments(portalId);
  if (investments.length === 0) return { count: 0, errors: [] };

  let count = 0;
  const errors: string[] = [];

  for (const inv of investments) {
    // Skip already-migrated UUIDs (no "local_" or timestamp-based prefix)
    if (inv.id.match(/^[0-9a-f-]{36}$/)) continue;

    const result = await createInvestment(
      {
        user_id: userId,
        name: inv.name,
        ticker: inv.ticker || null,
        type: inv.type,
        units: inv.units,
        avg_buy_price: inv.avgBuyPrice,
        current_price: inv.currentPrice,
        currency: "EUR",
        color: inv.color ?? null,
        emoji: inv.emoji ?? null,
        notes: null,
      },
      portalId,
    );

    if (result) {
      count++;
    } else {
      errors.push(`Investment "${inv.name}": failed`);
    }
  }

  return { count, errors };
}

/**
 * Migrate budget limits from localStorage to Supabase.
 */
async function migrateBudgetLimits(portalId: string): Promise<{ count: number; errors: string[] }> {
  const limits = loadBudgetLimits(portalId);
  const entries = Object.entries(limits);
  if (entries.length === 0) return { count: 0, errors: [] };

  let count = 0;
  const errors: string[] = [];

  for (const [category, monthly_limit] of entries) {
    if (monthly_limit <= 0) continue;
    const result = await upsertBudgetLimit(
      { user_id: null, category, monthly_limit, category_id: null, color: null, icon_name: null },
      portalId,
    );
    if (result) {
      count++;
    } else {
      errors.push(`Budget limit "${category}": failed`);
    }
  }

  return { count, errors };
}

/**
 * Run the full migration for a portal.
 * Skips if already migrated.
 */
export async function runMigration(userId: string, portalId: string): Promise<MigrationResult | null> {
  if (isMigrationDone(portalId)) return null;

  const result: MigrationResult = { transactions: 0, goals: 0, investments: 0, budgetLimits: 0, errors: [] };

  const [txResult, goalsResult, invResult, budgetResult] = await Promise.all([
    migrateTransactions(userId, portalId),
    migrateGoals(userId, portalId),
    migrateInvestments(userId, portalId),
    migrateBudgetLimits(portalId),
  ]);

  result.transactions = txResult.count;
  result.goals = goalsResult.count;
  result.investments = invResult.count;
  result.budgetLimits = budgetResult.count;
  result.errors = [...txResult.errors, ...goalsResult.errors, ...invResult.errors, ...budgetResult.errors];

  if (result.errors.length === 0) {
    markMigrationDone(portalId);
  }

  return result;
}

/**
 * Force-reset the migration flag (for testing or re-running).
 */
export function resetMigrationFlag(portalId: string): void {
  localStorage.removeItem(MIGRATION_FLAG(portalId));
}
