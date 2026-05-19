import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";

import { coldSkipKey, getSkipMap } from "@/lib/leadgenSkipTracking";

const CACHE_TTL = 30_000;
const SKIP_TTL = 24 * 60 * 60 * 1000;

function getSkipCount(portalId: string): number {
  const map = getSkipMap(coldSkipKey(portalId));
  const now = Date.now();
  return Object.values(map).filter((ts) => now - ts < SKIP_TTL).length;
}

export function useTodayCount() {
  const { currentPortalId } = usePortalDB();
  const [counts, setCounts] = useState({ cold: 0, followup: 0, hot: 0 });
  const cacheRef = useRef<{ ts: number; data: typeof counts } | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!currentPortalId) return;

    if (cacheRef.current && Date.now() - cacheRef.current.ts < CACHE_TTL) {
      setCounts(cacheRef.current.data);
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [coldRes, contactedRes, qualifiedRes, repliedRes] = await Promise.all([
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "new")
        .eq("has_website", false)
        .gte("rating", 4)
        .gte("reviews_count", 20),
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "contacted")
        .lt("contacted_at", sevenDaysAgo),
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "qualified"),
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "replied"),
    ]);

    const skipped = getSkipCount(currentPortalId);
    const cold = Math.max(0, (coldRes.count ?? 0) - skipped);
    const followup = (contactedRes.count ?? 0) + (qualifiedRes.count ?? 0);
    const hot = repliedRes.count ?? 0;

    const data = { cold, followup, hot };
    cacheRef.current = { ts: Date.now(), data };
    setCounts(data);
  }, [currentPortalId]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  useEffect(() => {
    return subscribeToLeadgenUpdates(() => {
      cacheRef.current = null;
      fetchCounts();
    });
  }, [fetchCounts]);

  return { ...counts, total: counts.cold + counts.followup + counts.hot };
}
