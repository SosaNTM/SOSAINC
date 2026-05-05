import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import type { LeadgenLead } from "@/types/leadgen";

const HOT_THRESHOLD_DAYS = 2;

export interface HotLead extends LeadgenLead {
  lastInboundAt: string;
  lastInboundNotes: string | null;
  daysAgo: number;
}

export interface HotLeadsFilters {
  ownership?: "mine" | "pool" | "all";
}

export function useHotLeads(filters?: HotLeadsFilters) {
  const { currentPortalId } = usePortalDB();
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [loading, setLoading] = useState(true);

  const ownership = filters?.ownership ?? "all";

  const fetchAll = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setLoading(true);

    let currentUserId: string | undefined;
    if (ownership === "mine") {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    let query = supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("outreach_status", "replied");

    if (ownership === "mine" && currentUserId) {
      query = query.eq("assigned_to", currentUserId);
    } else if (ownership === "pool") {
      query = query.is("assigned_to", null);
    }

    const { data: leads } = await query;

    if (!leads?.length) { setHotLeads([]); setLoading(false); return; }

    const ids = leads.map((l) => l.id);
    const { data: events } = await supabase
      .from("leadgen_outreach_events")
      .select("lead_id, direction, notes, occurred_at")
      .eq("portal_id", currentPortalId)
      .in("lead_id", ids)
      .order("occurred_at", { ascending: false });

    const evByLead = new Map<string, typeof events>();
    for (const ev of events ?? []) {
      const arr = evByLead.get(ev.lead_id) ?? [];
      arr.push(ev);
      evByLead.set(ev.lead_id, arr);
    }

    const threshold = Date.now() - HOT_THRESHOLD_DAYS * 86_400_000;
    const hot: HotLead[] = [];

    for (const lead of leads as LeadgenLead[]) {
      const leadEvents = evByLead.get(lead.id) ?? [];
      if (!leadEvents.length) continue;

      const lastEvent = leadEvents[0];
      if (lastEvent.direction !== "inbound") continue; // last event was outbound → user already replied

      const lastInboundTs = new Date(lastEvent.occurred_at).getTime();
      if (lastInboundTs > threshold) continue; // too recent, not yet urgent

      hot.push({
        ...lead,
        lastInboundAt: lastEvent.occurred_at,
        lastInboundNotes: lastEvent.notes ?? null,
        daysAgo: Math.floor((Date.now() - lastInboundTs) / 86_400_000),
      });
    }

    // Sort by most urgent (oldest inbound first)
    hot.sort((a, b) => new Date(a.lastInboundAt).getTime() - new Date(b.lastInboundAt).getTime());

    setHotLeads(hot);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPortalId, ownership]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetchAll();
    });
  }, [fetchAll]);

  const removeLead = useCallback((leadId: string) => {
    setHotLeads((prev) => prev.filter((l) => l.id !== leadId));
  }, []);

  return { hotLeads, total: hotLeads.length, loading, refetch: fetchAll, removeLead };
}
