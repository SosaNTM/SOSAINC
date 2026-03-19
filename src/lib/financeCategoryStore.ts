// ── Personal Finance Category Store ──────────────────────────────────────────
// localStorage persistence for personal finance categories.
// All functions accept a portalId so each portal has isolated category data.

export interface FinanceCategory {
  id: string;
  name: string;           // English: "Shopping", "Rent", "Salary"
  slug: string;           // "shopping", "rent", "salary"
  icon: string;           // Emoji: "🛍️", "🏠", "💰"
  color: string;          // Hex: "#f97316"
  type: 'income' | 'expense';
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
}

const KEY_PREFIX = "finance_categories";
const LEGACY_KEY = "finance_categories"; // old non-portal key (migration source)

/** Returns the portal-scoped localStorage key. */
function storageKey(portalId: string): string {
  return `${KEY_PREFIX}_${portalId}`;
}

/** Returns the CustomEvent name for a given portal — scoped to avoid cross-portal noise. */
export function getCategoryUpdateEvent(portalId: string): string {
  return `finance-category-update-${portalId}`;
}

/** Kept for backward compatibility — resolves to the sosa portal's event. */
export const CATEGORY_UPDATE_EVENT = "finance-category-update-sosa";

// ── Default Categories (ALL ENGLISH) ────────────────────────────────────────

const DEFAULT_EXPENSE_CATEGORIES: FinanceCategory[] = [
  { id: "cat-rent",          name: "Rent",          slug: "rent",          icon: "🏠", color: "#8b5cf6", type: "expense", sort_order: 1,  is_default: true, is_active: true },
  { id: "cat-utilities",     name: "Utilities",     slug: "utilities",     icon: "💡", color: "#f59e0b", type: "expense", sort_order: 2,  is_default: true, is_active: true },
  { id: "cat-groceries",     name: "Groceries",     slug: "groceries",     icon: "🛒", color: "#10b981", type: "expense", sort_order: 3,  is_default: true, is_active: true },
  { id: "cat-transport",     name: "Transport",     slug: "transport",     icon: "🚗", color: "#3b82f6", type: "expense", sort_order: 4,  is_default: true, is_active: true },
  { id: "cat-dining",        name: "Dining",        slug: "dining",        icon: "🍽️", color: "#ef4444", type: "expense", sort_order: 5,  is_default: true, is_active: true },
  { id: "cat-subscriptions", name: "Subscriptions", slug: "subscriptions", icon: "📱", color: "#6366f1", type: "expense", sort_order: 6,  is_default: true, is_active: true },
  { id: "cat-healthcare",    name: "Healthcare",    slug: "healthcare",    icon: "🏥", color: "#ec4899", type: "expense", sort_order: 7,  is_default: true, is_active: true },
  { id: "cat-shopping",      name: "Shopping",      slug: "shopping",      icon: "🛍️", color: "#f97316", type: "expense", sort_order: 8,  is_default: true, is_active: true },
  { id: "cat-entertainment", name: "Entertainment", slug: "entertainment", icon: "🎬", color: "#14b8a6", type: "expense", sort_order: 9,  is_default: true, is_active: true },
  { id: "cat-education",     name: "Education",     slug: "education",     icon: "📚", color: "#7c3aed", type: "expense", sort_order: 10, is_default: true, is_active: true },
  { id: "cat-taxes",         name: "Taxes",         slug: "taxes",         icon: "📋", color: "#64748b", type: "expense", sort_order: 11, is_default: true, is_active: true },
  { id: "cat-insurance",     name: "Insurance",     slug: "insurance",     icon: "🛡️", color: "#475569", type: "expense", sort_order: 12, is_default: true, is_active: true },
  { id: "cat-personal-care", name: "Personal Care", slug: "personal-care", icon: "💇", color: "#d946ef", type: "expense", sort_order: 13, is_default: true, is_active: true },
  { id: "cat-gifts",         name: "Gifts",         slug: "gifts",         icon: "🎁", color: "#fb923c", type: "expense", sort_order: 14, is_default: true, is_active: true },
  { id: "cat-other-expense", name: "Other",         slug: "other-expense", icon: "📌", color: "#94a3b8", type: "expense", sort_order: 99, is_default: true, is_active: true },
];

