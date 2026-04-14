// ── Personal Transaction Local Store ──────────────────────────────────────────
// localStorage fallback used when Supabase is not configured.
// All functions accept a portalId so each portal has isolated transaction data.

import type { PersonalTransaction, NewPersonalTransaction, TransactionFilters } from "@/types/finance";

import { STORAGE_PERSONAL_TX_PREFIX, STORAGE_PERSONAL_TX_LEGACY } from "@/constants/storageKeys";

const KEY_PREFIX = STORAGE_PERSONAL_TX_PREFIX;
const LEGACY_KEY = STORAGE_PERSONAL_TX_LEGACY; // old non-portal key (migration source)

function storageKey(portalId: string): string {
  return `${KEY_PREFIX}_${portalId}`;
}

/** Try to migrate data from the old non-portal key (only for "sosa"). */
function migrateFromLegacy(portalId: string): PersonalTransaction[] | null {
  if (portalId !== "sosa") return null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersonalTransaction[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* corrupted */ }
  return null;
}

function load(portalId: string): PersonalTransaction[] {
  try {
    const raw = localStorage.getItem(storageKey(portalId));
    if (raw) return JSON.parse(raw) as PersonalTransaction[];
  } catch { /* corrupted */ }

  // Try migration from legacy (sosa only)
  const migrated = migrateFromLegacy(portalId);
  if (migrated) {
    save(migrated, portalId);
    return migrated;
  }

  return [];
}

function save(txs: PersonalTransaction[], portalId: string): void {
  localStorage.setItem(storageKey(portalId), JSON.stringify(txs));
}

export function localGetAll(portalId: string): PersonalTransaction[] {
  return load(portalId);
}

export function localAdd(data: NewPersonalTransaction, userId: string, portalId: string): PersonalTransaction {
  const txs = load(portalId);
  const now = new Date().toISOString();
  const tx: PersonalTransaction = {
    ...data,
    id:         `local_${Date.now()}`,
    user_id:    userId,
    created_at: now,
    updated_at: now,
  };
  save([tx, ...txs], portalId);
  return tx;
}

export function localUpdate(id: string, changes: Partial<NewPersonalTransaction>, portalId: string): void {
  const txs = load(portalId).map((t) =>
    t.id === id ? { ...t, ...changes, updated_at: new Date().toISOString() } : t
  );
  save(txs, portalId);
}

export function localDelete(id: string, portalId: string): void {
  save(load(portalId).filter((t) => t.id !== id), portalId);
}

export function applyFilters(txs: PersonalTransaction[], filters: TransactionFilters): PersonalTransaction[] {
  return txs.filter((tx) => {
    if (filters.type                && tx.type                !== filters.type)               return false;
    if (filters.category            && tx.category            !== filters.category)           return false;
    if (filters.costClassification  && tx.cost_classification !== filters.costClassification) return false;
    if (filters.categoryId          && tx.category_id         !== filters.categoryId)         return false;
    if (filters.dateFrom && tx.date < filters.dateFrom)       return false;
    if (filters.dateTo   && tx.date > filters.dateTo)         return false;
    if (filters.minAmount && tx.amount < filters.minAmount)   return false;
    if (filters.maxAmount && tx.amount > filters.maxAmount)   return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!tx.description?.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
