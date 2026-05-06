import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import { GROUP_TO_STATUSES } from "@/lib/leadgenStatusGroups";
import type { DashboardPeriod } from "@/lib/leadgenStatusGroups";
import type { OutreachStatus } from "@/types/leadgen";

export interface PersonalSummaryData {
  uncontacted: number;
  contacted: number;
  inProgress: number;
  completed: number;
  archived: number;
  totalActive: number;
  lastActionAt: string | null;
  personalConversionRate: number;
  teamAverageConversionRate: number;
  deltaUncontacted: number;
  deltaContacted: number;
  deltaInProgress: number;
  deltaCompleted: number;
}

const EMPTY: PersonalSummaryData = {
  uncontacted: 0, contacted: 0, inProgress: 0, completed: 0, archived: 0,
  totalActive: 0, lastActionAt: null,
  personalConversionRate: 0, teamAverageConversionRate: 0,
  deltaUncontacted: 0, deltaContacted: 0, deltaInProgress: 0, deltaCompleted: 0,
};

function periodStart(period: DashboardPeriod): Date | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  // quarter
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1);
}

function prevPeriodRange(period: DashboardPeriod): { from: string; to: string } | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "week") {
    const to = new Date(now); to.setDate(now.getDate() - 7); to.setHours(0, 0, 0, 0);
    const from = new Date(to); from.setDate(to.getDate() - 7);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to   = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  // quarter
  const q = Math.floor(now.getMonth() / 3);
  const pq = q === 0 ? 3 : q - 1;
  const py = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const from = new Date(py, pq * 3, 1);
  const to   = new Date(py, pq * 3 + 3, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function countQuery(
  portalId: string,
  userId: string,
  statuses: OutreachStatus[],
  from?: string,
  to?: string,
): Promise<number> {
  let q = supabase
    .from("leadgen_leads")
    .select("id", { count: "exact", head: true })
    .eq("portal_id", portalId)
    .eq("assigned_to", userId)
    .in("outreach_status", statuses);
  if (from) q = q.gte("assigned_at", from);
  if (to)   q = q.lt("assigned_at", to);
  const { count } = await q;
  return count ?? 0;
}

export function usePersonalLeadgenSummary(period: DashboardPeriod = "all") {
  const { currentPortalId } = usePortalDB();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [data, setData] = useState<PersonalSummaryData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!currentPortalId || !currentUserId) return;

    const cacheKey = `swr_personal_summary_${currentUserId}_${currentPortalId}_${period}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { ts, payload } = JSON.parse(cached) as { ts: number; payload: PersonalSummaryData };
        if (Date.now() - ts < 60_000) {
          setData(payload);
          setLoading(false);
        }
      }
    } catch { /**/ }

    const from = periodStart(period)?.toISOString();

    const [uncontacted, contacted, inProgress, completed, archived] = await Promise.all([
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.uncontacted, from),
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.contacted,   from),
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.in_progress, from),
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.completed,   from),
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.archived,    from),
    ]);

    const [totalActiveRes, lastActionRes, teamConvertedRes, teamTotalRes] = await Promise.all([
      supabase.from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("assigned_to", currentUserId)
        .not("outreach_status", "eq", "rejected"),
      supabase.from("leadgen_outreach_events")
        .select("occurred_at")
        .eq("portal_id", currentPortalId)
        .eq("user_id", currentUserId)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "converted"),
      supabase.from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .in("outreach_status", ["converted", "rejected"]),
    ]);

    let deltaUncontacted = 0, deltaContacted = 0, deltaInProgress = 0, deltaCompleted = 0;
    const prev = prevPeriodRange(period);
    if (prev) {
      const [pu, pc, pip, pcm] = await Promise.all([
        countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.uncontacted, prev.from, prev.to),
        countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.contacted,   prev.from, prev.to),
        countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.in_progress, prev.from, prev.to),
        countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.completed,   prev.from, prev.to),
      ]);
      deltaUncontacted = uncontacted - pu;
      deltaContacted   = contacted   - pc;
      deltaInProgress  = inProgress  - pip;
      deltaCompleted   = completed   - pcm;
    }

    const personalConversionRate = (completed + archived) > 0 ? completed / (completed + archived) : 0;
    const teamTotal = teamTotalRes.count ?? 0;
    const teamAverageConversionRate = teamTotal > 0 ? (teamConvertedRes.count ?? 0) / teamTotal : 0;

    const payload: PersonalSummaryData = {
      uncontacted, contacted, inProgress, completed, archived,
      totalActive: totalActiveRes.count ?? 0,
      lastActionAt: (lastActionRes.data as { occurred_at: string } | null)?.occurred_at ?? null,
      personalConversionRate,
      teamAverageConversionRate,
      deltaUncontacted, deltaContacted, deltaInProgress, deltaCompleted,
    };

    setData(payload);
    setLoading(false);
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload })); } catch { /**/ }
  }, [currentPortalId, currentUserId, period]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") {
        try { localStorage.removeItem(`swr_personal_summary_${currentUserId}_${currentPortalId}_${period}`); } catch { /**/ }
        fetchSummary();
      }
    });
  }, [fetchSummary, currentUserId, currentPortalId, period]);

  return { ...data, loading };
}
