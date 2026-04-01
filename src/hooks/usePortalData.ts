import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { usePortalDB } from "../lib/portalContextDB";

interface UsePortalDataOptions {
  orderBy?: string;
  ascending?: boolean;
  filter?: Record<string, unknown>;
}

export function usePortalData<T extends { id: string }>(
  tableName: string,
  options: UsePortalDataOptions = {}
) {
  const { currentPortalId } = usePortalDB();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stringify options to create a stable dep value (avoids infinite loop from object literals)
  const optionsKey = JSON.stringify(options);

  const fetch = useCallback(async () => {
    if (!currentPortalId) { setData([] as unknown as T[]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const parsedOptions: UsePortalDataOptions = JSON.parse(optionsKey);
    let q = supabase.from(tableName).select("*").eq("portal_id", currentPortalId);

    if (parsedOptions.filter) {
      Object.entries(parsedOptions.filter).forEach(([k, v]) => { q = q.eq(k, v); });
    }
    if (parsedOptions.orderBy) {
      q = q.order(parsedOptions.orderBy, { ascending: parsedOptions.ascending ?? true });
    }

    const { data: rows, error: err } = await q;
    if (err) { setError(err.message); }
    else { setData((rows ?? []) as T[]); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPortalId, tableName, optionsKey]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (payload: Omit<T, "id" | "created_at" | "updated_at">) => {
    if (!currentPortalId) return { error: "Nessun portale selezionato" };
    const { data: row, error: err } = await supabase
      .from(tableName)
      .insert({ ...payload, portal_id: currentPortalId })
      .select()
      .single();
    if (err) return { error: err.message };
    setData((prev) => [...prev, row as T]);
    return { data: row as T };
  };

  const update = async (id: string, payload: Partial<T>) => {
    const { data: row, error: err } = await supabase
      .from(tableName)
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (err) return { error: err.message };
    setData((prev) => prev.map((r) => (r.id === id ? (row as T) : r)));
    return { data: row as T };
  };

  const remove = async (id: string) => {
    const { error: err } = await supabase.from(tableName).delete().eq("id", id);
    if (err) return { error: err.message };
    setData((prev) => prev.filter((r) => r.id !== id));
    return {};
  };

  return { data, loading, error, refetch: fetch, create, update, remove };
}
