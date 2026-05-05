import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import type { LeadgenLead } from "@/types/leadgen";

export interface ColdLeadsFilters {
  hasWebsite?: boolean;
  categories?: string[];
  minRating: number;
  minReviews: number;
  cities?: string[];
  orderBy: "score" | "recent" | "reviews" | "rating";
  ownership?: "mine" | "pool" | "all";
}

const SKIP_TTL = 24 * 60 * 60 * 1000;

function skipKey(portalId: string) { return `leadgen_skipped_${portalId}`; }
function getSkipMap(portalId: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(skipKey(portalId)) || "{}"); }
  catch { return {}; }
}
function saveSkipMap(portalId: string, map: Record<string, number>) {
  try { localStorage.setItem(skipKey(portalId), JSON.stringify(map)); } catch { /**/ }
}

function scoreLead(lead: LeadgenLead): number {
  const rating = lead.rating ?? 0;
  const reviews = lead.reviews_count ?? 0;
  const daysOld = (Date.now() - new Date(lead.created_at).getTime()) / 86_400_000;
  return rating * 10 + Math.log10(reviews + 1) * 5 + (lead.has_website ? 0 : 15) + Math.max(0, 10 - daysOld);
}

export function useColdLeads(filters: ColdLeadsFilters) {
  const { currentPortalId } = usePortalDB();
  const [rawLeads, setRawLeads] = useState<LeadgenLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipVersion, setSkipVersion] = useState(0);

  const filterKey = [
    filters.minRating,
    filters.minReviews,
    filters.hasWebsite ?? "any",
    (filters.categories ?? []).slice().sort().join(","),
    (filters.cities ?? []).slice().sort().join(","),
    filters.ownership ?? "all",
  ].join("|");

  const fetchLeads = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setLoading(true);

    let query = supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("outreach_status", "new")
      .gte("rating", filters.minRating)
      .gte("reviews_count", filters.minReviews)
      .limit(200);

    if (filters.hasWebsite !== undefined) query = query.eq("has_website", filters.hasWebsite);
    if (filters.categories?.length) query = query.in("category", filters.categories);
    if (filters.cities?.length) query = query.in("city", filters.cities);

    if (filters.ownership === "pool") {
      query = query.is("assigned_to", null);
    } else if (filters.ownership === "mine") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) query = query.eq("assigned_to", user.id);
    }

    if (filters.orderBy === "recent") query = query.order("created_at", { ascending: false });
    else if (filters.orderBy === "reviews") query = query.order("reviews_count", { ascending: false });
    else if (filters.orderBy === "rating") query = query.order("rating", { ascending: false });
    else query = query.order("rating", { ascending: false }); // score-sorted client-side

    const { data } = await query;
    setRawLeads((data ?? []) as LeadgenLead[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPortalId, filterKey]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "search_completed" || event === "lead_updated") fetchLeads();
    });
  }, [fetchLeads]);

  const skipLead = useCallback((leadId: string) => {
    if (!currentPortalId) return;
    const map = getSkipMap(currentPortalId);
    map[leadId] = Date.now();
    saveSkipMap(currentPortalId, map);
    setSkipVersion((v) => v + 1);
  }, [currentPortalId]);

  const removeLead = useCallback((leadId: string) => {
    setRawLeads((prev) => prev.filter((l) => l.id !== leadId));
  }, []);

  const { leads, totalEligibleCount } = useMemo(() => {
    if (!currentPortalId) return { leads: [] as LeadgenLead[], totalEligibleCount: 0 };

    const skipMap = getSkipMap(currentPortalId);
    const now = Date.now();

    for (const id of Object.keys(skipMap)) {
      if (now - skipMap[id] > SKIP_TTL) delete skipMap[id];
    }

    const totalEligibleCount = rawLeads.length;
    const filtered = rawLeads.filter((l) => !skipMap[l.id]);

    let sorted = [...filtered];
    if (filters.orderBy === "score" || !filters.orderBy) {
      sorted = sorted
        .map((l) => ({ lead: l, score: scoreLead(l) }))
        .sort((a, b) => b.score - a.score)
        .map(({ lead }) => lead);
    }

    return { leads: sorted, totalEligibleCount };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawLeads, currentPortalId, skipVersion, filters.orderBy]);

  return { leads, totalEligibleCount, loading, refetch: fetchLeads, skipLead, removeLead };
}
