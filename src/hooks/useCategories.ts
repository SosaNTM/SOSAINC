// ── useCategories ────────────────────────────────────────────────────────────
// SINGLE source of truth for personal finance categories.
// Portal-scoped: each portal gets its own isolated category list.
// Reads from localStorage via financeCategoryStore.

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePortal } from "@/lib/portalContext";
import {
  getAllCategories,
  addCategory as storeAdd,
  updateCategory as storeUpdate,
  removeCategory as storeRemove,
  toggleActiveCategory as storeToggle,
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

export function useCategories() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [categories, setCategories] = useState<FinanceCategory[]>(() => getAllCategories(portalId));

  const refresh = useCallback(() => {
    setCategories(getAllCategories(portalId));
  }, [portalId]);

  // Re-load when portal switches
  useEffect(() => {
    setCategories(getAllCategories(portalId));
  }, [portalId]);

  // Listen for portal-scoped CustomEvent broadcasts
  useEffect(() => {
    const eventName = getCategoryUpdateEvent(portalId);
    const handler = () => refresh();
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [portalId, refresh]);

  // Re-read on window focus (cross-tab sync)
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

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

  // ── Color map ─────────────────────────────────────────────────────────

  const categoryColorMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.color])),
    [categories],
  );

  // ── Mutations ─────────────────────────────────────────────────────────

  const createCategory = useCallback(
    (data: {
      name: string;
      icon: string;
      color: string;
      type: "income" | "expense";
    }): FinanceCategory | null => {
      const existing = getAllCategories(portalId);
      if (existing.some((c) => c.name.toLowerCase() === data.name.toLowerCase())) {
        return null; // duplicate
      }
      const maxOrder = existing
        .filter((c) => c.type === data.type)
        .reduce((max, c) => Math.max(max, c.sort_order), 0);
      const newCat = storeAdd(portalId, {
        name: data.name,
        slug: slugify(data.name),
        icon: data.icon,
        color: data.color,
        type: data.type,
        sort_order: maxOrder + 1,
        is_default: false,
        is_active: true,
      });
      refresh();
      return newCat;
    },
    [portalId, refresh],
  );

  const updateCategory = useCallback(
    (id: string, changes: Partial<Omit<FinanceCategory, "id">>): void => {
      const updates = { ...changes };
      if (updates.name) updates.slug = slugify(updates.name);
      storeUpdate(portalId, id, updates);
      refresh();
    },
    [portalId, refresh],
  );

  const toggleCategory = useCallback(
    (id: string): void => {
      storeToggle(portalId, id);
      refresh();
    },
    [portalId, refresh],
  );

  const deleteCategory = useCallback(
    (id: string): void => {
      storeRemove(portalId, id);
      refresh();
    },
    [portalId, refresh],
  );

  return {
    allCategories,
    expenseCategories,
    incomeCategories,
    activeExpenseCategories,
    activeIncomeCategories,
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
