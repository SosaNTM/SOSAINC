import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenLead, OutreachStatus } from "@/types/leadgen";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";

function cacheKey(portalId: string) {
  return `swr_leadgen_leads_${portalId}`;
}

export interface LeadFilters {
  hasWebsite?: boolean;
  outreachStatus?: OutreachStatus | "all";
  searchText?: string;
  categories?: string[];
  cities?: string[];
  minRating?: number;
}

export function useLeadgenLeads(filters: LeadFilters = {}) {
  const { currentPortalId } = usePortalDB();

  const [allLeads, setAllLeads] = useState<LeadgenLead[]>(() => {
    if (!currentPortalId) return [];
    try {
      const raw = localStorage.getItem(cacheKey(currentPortalId));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setError(null);

    const { data, error: err } = await supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .order("created_at", { ascending: false });

    if (err) { setError(err.message); }
    else {
      const rows = (data ?? []) as LeadgenLead[];
      setAllLeads(rows);
      try { localStorage.setItem(cacheKey(currentPortalId), JSON.stringify(rows)); } catch { /**/ }
    }
    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Re-fetch when a search completes
  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "search_completed") fetchLeads();
    });
  }, [fetchLeads]);

  const leads = useMemo(() => {
    let result = allLeads;
    if (filters.hasWebsite !== undefined) {
      result = result.filter((l) => l.has_website === filters.hasWebsite);
    }
    if (filters.outreachStatus && filters.outreachStatus !== "all") {
      result = result.filter((l) => l.outreach_status === filters.outreachStatus);
    }
    if (filters.searchText) {
      const q = filters.searchText.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.category ?? "").toLowerCase().includes(q) ||
          (l.city ?? "").toLowerCase().includes(q)
      );
    }
    if (filters.categories?.length) {
      result = result.filter((l) => filters.categories!.includes(l.category ?? ""));
    }
    if (filters.cities?.length) {
      result = result.filter((l) => filters.cities!.includes(l.city ?? ""));
    }
    if (filters.minRating) {
      result = result.filter((l) => (l.rating ?? 0) >= filters.minRating!);
    }
    return result;
  }, [allLeads, filters]);

  const updateLead = useCallback(async (id: string, payload: Partial<LeadgenLead>) => {
    const { data: row, error: err } = await supabase
      .from("leadgen_leads")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (err) return { error: err.message };
    setAllLeads((prev) => prev.map((l) => (l.id === id ? (row as LeadgenLead) : l)));
    return { data: row as LeadgenLead };
  }, []);

  const upsertLeads = useCallback(async (rows: Omit<LeadgenLead, "id" | "has_website" | "updated_at">[]) => {
    if (!currentPortalId || !rows.length) return { error: null };
    const { error: err } = await supabase
      .from("leadgen_leads")
      .upsert(rows.map((r) => ({ ...r, portal_id: currentPortalId })), {
        onConflict: "portal_id,place_id",
        ignoreDuplicates: true,
      });
    if (!err) await fetchLeads();
    return { error: err?.message ?? null };
  }, [currentPortalId, fetchLeads]);

  const allCategories = useMemo(
    () => [...new Set(allLeads.map((l) => l.category).filter(Boolean) as string[])].sort(),
    [allLeads]
  );
  const allCities = useMemo(
    () => [...new Set(allLeads.map((l) => l.city).filter(Boolean) as string[])].sort(),
    [allLeads]
  );

  return { leads, allLeads, loading, error, refetch: fetchLeads, updateLead, upsertLeads, allCategories, allCities };
}
