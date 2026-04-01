// ── Budget persistent storage ─────────────────────────────────────────────────
//
// Stores per-category budget limits as a name→limit map.
// All functions accept portalId so each portal has isolated budget data.
// Categories themselves come from financeCategoryStore — this file only stores limits.

export interface StoredBudget {
  id: string;
  name: string;
  limit: number;   // monthly limit in €
  color: string;
  iconName: string;
}

/** Map of lowercase category name → monthly budget limit */
export type BudgetLimitMap = Record<string, number>;

import {
  STORAGE_BUDGET_LIMITS_PREFIX,
  STORAGE_BUDGET_TOTAL_PREFIX,
  STORAGE_BUDGET_TOTAL_LEGACY,
  STORAGE_BUDGET_LIMITS_LEGACY,
  STORAGE_BUDGET_OLD_ARRAY_LEGACY,
} from "@/constants/storageKeys";

const LIMITS_KEY_PREFIX       = STORAGE_BUDGET_LIMITS_PREFIX;
const TOTAL_BUDGET_KEY_PREFIX = STORAGE_BUDGET_TOTAL_PREFIX;

const DEFAULT_TOTAL_BUDGET = 2400;

// ── Default limits per category (matches financeCategoryStore names) ──────────

const DEFAULT_LIMITS: BudgetLimitMap = {
  rent:          1000,
  utilities:      150,
  groceries:      400,
  transport:      200,
  dining:         200,
  subscriptions:  150,
  healthcare:     100,
  shopping:       200,
  entertainment:  100,
};

// ── Key helpers ───────────────────────────────────────────────────────────────

function limitsKey(portalId: string): string {
  return `${LIMITS_KEY_PREFIX}_${portalId}`;
}

function totalKey(portalId: string): string {
  return `${TOTAL_BUDGET_KEY_PREFIX}_${portalId}`;
}

// ── Total budget ──────────────────────────────────────────────────────────────

export function loadTotalBudget(portalId: string): number {
  try {
    const raw = localStorage.getItem(totalKey(portalId));
    if (raw !== null) return Number(raw);
    // Legacy migration (sosa only)
    if (portalId === "sosa") {
      const legacy = localStorage.getItem(STORAGE_BUDGET_TOTAL_LEGACY);
      if (legacy !== null) return Number(legacy);
    }
  } catch { /* fallthrough */ }
  return DEFAULT_TOTAL_BUDGET;
}

export function saveTotalBudget(portalId: string, amount: number): void {
  localStorage.setItem(totalKey(portalId), String(amount));
}

// ── Budget limit map ──────────────────────────────────────────────────────────

/** Migrate old non-portal key (sosa only). */
function migrateFromLegacy(portalId: string): BudgetLimitMap | null {
  if (portalId !== "sosa") return null;
  try {
    const raw = localStorage.getItem(STORAGE_BUDGET_LIMITS_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw) as BudgetLimitMap;
      if (typeof parsed === "object" && parsed !== null) return parsed;
    }
    // Try even older StoredBudget[] format
    const rawOld = localStorage.getItem(STORAGE_BUDGET_OLD_ARRAY_LEGACY);
    if (rawOld) {
      const arr = JSON.parse(rawOld) as StoredBudget[];
      if (Array.isArray(arr) && arr.length > 0) {
        const map: BudgetLimitMap = {};
        for (const b of arr) map[b.name.toLowerCase()] = b.limit;
        return map;
      }
    }
  } catch { /* corrupted */ }
  return null;
}

export function loadBudgetLimits(portalId: string): BudgetLimitMap {
  try {
    const raw = localStorage.getItem(limitsKey(portalId));
    if (raw) {
      const parsed = JSON.parse(raw) as BudgetLimitMap;
      if (typeof parsed === "object" && parsed !== null) return parsed;
    }
  } catch { /* fallthrough */ }

  // Try migrating from legacy
  const migrated = migrateFromLegacy(portalId);
  if (migrated) {
    saveBudgetLimits(portalId, migrated);
    return migrated;
  }

  // First load — use defaults
  saveBudgetLimits(portalId, DEFAULT_LIMITS);
  return { ...DEFAULT_LIMITS };
}

export function saveBudgetLimits(portalId: string, limits: BudgetLimitMap): void {
  localStorage.setItem(limitsKey(portalId), JSON.stringify(limits));
}

export function setBudgetLimit(portalId: string, categoryName: string, limit: number): BudgetLimitMap {
  const limits = loadBudgetLimits(portalId);
  const updated = { ...limits, [categoryName.toLowerCase()]: limit };
  saveBudgetLimits(portalId, updated);
  return updated;
}

export function getBudgetLimit(portalId: string, categoryName: string): number {
  const limits = loadBudgetLimits(portalId);
  return limits[categoryName.toLowerCase()] ?? 0;
}

// ── Legacy exports (kept for type compatibility) ──────────────────────────────

export const DEFAULT_BUDGETS: StoredBudget[] = [
  { id: "rent",          name: "Rent",          limit: 1000, color: "#8b5cf6", iconName: "Home" },
  { id: "utilities",     name: "Utilities",     limit: 150,  color: "#f59e0b", iconName: "Zap" },
  { id: "groceries",     name: "Groceries",     limit: 400,  color: "#10b981", iconName: "ShoppingCart" },
  { id: "transport",     name: "Transport",     limit: 200,  color: "#3b82f6", iconName: "Car" },
  { id: "dining",        name: "Dining",        limit: 200,  color: "#ef4444", iconName: "Utensils" },
  { id: "subscriptions", name: "Subscriptions", limit: 150,  color: "#6366f1", iconName: "CreditCard" },
  { id: "healthcare",    name: "Healthcare",    limit: 100,  color: "#ec4899", iconName: "Heart" },
  { id: "shopping",      name: "Shopping",      limit: 200,  color: "#f97316", iconName: "ShoppingBag" },
  { id: "entertainment", name: "Entertainment", limit: 100,  color: "#14b8a6", iconName: "Tv" },
];
