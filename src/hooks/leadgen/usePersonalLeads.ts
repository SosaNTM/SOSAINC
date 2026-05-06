import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates, broadcastLeadgenUpdate } from "@/lib/leadgenRealtime";
import { GROUP_TO_STATUSES, ACTIVE_STATUSES } from "@/lib/leadgenStatusGroups";
import type { DashboardGroup } from "@/lib/leadgenStatusGroups";
import type { LeadgenLead, OutreachStatus } from "@/types/leadgen";
import { toast } from "sonner";

export interface PersonalLeadsFilters {
  group?: DashboardGroup | "all_active" | "all";
  searchText?: string;
  sortBy?: "name" | "updated" | "created" | "rating";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

function resolveStatuses(group: DashboardGroup | "all_active" | "all"): OutreachStatus[] {
  if (group === "all_active") return ACTIVE_STATUSES;
  if (group === "all") return [...ACTIVE_STATUSES, ...GROUP_TO_STATUSES.archived];
  return GROUP_TO_STATUSES[group];
}

export function usePersonalLeads(filters: PersonalLeadsFilters = {}) {
  const { currentPortalId } = usePortalDB();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadgenLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const group     = filters.group    ?? "all_active";
  const searchText = filters.searchText ?? "";
  const sortBy    = filters.sortBy   ?? "updated";
  const sortDir   = filters.sortDir  ?? "desc";
  const page      = filters.page     ?? 0;
  const pageSize  = filters.pageSize ?? 25;

  const fetch = useCallback(async () => {
    if (!currentPortalId || !currentUserId) return;
    setLoading(true);

    const statuses = resolveStatuses(group as DashboardGroup | "all_active" | "all");
    const orderCol = sortBy === "name" ? "name" : sortBy === "created" ? "created_at" : sortBy === "rating" ? "rating" : "updated_at";
    const ascending = sortDir === "asc";

    let countQ = supabase
      .from("leadgen_leads")
      .select("id", { count: "exact", head: true })
      .eq("portal_id", currentPortalId)
      .eq("assigned_to", currentUserId)
      .in("outreach_status", statuses);

    let dataQ = supabase
      .from("leadgen_leads")
      .select("id,name,outreach_status,category,city,updated_at,assigned_at,rating,phone,website")
      .eq("portal_id", currentPortalId)
      .eq("assigned_to", currentUserId)
      .in("outreach_status", statuses)
      .order(orderCol, { ascending })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (searchText) {
      const pat = `%${searchText}%`;
      const orClause = `name.ilike.${pat},category.ilike.${pat},city.ilike.${pat}`;
      countQ = countQ.or(orClause);
      dataQ  = dataQ.or(orClause);
    }

    const [countRes, dataRes] = await Promise.all([countQ, dataQ]);
    setTotalCount(countRes.count ?? 0);
    setLeads((dataRes.data ?? []) as LeadgenLead[]);
    setLoading(false);
  }, [currentPortalId, currentUserId, group, searchText, sortBy, sortDir, page, pageSize]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetch();
    });
  }, [fetch]);

  return { leads, totalCount, loading };
}

export function useArchivedLeads() {
  const { currentPortalId } = usePortalDB();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadgenLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const fetch = useCallback(async () => {
    if (!currentPortalId || !currentUserId) return;
    setLoading(true);

    const [countRes, dataRes] = await Promise.all([
      supabase.from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("assigned_to", currentUserId)
        .eq("outreach_status", "rejected"),
      supabase.from("leadgen_leads")
        .select("id,name,outreach_status,category,city,updated_at,outreach_notes")
        .eq("portal_id", currentPortalId)
        .eq("assigned_to", currentUserId)
        .eq("outreach_status", "rejected")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

    setTotalCount(countRes.count ?? 0);
    setLeads((dataRes.data ?? []) as LeadgenLead[]);
    setLoading(false);
  }, [currentPortalId, currentUserId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetch();
    });
  }, [fetch]);

  const reopen = useCallback(async (leadId: string): Promise<void> => {
    if (!currentPortalId || !currentUserId) return;
    const now = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("leadgen_leads")
      .update({ outreach_status: "new", updated_at: now })
      .eq("id", leadId)
      .eq("portal_id", currentPortalId);

    if (error) { toast.error(error.message); return; }

    await supabase.from("leadgen_outreach_events").insert({
      portal_id: currentPortalId,
      lead_id: leadId,
      channel: "email" as const,
      direction: "outbound" as const,
      notes: "Riaperto dall'archivio",
      occurred_at: now,
      user_id: user?.id ?? null,
    });

    broadcastLeadgenUpdate("lead_updated", { leadId });
    toast.success("Lead riaperto");
  }, [currentPortalId, currentUserId]);

  return { leads, totalCount, loading, reopen };
}
