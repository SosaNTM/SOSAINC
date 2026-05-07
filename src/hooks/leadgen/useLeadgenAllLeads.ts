import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenLead } from "@/types/leadgen";

export interface AllLeadsFilters {
  search: string;
  websiteFilter: "all" | "with" | "without";
  hasEmail: boolean;
  hasPhone: boolean;
  reviewsFilter: "all" | "lt50" | "50_200" | "200_500" | "gt500";
  ratingFilter: "all" | "lt35" | "35_42" | "gt42";
  statusFilter: "all" | "new" | "contacted" | "negotiation" | "converted" | "rejected";
  assignmentFilter: "all" | "me" | "unassigned";
  categories: string[];
  sortBy: "name" | "reviews_count" | "rating" | "outreach_status" | "created_at";
  sortDir: "asc" | "desc";
  page: number;
}

export const PAGE_SIZE = 50;

export function useLeadgenAllLeads(filters: AllLeadsFilters) {
  const { currentPortalId } = usePortalDB();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadgenLead[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  // Fetch distinct categories once per portal
  useEffect(() => {
    if (!currentPortalId) return;
    supabase
      .from("leadgen_leads")
      .select("category")
      .eq("portal_id", currentPortalId)
      .not("category", "is", null)
      .then(({ data }) => {
        const cats = [
          ...new Set(
            (data ?? [])
              .map((r: { category: string | null }) => r.category)
              .filter((c): c is string => Boolean(c))
          ),
        ].sort();
        setCategories(cats);
      });
  }, [currentPortalId]);

  // Stable key to track filter changes without object identity issues
  const filtersKey = useMemo(
    () =>
      [
        filters.search,
        filters.websiteFilter,
        filters.hasEmail,
        filters.hasPhone,
        filters.reviewsFilter,
        filters.ratingFilter,
        filters.statusFilter,
        filters.assignmentFilter,
        [...filters.categories].sort().join(","),
        filters.sortBy,
        filters.sortDir,
        filters.page,
      ].join("|"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filters.search, filters.websiteFilter, filters.hasEmail, filters.hasPhone,
      filters.reviewsFilter, filters.ratingFilter, filters.statusFilter,
      filters.assignmentFilter, filters.categories, filters.sortBy, filters.sortDir, filters.page,
    ]
  );

  useEffect(() => {
    if (!currentPortalId) { setLoading(false); return; }
    // Wait for user ID when "assigned to me" is selected
    if (filters.assignmentFilter === "me" && currentUserId === null) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const from = (filters.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("leadgen_leads")
        .select("*", { count: "exact" })
        .eq("portal_id", currentPortalId);

      if (filters.websiteFilter === "with") query = query.eq("has_website", true);
      else if (filters.websiteFilter === "without") query = query.eq("has_website", false);

      if (filters.hasEmail) query = query.not("emails", "eq", "{}");
      if (filters.hasPhone) query = query.not("phone", "is", null);

      if (filters.reviewsFilter === "lt50") query = query.lt("reviews_count", 50);
      else if (filters.reviewsFilter === "50_200") query = query.gte("reviews_count", 50).lte("reviews_count", 200);
      else if (filters.reviewsFilter === "200_500") query = query.gte("reviews_count", 200).lte("reviews_count", 500);
      else if (filters.reviewsFilter === "gt500") query = query.gt("reviews_count", 500);

      if (filters.ratingFilter === "lt35") query = query.lt("rating", 3.5);
      else if (filters.ratingFilter === "35_42") query = query.gte("rating", 3.5).lte("rating", 4.2);
      else if (filters.ratingFilter === "gt42") query = query.gt("rating", 4.2);

      if (filters.statusFilter === "new") query = query.eq("outreach_status", "new");
      else if (filters.statusFilter === "contacted") query = query.eq("outreach_status", "contacted");
      else if (filters.statusFilter === "negotiation") query = query.in("outreach_status", ["replied", "qualified"]);
      else if (filters.statusFilter === "converted") query = query.eq("outreach_status", "converted");
      else if (filters.statusFilter === "rejected") query = query.eq("outreach_status", "rejected");

      if (filters.assignmentFilter === "me" && currentUserId) {
        query = query.eq("assigned_to", currentUserId);
      } else if (filters.assignmentFilter === "unassigned") {
        query = query.is("assigned_to", null);
      }

      if (filters.categories.length > 0) query = query.in("category", filters.categories);

      if (filters.search.trim()) {
        const s = filters.search.trim().replace(/[%_]/g, "\\$&");
        query = query.or(`name.ilike.%${s}%,address.ilike.%${s}%,category.ilike.%${s}%`);
      }

      query = query
        .order(filters.sortBy, { ascending: filters.sortDir === "asc" })
        .range(from, to);

      const { data, count } = await query;

      if (!cancelled) {
        setLeads((data ?? []) as LeadgenLead[]);
        setTotal(count ?? 0);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPortalId, currentUserId, filtersKey]);

  return { leads, total, categories, loading };
}
