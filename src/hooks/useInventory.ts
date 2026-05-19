// ── useInventory ────────────────────────────────────────────────────────────
//
// Portal-scoped: Supabase inventory_items filtered by portal_id. No localStorage.

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { supabase as _supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;
import { useAuth } from "@/lib/authContext";
import { usePortalDB } from "@/lib/portalContextDB";

// ── Types ────────────────────────────────────────────────────────────────────

export type InventoryCondition = "new" | "excellent" | "good" | "fair" | "poor";
export type InventoryStatus = "in_stock" | "listed" | "sold" | "shipped" | "returned";
export type InventoryPlatform = "vestiaire" | "depop" | "vinted" | "wallapop" | "ebay" | "shopify" | "other";

export interface InventoryItem {
  id: string;
  portal_id: string;
  name: string;
  brand?: string;
  category?: string;
  size?: string;
  condition: InventoryCondition;
  purchase_price: number;
  listing_price?: number;
  sale_price?: number;
  sku?: string;
  status: InventoryStatus;
  platform?: InventoryPlatform;
  platform_url?: string;
  platform_listing_id?: string;
  purchase_date?: string;
  sale_date?: string;
  notes?: string;
  image_url?: string;
  description?: string;
  amount: number;
  item_value: number;
  created_at: string;
  updated_at: string;
}

export type NewInventoryItem = Omit<InventoryItem, "id" | "portal_id" | "created_at" | "updated_at">;

export interface UseInventoryResult {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  totalItems: number;
  totalValue: number;
  totalProfit: number;
  addItem: (data: NewInventoryItem) => Promise<boolean>;
  updateItem: (id: string, changes: Partial<NewInventoryItem>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  refetch: () => void;
}

function toInventoryItem(row: Record<string, unknown>): InventoryItem {
  return {
    id:                   row.id as string,
    portal_id:            row.portal_id as string,
    name:                 row.name as string,
    brand:                (row.brand as string | undefined) ?? undefined,
    category:             (row.category as string | undefined) ?? undefined,
    size:                 (row.size as string | undefined) ?? undefined,
    condition:            (row.condition as InventoryCondition) ?? "good",
    purchase_price:       Number(row.purchase_price ?? 0),
    listing_price:        row.listing_price != null ? Number(row.listing_price) : undefined,
    sale_price:           row.sale_price != null ? Number(row.sale_price) : undefined,
    sku:                  (row.sku as string | undefined) ?? undefined,
    status:               (row.status as InventoryStatus) ?? "in_stock",
    platform:             (row.platform as InventoryPlatform | undefined) ?? undefined,
    platform_url:         (row.platform_url as string | undefined) ?? undefined,
    platform_listing_id:  (row.platform_listing_id as string | undefined) ?? undefined,
    purchase_date:        (row.purchase_date as string | undefined) ?? undefined,
    sale_date:            (row.sale_date as string | undefined) ?? undefined,
    notes:                (row.notes as string | undefined) ?? undefined,
    image_url:            (row.image_url as string | undefined) ?? undefined,
    description:          (row.description as string | undefined) ?? undefined,
    amount:               Number(row.amount ?? 1),
    item_value:           Number(row.item_value ?? 0),
    created_at:           (row.created_at as string) ?? new Date().toISOString(),
    updated_at:           (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export function useInventory(): UseInventoryResult {
  const { user } = useAuth();
  const { currentPortalId } = usePortalDB();

  const [all, setAll] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!user || !currentPortalId) { setIsLoading(false); return; }
    setError(null);

    const { data, error: err } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("portal_id", currentPortalId)
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
      setAll([]);
    } else {
      setAll((data as Record<string, unknown>[] | null ?? []).map(toInventoryItem));
    }
    setIsLoading(false);
  }, [user, currentPortalId, tick]);

  useEffect(() => { void load(); }, [load]);

  const totalItems = all.length;
  const totalValue = useMemo(
    () => all.reduce((sum, item) => sum + item.item_value, 0),
    [all]
  );
  const totalProfit = useMemo(
    () =>
      all
        .filter((item) => item.status === "sold" && item.sale_price != null)
        .reduce((sum, item) => sum + ((item.sale_price ?? 0) - item.purchase_price), 0),
    [all]
  );

  const addItem = useCallback(
    async (data: NewInventoryItem): Promise<boolean> => {
      if (!user || !currentPortalId) return false;
      const { error: err } = await supabase
        .from("inventory_items")
        .insert({ ...data, portal_id: currentPortalId });
      if (err) {
        toast.error(`Item not saved: ${err.message}`);
        return false;
      }
      setTick((t) => t + 1);
      toast.success("Item added");
      return true;
    },
    [user, currentPortalId]
  );

  const updateItem = useCallback(
    async (id: string, changes: Partial<NewInventoryItem>): Promise<boolean> => {
      if (!user || !currentPortalId) return false;
      const { error: err } = await supabase
        .from("inventory_items")
        .update(changes)
        .eq("id", id)
        .eq("portal_id", currentPortalId);
      if (err) {
        toast.error(`Item not updated: ${err.message}`);
        return false;
      }
      setTick((t) => t + 1);
      toast.success("Item updated");
      return true;
    },
    [user, currentPortalId]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user || !currentPortalId) return false;
      const { error: err } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", id)
        .eq("portal_id", currentPortalId);
      if (err) {
        toast.error(`Item not deleted: ${err.message}`);
        return false;
      }
      setTick((t) => t + 1);
      toast.success("Item deleted");
      return true;
    },
    [user, currentPortalId]
  );

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { items: all, isLoading, error, totalItems, totalValue, totalProfit, addItem, updateItem, deleteItem, refetch };
}
