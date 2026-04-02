// ── useFinanceCategories ─────────────────────────────────────────────────────
// CRUD hook for finance_transaction_categories table.
// Portal-scoped: uses portal.id from context as portal_id filter.
// Falls back to localStorage when Supabase is not configured.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { usePortal } from "@/lib/portalContext";
import { localGetAll } from "@/lib/personalTransactionStore";
import type { FinanceCategory, CostClassification } from "@/types/finance";

import { STORAGE_FINANCE_TX_CATEGORIES_PREFIX } from "@/constants/storageKeys";

const STORAGE_KEY_PREFIX = STORAGE_FINANCE_TX_CATEGORIES_PREFIX;

function storageKey(portalId: string) {
  return `${STORAGE_KEY_PREFIX}_${portalId}`;
}

function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
  return !!url && !url.includes("placeholder");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Default seed categories for localStorage fallback
function getDefaultCategories(portalId: string): FinanceCategory[] {
  const now = new Date().toISOString();
  const make = (name: string, slug: string, type: CostClassification, color: string, icon: string, order: number): FinanceCategory => ({
    id: crypto.randomUUID(), portal_id: portalId, name, slug, type, color, icon,
    is_default: true, is_active: true, sort_order: order,
    created_by: null, updated_by: null, created_at: now, updated_at: now,
  });
  return [
    make("Vendite Prodotti", "vendite-prodotti", "revenue", "#4ade80", "ShoppingBag", 1),
    make("Servizi / Consulenze", "servizi-consulenze", "revenue", "#22c55e", "Briefcase", 2),
    make("Commissioni", "commissioni-revenue", "revenue", "#86efac", "Percent", 3),
    make("Altri Ricavi", "altri-ricavi", "revenue", "#16a34a", "TrendingUp", 4),
    make("Acquisto Merce", "acquisto-merce", "cogs", "#fb923c", "Package", 1),
    make("Spedizioni / Logistica", "spedizioni-logistica", "cogs", "#f97316", "Truck", 2),
    make("Packaging", "packaging", "cogs", "#fdba74", "Box", 3),
    make("Commissioni Piattaforma", "commissioni-piattaforma", "cogs", "#ea580c", "CreditCard", 4),
    make("Affitto / Utenze", "affitto-utenze", "opex", "#f87171", "Home", 1),
    make("Software & Abbonamenti", "software-abbonamenti", "opex", "#ef4444", "Monitor", 2),
    make("Marketing & Pubblicità", "marketing-pubblicita", "opex", "#fca5a5", "Megaphone", 3),
    make("Stipendi / Collaboratori", "stipendi-collaboratori", "opex", "#dc2626", "Users", 4),
    make("Tasse & Contributi", "tasse-contributi", "opex", "#b91c1c", "Receipt", 5),
    make("Spese Legali / Commercialista", "spese-legali", "opex", "#991b1b", "Scale", 6),
    make("Altro OPEX", "altro-opex", "opex", "#7f1d1d", "MoreHorizontal", 7),
  ];
}

