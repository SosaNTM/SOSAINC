import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";

export interface MemberActivity {
  userId: string;
  displayName: string;
  role: string;
  assignedLeads: number;
  contacted: number;
  converted: number;
  lastActivityAt: string | null;
}

export interface RecentSearch {
  id: string;
  category: string | null;
  started_at: string;
  total_results: number;
  discarded_no_contact_count: number;
}

export interface OverviewDashboardData {
  totalLeads: number;
  notContacted: number;
  contacted: number;
  inNegotiation: number;
  converted: number;
  rejected: number;
  searchCount: number;
  discardedTotal: number;
  withWebsite: number;
  withoutWebsite: number;
  conversionRate: number;
  outreachActivityCount: number;
  memberActivity: MemberActivity[];
  recentSearches: RecentSearch[];
  loading: boolean;
}

const EMPTY: OverviewDashboardData = {
  totalLeads: 0, notContacted: 0, contacted: 0, inNegotiation: 0, converted: 0, rejected: 0,
  searchCount: 0, discardedTotal: 0, withWebsite: 0, withoutWebsite: 0, conversionRate: 0,
  outreachActivityCount: 0, memberActivity: [], recentSearches: [], loading: true,
};

export function useLeadgenOverviewDashboard(): OverviewDashboardData {
  const { currentPortalId } = usePortalDB();
  const [data, setData] = useState<OverviewDashboardData>(EMPTY);

  const fetchAll = useCallback(async () => {
    if (!currentPortalId) { setData({ ...EMPTY, loading: false }); return; }
    setData((s) => ({ ...s, loading: true }));

    const [leadsRes, searchesRes, outreachCountRes, membersRes, lastActivityRes, recentSearchesRes] = await Promise.all([
      supabase
        .from("leadgen_leads")
        .select("outreach_status, has_website, assigned_to")
        .eq("portal_id", currentPortalId),
      supabase
        .from("leadgen_searches")
        .select("discarded_no_contact_count", { count: "exact" })
        .eq("portal_id", currentPortalId),
      supabase
        .from("leadgen_outreach_events")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId),
      supabase
        .from("leadgen_members")
        .select("user_id, role, display_name, active")
        .eq("portal_id", currentPortalId)
        .eq("active", true),
      supabase
        .from("leadgen_outreach_events")
        .select("user_id, occurred_at")
        .eq("portal_id", currentPortalId)
        .not("user_id", "is", null)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("leadgen_searches")
        .select("id, category, started_at, total_results, discarded_no_contact_count")
        .eq("portal_id", currentPortalId)
        .order("started_at", { ascending: false })
        .limit(5),
    ]);

    const leads = leadsRes.data ?? [];

    const totalLeads = leads.length;
    const notContacted = leads.filter((l) => l.outreach_status === "new").length;
    const contacted = leads.filter((l) => l.outreach_status === "contacted").length;
    const inNegotiation = leads.filter((l) => l.outreach_status === "replied" || l.outreach_status === "qualified").length;
    const converted = leads.filter((l) => l.outreach_status === "converted").length;
    const rejected = leads.filter((l) => l.outreach_status === "rejected").length;

    const searchRows = searchesRes.data ?? [];
    const searchCount = searchesRes.count ?? 0;
    const discardedTotal = searchRows.reduce((sum, s) => sum + (s.discarded_no_contact_count ?? 0), 0);
    const withWebsite = leads.filter((l) => l.has_website === true).length;
    const withoutWebsite = leads.filter((l) => !l.has_website).length;
    const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;
    const outreachActivityCount = outreachCountRes.count ?? 0;

    // Last activity per user (take first occurrence since sorted desc)
    const lastActivityMap = new Map<string, string>();
    for (const event of lastActivityRes.data ?? []) {
      if (event.user_id && !lastActivityMap.has(event.user_id)) {
        lastActivityMap.set(event.user_id, event.occurred_at);
      }
    }

    // Assigned leads breakdown per member
    const assignedMap = new Map<string, { assigned: number; contacted: number; converted: number }>();
    for (const lead of leads) {
      if (!lead.assigned_to) continue;
      const uid = lead.assigned_to as string;
      const entry = assignedMap.get(uid) ?? { assigned: 0, contacted: 0, converted: 0 };
      entry.assigned += 1;
      if (lead.outreach_status === "contacted") entry.contacted += 1;
      if (lead.outreach_status === "converted") entry.converted += 1;
      assignedMap.set(uid, entry);
    }

    const rawMembers = membersRes.data ?? [];
    const userIds = rawMembers.map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from("user_profiles").select("id, email, avatar_url").in("id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const memberActivity: MemberActivity[] = rawMembers
      .map((m) => {
        const profile = profileMap.get(m.user_id);
        const entry = assignedMap.get(m.user_id) ?? { assigned: 0, contacted: 0, converted: 0 };
        return {
          userId: m.user_id,
          displayName: m.display_name ?? profile?.email ?? m.user_id,
          role: m.role as string,
          assignedLeads: entry.assigned,
          contacted: entry.contacted,
          converted: entry.converted,
          lastActivityAt: lastActivityMap.get(m.user_id) ?? null,
        };
      })
      .sort((a, b) => b.assignedLeads - a.assignedLeads);

    const recentSearches = (recentSearchesRes.data ?? []) as RecentSearch[];

    setData({
      totalLeads, notContacted, contacted, inNegotiation, converted, rejected,
      searchCount, discardedTotal, withWebsite, withoutWebsite, conversionRate,
      outreachActivityCount, memberActivity, recentSearches, loading: false,
    });
  }, [currentPortalId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return data;
}
