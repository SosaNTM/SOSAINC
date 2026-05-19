import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import { useLeadgenMembers } from "@/hooks/leadgen/useLeadgenMembers";

export interface MemberStat {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  total: number;
  active: number;
  completed: number;
  rejected: number;
  conversionRate: number;
}

export interface LeadgenOverviewStats {
  totalLeads: number;
  activeLeads: number;
  poolSize: number;
  convertedThisMonth: number;
  teamConversionRate: number;
  memberStats: MemberStat[];
  loading: boolean;
}

const EMPTY: LeadgenOverviewStats = {
  totalLeads: 0,
  activeLeads: 0,
  poolSize: 0,
  convertedThisMonth: 0,
  teamConversionRate: 0,
  memberStats: [],
  loading: true,
};

const ACTIVE_STATUSES = new Set(["contacted", "replied", "qualified"]);

export function useLeadgenOverviewStats(): LeadgenOverviewStats {
  const { currentPortalId } = usePortalDB();
  const { members } = useLeadgenMembers();
  const [stats, setStats] = useState<LeadgenOverviewStats>(EMPTY);

  const fetchStats = useCallback(async () => {
    if (!currentPortalId) { setStats({ ...EMPTY, loading: false }); return; }
    setStats((s) => ({ ...s, loading: true }));

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalRes, activeRes, poolRes, convertedMonthRes, assignedLeadsRes] = await Promise.all([
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId),
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .neq("outreach_status", "rejected"),
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .is("assigned_to", null)
        .eq("outreach_status", "new"),
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "converted")
        .gte("updated_at", monthStart.toISOString()),
      supabase
        .from("leadgen_leads")
        .select("assigned_to, outreach_status")
        .eq("portal_id", currentPortalId)
        .not("assigned_to", "is", null),
    ]);

    const totalLeads = totalRes.count ?? 0;
    const activeLeads = activeRes.count ?? 0;
    const poolSize = poolRes.count ?? 0;
    const convertedThisMonth = convertedMonthRes.count ?? 0;

    // Per-member breakdown from raw assigned leads
    const memberMap = new Map<string, { total: number; active: number; completed: number; rejected: number }>();
    for (const row of assignedLeadsRes.data ?? []) {
      const uid = row.assigned_to as string;
      const entry = memberMap.get(uid) ?? { total: 0, active: 0, completed: 0, rejected: 0 };
      entry.total += 1;
      if (ACTIVE_STATUSES.has(row.outreach_status)) entry.active += 1;
      if (row.outreach_status === "converted") entry.completed += 1;
      if (row.outreach_status === "rejected") entry.rejected += 1;
      memberMap.set(uid, entry);
    }

    // Enrich with member display info — only include active members
    const memberStats: MemberStat[] = members
      .filter((m) => m.active)
      .map((m) => {
        const entry = memberMap.get(m.user_id) ?? { total: 0, active: 0, completed: 0, rejected: 0 };
        const denominator = entry.completed + entry.rejected;
        return {
          userId: m.user_id,
          displayName: m.display_name ?? m.email,
          email: m.email,
          role: m.role,
          total: entry.total,
          active: entry.active,
          completed: entry.completed,
          rejected: entry.rejected,
          conversionRate: denominator > 0 ? entry.completed / denominator : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Team-wide conversion rate
    const allConverted = memberStats.reduce((s, m) => s + m.completed, 0);
    const allRejected = memberStats.reduce((s, m) => s + m.rejected, 0);
    const teamConversionRate = (allConverted + allRejected) > 0
      ? allConverted / (allConverted + allRejected)
      : 0;

    setStats({ totalLeads, activeLeads, poolSize, convertedThisMonth, teamConversionRate, memberStats, loading: false });
  }, [currentPortalId, members]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetchStats();
    });
  }, [fetchStats]);

  return stats;
}
