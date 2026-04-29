import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newTransactionSchema, safeValidate } from "@/lib/validation/schemas";
import type { DbPersonalTransaction, NewDbPersonalTransaction } from "@/types/database";
import { toast } from "sonner";

const LS_KEY = (portalId: string) => `personal_transactions_local_${portalId}`;

function readLocal(portalId: string): DbPersonalTransaction[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY(portalId)) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal(portalId: string, data: DbPersonalTransaction[]): void {
  localStorage.setItem(LS_KEY(portalId), JSON.stringify(data));
}

export interface TransactionFilters {
  type?: "income" | "expense" | "transfer";
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface FetchTransactionsOptions {
  filters?: TransactionFilters;
  limit?: number;
  offset?: number;
}

const DEFAULT_TX_LIMIT = 200;

export async function fetchTransactions(
  portalId: string,
  { filters, limit = DEFAULT_TX_LIMIT, offset = 0 }: FetchTransactionsOptions = {},
): Promise<DbPersonalTransaction[]> {
  try {
    let query = supabase
      .from("personal_transactions")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.type) query = query.eq("type", filters.type);
    if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("date", filters.dateTo);
    if (filters?.minAmount != null) query = query.gte("amount", filters.minAmount);
    if (filters?.maxAmount != null) query = query.lte("amount", filters.maxAmount);

    const { data, error } = await query;
    if (error) throw error;
    const result = data ?? [];
    if (offset === 0) writeLocal(portalId, result); // only cache first page
    return result;
  } catch {
    return readLocal(portalId);
  }
}

export async function createTransaction(
  tx: Omit<NewDbPersonalTransaction, "portal_id">,
  portalId: string,
): Promise<DbPersonalTransaction | null> {
  // Validate at service boundary
  const validation = safeValidate(newTransactionSchema, tx);
  if (!validation.success) {
    console.warn("createTransaction validation failed:", validation.errors);
    return null;
  }

  const optimisticId = crypto.randomUUID();
  const optimistic: DbPersonalTransaction = {
    ...tx,
    id: optimisticId,
    portal_id: toPortalUUID(portalId),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Optimistic local write
  const local = readLocal(portalId);
  writeLocal(portalId, [optimistic, ...local]);

  try {
    const { data, error } = await supabase
      .from("personal_transactions")
      .insert({ ...tx, portal_id: toPortalUUID(portalId) })
      .select()
      .single();
    if (error) throw error;
    // Replace optimistic entry with real one
    const updated = readLocal(portalId).map((t) => (t.id === optimisticId ? data : t));
    writeLocal(portalId, updated);
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto";
    toast.error("Salvataggio non riuscito", {
      description: `${msg} — la transazione è in cache locale e verrà sincronizzata al prossimo retry.`,
    });
    return optimistic;
  }
}

export async function updateTransaction(
  id: string,
  updates: Partial<DbPersonalTransaction>,
  portalId: string,
): Promise<DbPersonalTransaction | null> {
  // Optimistic local update
  const local = readLocal(portalId);
  const updated = local.map((t) => (t.id === id ? { ...t, ...updates } : t));
  writeLocal(portalId, updated);

  try {
    const { data, error } = await supabase
      .from("personal_transactions")
      .update(updates)
      .eq("id", id)
      .eq("portal_id", toPortalUUID(portalId))
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto";
    toast.error("Aggiornamento non riuscito", { description: msg });
    return updated.find((t) => t.id === id) ?? null;
  }
}

export async function deleteTransaction(id: string, portalId: string): Promise<boolean> {
  // Optimistic local delete
  const local = readLocal(portalId).filter((t) => t.id !== id);
  writeLocal(portalId, local);

  try {
    const { error } = await supabase.from("personal_transactions").delete().eq("id", id).eq("portal_id", toPortalUUID(portalId));
    if (error) throw error;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto";
    toast.error("Eliminazione non riuscita", { description: msg });
    return false;
  }
}
