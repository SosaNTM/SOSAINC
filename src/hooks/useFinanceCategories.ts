// ── useFinanceCategories ─────────────────────────────────────────────────────
// CRUD hook for finance_transaction_categories table. Supabase-only.
// Portal-scoped via currentPortalId from portalContextDB.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { FinanceCategory, CostClassification } from "@/types/finance";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function useFinanceCategories() {
  const { currentPortalId } = usePortalDB();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("finance_transaction_categories")
      .select("*")
      .eq("portal_id", currentPortalId)
      .order("type")
      .order("sort_order");
    if (error) {
      console.error("fetchCategories:", error.message);
      setCategories([]);
    } else {
      setCategories((data as FinanceCategory[]) ?? []);
    }
    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Realtime subscription
  useEffect(() => {
    if (!currentPortalId) return;
    const channel = supabase
      .channel(`finance-categories-${currentPortalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_transaction_categories",
          filter: `portal_id=eq.${currentPortalId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setCategories((prev) => [...prev, payload.new as FinanceCategory]);
          } else if (payload.eventType === "UPDATE") {
            setCategories((prev) =>
              prev.map((c) => (c.id === (payload.new as FinanceCategory).id ? (payload.new as FinanceCategory) : c)),
            );
          } else if (payload.eventType === "DELETE") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setCategories((prev) => prev.filter((c) => c.id !== (payload.old as any).id));
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentPortalId]);

  const createCategory = useCallback(async (input: {
    name: string; type: CostClassification; color?: string; icon?: string;
  }) => {
    if (!currentPortalId) return { error: "No portal selected" };
    const slug = slugify(input.name);
    const { data, error } = await supabase
      .from("finance_transaction_categories")
      .insert({
        portal_id: currentPortalId,
        name: input.name,
        slug,
        type: input.type,
        color: input.color ?? "#e8ff00",
        icon: input.icon ?? "tag",
        sort_order: categories.length,
      })
      .select().single();
    if (error) return { error: error.message };
    setCategories(prev => [...prev, data as FinanceCategory]);
    return { data: data as FinanceCategory };
  }, [currentPortalId, categories]);

  const updateCategory = useCallback(async (id: string, input: Partial<FinanceCategory>) => {
    const { data, error } = await supabase
      .from("finance_transaction_categories")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) return { error: error.message };
    setCategories(prev => prev.map(c => c.id === id ? (data as FinanceCategory) : c));
    return { data: data as FinanceCategory };
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat && currentPortalId) {
      const { count, error: countErr } = await supabase
        .from("personal_transactions")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("category_id", id);
      const txCount = !countErr && count != null ? count : 0;
      if (txCount > 0) {
        return { error: `Cannot delete category: ${txCount} transaction${txCount === 1 ? "" : "s"} still use it` };
      }
    }

    const { error } = await supabase.from("finance_transaction_categories").delete().eq("id", id);
    if (error) return { error: error.message };
    setCategories(prev => prev.filter(c => c.id !== id));
    return {};
  }, [categories, currentPortalId]);

  const toggleActive = useCallback(async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    return updateCategory(id, { is_active: !cat.is_active });
  }, [categories, updateCategory]);

  const getCategoriesByType = useCallback((type: CostClassification) => {
    return categories.filter(c => c.type === type && c.is_active);
  }, [categories]);

  const grouped = useMemo(() => ({
    revenue: categories.filter(c => c.type === "revenue"),
    cogs:    categories.filter(c => c.type === "cogs"),
    opex:    categories.filter(c => c.type === "opex"),
    other:   categories.filter(c => c.type === "other"),
  }), [categories]);

  return {
    categories, loading, grouped,
    fetchCategories, createCategory, updateCategory, deleteCategory, toggleActive,
    getCategoriesByType,
  };
}
