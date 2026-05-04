import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenSettings } from "@/types/leadgen";

function cacheKey(portalId: string) {
  return `swr_single_leadgen_settings_${portalId}`;
}

export function useLeadgenSettings() {
  const { currentPortalId } = usePortalDB();

  const [data, setData] = useState<LeadgenSettings | null>(() => {
    if (!currentPortalId) return null;
    try {
      const raw = localStorage.getItem(cacheKey(currentPortalId));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    const { data: row } = await supabase
      .from("leadgen_settings")
      .select("*")
      .eq("portal_id", currentPortalId)
      .single();
    setData(row as LeadgenSettings | null);
    if (row) {
      try { localStorage.setItem(cacheKey(currentPortalId), JSON.stringify(row)); } catch { /**/ }
    }
    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const upsert = useCallback(async (payload: Partial<LeadgenSettings>) => {
    if (!currentPortalId) return { data: null, error: "Nessun portale selezionato" };
    const { data: row, error } = await supabase
      .from("leadgen_settings")
      .upsert({ ...payload, portal_id: currentPortalId }, { onConflict: "portal_id" })
      .select()
      .single();
    if (!error && row) {
      setData(row as LeadgenSettings);
      try { localStorage.setItem(cacheKey(currentPortalId), JSON.stringify(row)); } catch { /**/ }
    }
    return { data: row as LeadgenSettings | null, error: error?.message ?? null };
  }, [currentPortalId]);

  return { data, loading, refetch: fetchData, upsert };
}
