import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import { newTransactionSchema, safeValidate } from "@/lib/validation/schemas";
import type { DbPersonalTransaction, NewDbPersonalTransaction } from "@/types/database";
import { toast } from "sonner";

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
  if (error) {
    console.error("fetchTransactions:", error.message);
    toast.error(`Transactions load failed: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function createTransaction(
  tx: Omit<NewDbPersonalTransaction, "portal_id">,
  portalId: string,
): Promise<DbPersonalTransaction | null> {
  const validation = safeValidate(newTransactionSchema, tx);
  if (!validation.success) {
    console.warn("createTransaction validation failed:", validation.errors);
    return null;
  }

  const { data, error } = await supabase
    .from("personal_transactions")
    .insert({ ...tx, portal_id: toPortalUUID(portalId) })
    .select()
    .single();
  if (error) {
    const msg = error.message;
    toast.error("Salvataggio non riuscito", { description: msg });
    return null;
  }
  return data;
}

export async function updateTransaction(
  id: string,
  updates: Partial<DbPersonalTransaction>,
  portalId: string,
): Promise<DbPersonalTransaction | null> {
  const { data, error } = await supabase
    .from("personal_transactions")
    .update(updates)
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId))
    .select()
    .single();
  if (error) {
    toast.error("Aggiornamento non riuscito", { description: error.message });
    return null;
  }
  return data;
}

export async function deleteTransaction(id: string, portalId: string): Promise<boolean> {
  const { error } = await supabase
    .from("personal_transactions")
    .delete()
    .eq("id", id)
    .eq("portal_id", toPortalUUID(portalId));
  if (error) {
    toast.error("Eliminazione non riuscita", { description: error.message });
    return false;
  }
  return true;
}
