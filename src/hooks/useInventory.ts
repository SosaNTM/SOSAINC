// ── useInventory ────────────────────────────────────────────────────────────
//
// Portal-scoped: each portal has its own isolated inventory data.
// Primary: Supabase inventory_items filtered by portal_id.
// Fallback: portal-scoped localStorage store.

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { dynamicSupabase as supabase } from "@/lib/portalDb";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { STORAGE_INVENTORY_PREFIX } from "@/constants/storageKeys";

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
  // Digital Stock Manager fields (added in 20260408000002_inventory_attachments.sql)
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
  return !!url && !url.includes("placeholder");
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

function storageKey(portalId: string): string {
  return `${STORAGE_INVENTORY_PREFIX}${portalId}`;
}

function localGetAll(portalId: string): InventoryItem[] {
  try {
    const raw = localStorage.getItem(storageKey(portalId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InventoryItem[]) : [];
  } catch {
    return [];
  }
}

function localSave(portalId: string, items: InventoryItem[]): void {
  localStorage.setItem(storageKey(portalId), JSON.stringify(items));
}

function localAdd(data: NewInventoryItem, portalId: string): InventoryItem {
  const items = localGetAll(portalId);
  const now = new Date().toISOString();
  const newItem: InventoryItem = {
    amount: 1,
    item_value: 0,
    ...data,
    id: crypto.randomUUID(),
    portal_id: portalId,
    created_at: now,
    updated_at: now,
  };
  localSave(portalId, [newItem, ...items]);
  return newItem;
}

function localUpdate(id: string, changes: Partial<NewInventoryItem>, portalId: string): void {
  const items = localGetAll(portalId);
  const updated = items.map((item) =>
    item.id === id ? { ...item, ...changes, updated_at: new Date().toISOString() } : item
  );
  localSave(portalId, updated);
}

function localDelete(id: string, portalId: string): void {
  const items = localGetAll(portalId);
  localSave(portalId, items.filter((item) => item.id !== id));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useInventory(): UseInventoryResult {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [all, setAll] = useState<InventoryItem[]>(() => localGetAll(portalId));
  const [isLoading, setIsLoading] = useState(() => localGetAll(portalId).length === 0);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setError(null);

    if (isSupabaseConfigured()) {
      const { data, error: err } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("portal_id", portalId)
        .order("created_at", { ascending: false });

      if (!err && data) {
        setAll((data as Record<string, unknown>[]).map(toInventoryItem));
        setIsLoading(false);
        return;
      }
    }

    // Fallback: portal-scoped localStorage
    setAll(localGetAll(portalId));
    setIsLoading(false);
  }, [user, portalId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // On portal change: load that portal's cache immediately
  useEffect(() => { const c = localGetAll(portalId); setAll(c); setIsLoading(c.length === 0); }, [portalId]);
  useEffect(() => { load(); }, [load]);

  // Derived stats
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
      if (!user) return false;
      try {
        if (isSupabaseConfigured()) {
          const { error: err } = await supabase
            .from("inventory_items")
            .insert({ ...data, portal_id: portalId });
          if (err) throw err;
        } else {
          localAdd(data, portalId);
        }
        setTick((t) => t + 1);
        toast.success("Item added");
        return true;
      } catch {
        try {
          localAdd(data, portalId);
          setTick((t) => t + 1);
          toast.success("Item saved locally");
          return true;
        } catch {
          toast.error("Error: unable to save item");
          return false;
        }
      }
    },
    [user, portalId]
  );

  const updateItem = useCallback(
    async (id: string, changes: Partial<NewInventoryItem>): Promise<boolean> => {
      if (!user) return false;
      try {
        if (isSupabaseConfigured()) {
          const { error: err } = await supabase
            .from("inventory_items")
            .update(changes)
            .eq("id", id)
            .eq("portal_id", portalId);
          if (err) throw err;
        } else {
          localUpdate(id, changes, portalId);
        }
        setTick((t) => t + 1);
        toast.success("Item updated");
        return true;
      } catch {
        localUpdate(id, changes, portalId);
        setTick((t) => t + 1);
        toast.success("Item updated locally");
        return true;
      }
    },
    [user, portalId]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      try {
        if (isSupabaseConfigured()) {
          const { error: err } = await supabase
            .from("inventory_items")
            .delete()
            .eq("id", id)
            .eq("portal_id", portalId);
          if (err) throw err;
        } else {
          localDelete(id, portalId);
        }
        setTick((t) => t + 1);
        toast.success("Item deleted");
        return true;
      } catch {
        localDelete(id, portalId);
        setTick((t) => t + 1);
        toast.success("Item deleted locally");
        return true;
      }
    },
    [user, portalId]
  );

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { items: all, isLoading, error, totalItems, totalValue, totalProfit, addItem, updateItem, deleteItem, refetch };
}