export function useFinanceCategories() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from("finance_transaction_categories")
        .select("*")
        .eq("portal_id", toPortalUUID(portalId))
        .order("type")
        .order("sort_order");
      setCategories((data as FinanceCategory[]) ?? []);
    } else {
      const stored = localStorage.getItem(storageKey(portalId));
      if (stored) {
        setCategories(JSON.parse(stored));
      } else {
        const defaults = getDefaultCategories(portalId);
        localStorage.setItem(storageKey(portalId), JSON.stringify(defaults));
        setCategories(defaults);
      }
    }
    setLoading(false);
  }, [portalId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Realtime subscription for live category updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = supabase
      .channel(`finance-categories-${portalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_transaction_categories",
          filter: `portal_id=eq.${toPortalUUID(portalId)}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setCategories((prev) => [...prev, payload.new as FinanceCategory]);
          } else if (payload.eventType === "UPDATE") {
            setCategories((prev) =>
              prev.map((c) => (c.id === (payload.new as FinanceCategory).id ? (payload.new as FinanceCategory) : c)),
            );
          } else if (payload.eventType === "DELETE") {
            setCategories((prev) => prev.filter((c) => c.id !== (payload.old as any).id));
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [portalId]);

  // Save to localStorage
  const persistLocal = useCallback((cats: FinanceCategory[]) => {
    localStorage.setItem(storageKey(portalId), JSON.stringify(cats));
  }, [portalId]);

  // Create
  const createCategory = useCallback(async (input: {
    name: string; type: CostClassification; color?: string; icon?: string;
  }) => {
    const slug = slugify(input.name);
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("finance_transaction_categories")
        .insert({ portal_id: toPortalUUID(portalId), name: input.name, slug, type: input.type, color: input.color ?? "#e8ff00", icon: input.icon ?? "tag", sort_order: categories.length })
        .select().single();
      if (error) return { error: error.message };
      setCategories(prev => [...prev, data as FinanceCategory]);
      return { data: data as FinanceCategory };
    } else {
      const cat: FinanceCategory = {
        id: crypto.randomUUID(), portal_id: portalId, name: input.name, slug, type: input.type,
        color: input.color ?? "#e8ff00", icon: input.icon ?? "tag",
        is_default: false, is_active: true, sort_order: categories.length,
        created_by: null, updated_by: null, created_at: now, updated_at: now,
      };
      const updated = [...categories, cat];
      setCategories(updated);
      persistLocal(updated);
      return { data: cat };
    }
  }, [portalId, categories, persistLocal]);

  // Update
  const updateCategory = useCallback(async (id: string, input: Partial<FinanceCategory>) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("finance_transaction_categories")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id).select().single();
      if (error) return { error: error.message };
      setCategories(prev => prev.map(c => c.id === id ? (data as FinanceCategory) : c));
      return { data: data as FinanceCategory };
    } else {
      const updated = categories.map(c => c.id === id ? { ...c, ...input, updated_at: new Date().toISOString() } : c);
      setCategories(updated);
      persistLocal(updated);
      return { data: updated.find(c => c.id === id)! };
    }
  }, [categories, persistLocal]);

  // Delete
  const deleteCategory = useCallback(async (id: string) => {
    // Check for orphaned transactions before deleting
    const cat = categories.find(c => c.id === id);
    if (cat) {
      let txCount = 0;
      if (isSupabaseConfigured()) {
        const { count, error: countErr } = await supabase
          .from("personal_transactions")
          .select("id", { count: "exact", head: true })
          .eq("portal_id", toPortalUUID(portalId))
          .eq("category_id", id);
        if (!countErr && count != null) txCount = count;
      } else {
        txCount = localGetAll(portalId).filter(t => t.category_id === id || t.category === cat.name).length;
      }
      if (txCount > 0) {
        return { error: `Cannot delete category: ${txCount} transaction${txCount === 1 ? "" : "s"} still use it` };
      }
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("finance_transaction_categories").delete().eq("id", id);
      if (error) return { error: error.message };
    }
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    persistLocal(updated);
    return {};
  }, [categories, persistLocal, portalId]);

  // Toggle active
  const toggleActive = useCallback(async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    return updateCategory(id, { is_active: !cat.is_active });
  }, [categories, updateCategory]);

  // Filter by type
  const getCategoriesByType = useCallback((type: CostClassification) => {
    return categories.filter(c => c.type === type && c.is_active);
  }, [categories]);

  // Grouped by type
  const grouped = useMemo(() => ({
    revenue: categories.filter(c => c.type === "revenue"),
    cogs: categories.filter(c => c.type === "cogs"),
    opex: categories.filter(c => c.type === "opex"),
    other: categories.filter(c => c.type === "other"),
  }), [categories]);

  return {
    categories, loading, grouped,
    fetchCategories, createCategory, updateCategory, deleteCategory, toggleActive,
    getCategoriesByType,
  };
}
