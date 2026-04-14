import { useState, useEffect, useCallback } from "react";

export interface BudgetStateResult {
  selectedCategory: string | null;
  isPanelOpen: boolean;
  month: number; // 0-indexed
  year: number;
  openCategory: (catId: string) => void;
  closeCategoryPanel: () => void;
  prevMonth: () => void;
  nextMonth: () => void;
}

/**
 * Manages budget page interactive state:
 * - Which category is selected (drives BudgetCategoryPanel)
 * - Month/year navigation (closes panel on change)
 * - ESC key handler
 */
export function useBudgetState(): BudgetStateResult {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear]   = useState(() => new Date().getFullYear());

  const openCategory = useCallback((catId: string) => {
    setSelectedCategory(catId);
    setIsPanelOpen(true);
  }, []);

  const closeCategoryPanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedCategory(null);
  }, []);

  const prevMonth = useCallback(() => {
    closeCategoryPanel();
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month, closeCategoryPanel]);

  const nextMonth = useCallback(() => {
    closeCategoryPanel();
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }, [month, closeCategoryPanel]);

  // ESC closes the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPanelOpen) closeCategoryPanel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isPanelOpen, closeCategoryPanel]);

  return {
    selectedCategory,
    isPanelOpen,
    month,
    year,
    openCategory,
    closeCategoryPanel,
    prevMonth,
    nextMonth,
  };
}
