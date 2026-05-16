// ── useCategories ────────────────────────────────────────────────────────────
// SINGLE source of truth for personal income/expense finance categories.
// Backed by `finance_transaction_categories` table filtered by type IN ('income','expense').
// Falls back to hardcoded DEFAULT_CATEGORIES when DB returns no rows.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { usePortalDB } from "@/lib/portalContextDB";
import {
  DEFAULT_CATEGORIES,
  getCategoryUpdateEvent,
  type FinanceCategory,
} from "@/lib/financeCategoryStore";

export type { FinanceCategory } from "@/lib/financeCategoryStore";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dbRowToCategory(row: Record<string, unknown>): FinanceCategory {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    icon: (row.icon as string) ?? "📌",
    color: (row.color as string) ?? "#94a3b8",
    type: row.type as "income" | "expense",
    sort_order: Number(row.sort_order ?? 0),
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.is_active),
  };
}

export function useCategories() {
  const { currentPortalId } = usePortalDB();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const broadcast = useCallback(() => {
    if (!currentPortalId) return;
    window.dispatchEvent(new CustomEvent(getCategoryUpdateEvent(currentPortalId)));
  }, [currentPortalId]);

  const refresh = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("finance_transaction_categories")
      .select("*")
      .eq("portal_id", currentPortalId)
      .in("type", ["income", "expense"])
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("useCategories load:", error.message);
      setCategories([]);
    } else if (data && data.length > 0) {
      setCategories((data as Record<string, unknown>[]).map(dbRowToCategory));
    } else {
      // DB empty for this portal → fall back to read-only hardcoded defaults
      setCategories(DEFAULT_CATEGORIES);
    }
    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Listen for portal-scoped broadcast events
  useEffect(() => {
    if (!currentPortalId) return;
    const eventName = getCategoryUpdateEvent(currentPortalId);
    const handler = () => { void refresh(); };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [currentPortalId, refresh]);

  // ── Filtered getters ────────────────────────────────────────────────────

  const allCategories = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );

  const expenseCategories = useMemo(
    () => allCategories.filter((c) => c.type === "expense"),
    [allCategories],
  );

  const incomeCategories = useMemo(
    () => allCategories.filter((c) => c.type === "income"),
    [allCategories],
  );

  const activeExpenseCategories = useMemo(
    () => expenseCategories.filter((c) => c.is_active),
    [expenseCategories],
  );

  const activeIncomeCategories = useMemo(
    () => incomeCategories.filter((c) => c.is_active),
    [incomeCategories],
  );

  // ── Lookups ─────────────────────────────────────────────────────────────

  const getCategoryBySlug = useCallback(
    (slug: string): FinanceCategory | undefined =>
      categories.find((c) => c.slug === slug),
    [categories],
  );

  const getCategoryByName = useCallback(
    (name: string): FinanceCategory | undefined =>
      categories.find((c) => c.name.toLowerCase() === name.toLowerCase()),
    [categories],
  );

  const getCategoryColor = useCallback(
    (name: string): string =>
      categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.color ?? "#6b7280",
    [categories],
  );

  const getCategoryIcon = useCallback(
    (name: string): string =>
      categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.icon ?? "📌",
    [categories],
  );

  const categoryColorMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.color])),
    [categories],
  );

  // ── Mutations ─────────────────────────────────────────────────────────

  const createCategory = useCallback(
    async (data: {
      name: string;
      icon: string;
      color: string;
      type: "income" | "expense";
    }): Promise<FinanceCategory | null> => {
      if (!currentPortalId) return null;
      if (categories.some((c) => c.name.toLowerCase() === data.name.toLowerCase())) {
        return null;
      }
      const maxOrder = categories
        .filter((c) => c.type === data.type)
        .reduce((max, c) => Math.max(max, c.sort_order), 0);
      const { data: row, error } = await supabase
        .from("finance_transaction_categories")
        .insert({
          portal_id: currentPortalId,
          name: data.name,
          slug: slugify(data.name),
          icon: data.icon,
          color: data.color,
          type: data.type,
          sort_order: maxOrder + 1,
          is_default: false,
          is_active: true,
        })
        .select()
        .single();
      if (error || !row) {
        console.error("createCategory:", error?.message);
        return null;
      }
      const newCat = dbRowToCategory(row as Record<string, unknown>);
      setCategories((prev) => [...prev, newCat]);
      broadcast();
      return newCat;
    },
    [currentPortalId, categories, broadcast],
  );

  const updateCategory = useCallback(
    async (id: string, changes: Partial<Omit<FinanceCategory, "id">>): Promise<void> => {
      const updates: Partial<FinanceCategory> = { ...changes };
      if (updates.name) updates.slug = slugify(updates.name);
      const { data, error } = await supabase
        .from("finance_transaction_categories")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error || !data) {
        console.error("updateCategory:", error?.message);
        return;
      }
      const updated = dbRowToCategory(data as Record<string, unknown>);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      broadcast();
    },
    [broadcast],
  );

  const toggleCategory = useCallback(
    async (id: string): Promise<void> => {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return;
      await updateCategory(id, { is_active: !cat.is_active });
    },
    [categories, updateCategory],
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("finance_transaction_categories")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("deleteCategory:", error.message);
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      broadcast();
    },
    [broadcast],
  );

  return {
    allCategories,
    expenseCategories,
    incomeCategories,
    activeExpenseCategories,
    activeIncomeCategories,
    loading,
    getCategoryBySlug,
    getCategoryByName,
    getCategoryColor,
    getCategoryIcon,
    categoryColorMap,
    createCategory,
    updateCategory,
    toggleCategory,
    deleteCategory,
  };
}
