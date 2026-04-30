import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { usePortalDB } from "../lib/portalContextDB";

interface UsePortalDataOptions {
  orderBy?: string;
  ascending?: boolean;
  filter?: Record<string, unknown>;
}

function swrKey(table: string, portalId: string) {
  return `swr_${table}_${portalId}`;
}

function readCache<T>(table: string, portalId: string): T[] | null {
  try {
    const raw = localStorage.getItem(swrKey(table, portalId));
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  return null;
}

function writeCache<T>(table: string, portalId: string, rows: T[]) {
  try { localStorage.setItem(swrKey(table, portalId), JSON.stringify(rows)); } catch { /* quota exceeded */ }
}

export function usePortalData<T extends { id: string }>(
  tableName: string,
  options: UsePortalDataOptions = {}
) {
  const { currentPortalId } = usePortalDB();

  // Initialize synchronously from cache — zero delay on revisit
  const [data, setData] = useState<T[]>(() => {
    if (!currentPortalId) return [];
    return readCache<T>(tableName, currentPortalId) ?? [];
  });

  const [loading, setLoading] = useState(() => {
    if (!currentPortalId) return true;
    return readCache(tableName, currentPortalId) === null;
  });

  const [error, setError] = useState<string | null>(null);

  const optionsKey = JSON.stringify(options);

  const fetch = useCallback(async () => {
    if (!currentPortalId) { setData([]); setLoading(false); return; }
    setError(null);

    // Show cache immediately, then refresh from Supabase in background
    const cached = readCache<T>(tableName, currentPortalId);
    if (cached !== null) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const parsedOptions: UsePortalDataOptions = JSON.parse(optionsKey);
    let q = supabase.from(tableName).select("*").eq("portal_id", currentPortalId);

    if (parsedOptions.filter) {
      Object.entries(parsedOptions.filter).forEach(([k, v]) => { q = q.eq(k, v); });
    }
    if (parsedOptions.orderBy) {
      q = q.order(parsedOptions.orderBy, { ascending: parsedOptions.ascending ?? true });
    }

    const { data: rows, error: err } = await q;
    if (err) {
      setError(err.message);
    } else {
      const result = (rows ?? []) as T[];
      setData(result);
      writeCache(tableName, currentPortalId, result);
    }
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
    setData((prev) => {
      const next = [...prev, row as T];
      writeCache(tableName, currentPortalId, next);
      return next;
    });
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
    setData((prev) => {
      const next = prev.map((r) => (r.id === id ? (row as T) : r));
      if (currentPortalId) writeCache(tableName, currentPortalId, next);
      return next;
    });
    return { data: row as T };
  };

  const remove = async (id: string) => {
    const { error: err } = await supabase.from(tableName).delete().eq("id", id);
    if (err) return { error: err.message };
    setData((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (currentPortalId) writeCache(tableName, currentPortalId, next);
      return next;
    });
    return {};
  };

  return { data, loading, error, refetch: fetch, create, update, remove };
}
