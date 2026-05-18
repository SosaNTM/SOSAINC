// ── Personal Finance Category — types + defaults ─────────────────────────────
// Data lives in Supabase `finance_transaction_categories` (filtered by type IN
// ('income','expense')). This module exposes only types, hardcoded defaults
// (used as catalog seed when the DB returns no rows), and the broadcast event
// name used by hooks to coordinate updates across components.

export interface PersonalFinanceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
}

/** Per-portal CustomEvent name dispatched after a category mutation. */
export function getCategoryUpdateEvent(portalId: string): string {
  return `finance-category-update-${portalId}`;
}

export const CATEGORY_UPDATE_EVENT = "finance-category-update-sosa";

// ── Default catalog (read-only fallback when DB is empty) ────────────────────

const DEFAULT_EXPENSE_CATEGORIES: PersonalFinanceCategory[] = [
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

const DEFAULT_INCOME_CATEGORIES: PersonalFinanceCategory[] = [
  { id: "cat-salary",        name: "Salary",        slug: "salary",        icon: "💰", color: "#4ade80", type: "income", sort_order: 1,  is_default: true, is_active: true },
  { id: "cat-freelance",     name: "Freelance",     slug: "freelance",     icon: "💻", color: "#34d399", type: "income", sort_order: 2,  is_default: true, is_active: true },
  { id: "cat-investments",   name: "Investments",   slug: "investments",   icon: "📈", color: "#22d3ee", type: "income", sort_order: 3,  is_default: true, is_active: true },
  { id: "cat-sales",         name: "Sales",         slug: "sales",         icon: "🏷️", color: "#a78bfa", type: "income", sort_order: 4,  is_default: true, is_active: true },
  { id: "cat-refunds",       name: "Refunds",       slug: "refunds",       icon: "🔄", color: "#fbbf24", type: "income", sort_order: 5,  is_default: true, is_active: true },
  { id: "cat-rental-income", name: "Rental Income", slug: "rental-income", icon: "🏢", color: "#2dd4bf", type: "income", sort_order: 6,  is_default: true, is_active: true },
  { id: "cat-other-income",  name: "Other",         slug: "other-income",  icon: "📌", color: "#94a3b8", type: "income", sort_order: 99, is_default: true, is_active: true },
];

export const DEFAULT_CATEGORIES: PersonalFinanceCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

/**
 * Returns the hardcoded catalog of default income/expense categories. Used as
 * a sync fallback for color/icon lookups when a hook context is not available.
 * For user-editable category data, use the `useCategories` hook (DB-backed).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAllCategories(_portalId: string): PersonalFinanceCategory[] {
  return DEFAULT_CATEGORIES;
}