const DEFAULT_INCOME_CATEGORIES: FinanceCategory[] = [
  { id: "cat-salary",        name: "Salary",        slug: "salary",        icon: "💰", color: "#4ade80", type: "income", sort_order: 1,  is_default: true, is_active: true },
  { id: "cat-freelance",     name: "Freelance",     slug: "freelance",     icon: "💻", color: "#34d399", type: "income", sort_order: 2,  is_default: true, is_active: true },
  { id: "cat-investments",   name: "Investments",   slug: "investments",   icon: "📈", color: "#22d3ee", type: "income", sort_order: 3,  is_default: true, is_active: true },
  { id: "cat-sales",         name: "Sales",         slug: "sales",         icon: "🏷️", color: "#a78bfa", type: "income", sort_order: 4,  is_default: true, is_active: true },
  { id: "cat-refunds",       name: "Refunds",       slug: "refunds",       icon: "🔄", color: "#fbbf24", type: "income", sort_order: 5,  is_default: true, is_active: true },
  { id: "cat-rental-income", name: "Rental Income", slug: "rental-income", icon: "🏢", color: "#2dd4bf", type: "income", sort_order: 6,  is_default: true, is_active: true },
  { id: "cat-other-income",  name: "Other",         slug: "other-income",  icon: "📌", color: "#94a3b8", type: "income", sort_order: 99, is_default: true, is_active: true },
];

const ALL_DEFAULTS: FinanceCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

// ── Storage Operations ──────────────────────────────────────────────────────

/** Try to migrate data from the old non-portal key (only for "sosa"). */
function migrateFromLegacy(portalId: string): FinanceCategory[] | null {
  if (portalId !== "sosa") return null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FinanceCategory[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* corrupted */ }
  return null;
}

function load(portalId: string): FinanceCategory[] {
  try {
    const raw = localStorage.getItem(storageKey(portalId));
    if (raw) {
      const parsed = JSON.parse(raw) as FinanceCategory[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* corrupted — fall through */ }

  // Try migration from legacy (sosa only)
  const migrated = migrateFromLegacy(portalId);
  if (migrated) {
    save(migrated, portalId);
    return migrated;
  }

  // Seed defaults on first load
  const defaults = ALL_DEFAULTS.map((c) => ({ ...c }));
  save(defaults, portalId);
  return defaults;
}

function save(categories: FinanceCategory[], portalId: string): void {
  localStorage.setItem(storageKey(portalId), JSON.stringify(categories));
}

function broadcast(portalId: string): void {
  window.dispatchEvent(new CustomEvent(getCategoryUpdateEvent(portalId)));
}

// ── CRUD Operations ─────────────────────────────────────────────────────────

export function getAllCategories(portalId: string): FinanceCategory[] {
  return load(portalId);
}

export function addCategory(portalId: string, category: Omit<FinanceCategory, "id">): FinanceCategory {
  const cats = load(portalId);
  const newCat: FinanceCategory = {
    ...category,
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  save([...cats, newCat], portalId);
  broadcast(portalId);
  return newCat;
}

export function updateCategory(
  portalId: string,
  id: string,
  changes: Partial<Omit<FinanceCategory, "id">>,
): void {
  const cats = load(portalId);
  const updated = cats.map((c) => (c.id === id ? { ...c, ...changes } : c));
  save(updated, portalId);
  broadcast(portalId);
}

export function removeCategory(portalId: string, id: string): void {
  const cats = load(portalId);
  save(cats.filter((c) => c.id !== id), portalId);
  broadcast(portalId);
}

export function toggleActiveCategory(portalId: string, id: string): void {
  const cats = load(portalId);
  const updated = cats.map((c) =>
    c.id === id ? { ...c, is_active: !c.is_active } : c,
  );
  save(updated, portalId);
  broadcast(portalId);
}

export function reorderCategories(portalId: string, orderedIds: string[]): void {
  const cats = load(portalId);
  const updated = cats.map((c) => {
    const newOrder = orderedIds.indexOf(c.id);
    return newOrder >= 0 ? { ...c, sort_order: newOrder + 1 } : c;
  });
  save(updated, portalId);
  broadcast(portalId);
}
