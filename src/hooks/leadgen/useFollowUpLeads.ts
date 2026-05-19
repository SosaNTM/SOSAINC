import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import { CONTACTED_THRESHOLD_DAYS, QUALIFIED_THRESHOLD_DAYS, FOLLOWUP_SKIP_TTL_MS } from "@/lib/leadgenConstants";
import { followUpSkipKey, getSkipMap, saveSkipMap } from "@/lib/leadgenSkipTracking";
import { applyOwnershipFilter } from "@/lib/leadgenFilter";
import type { LeadgenLead } from "@/types/leadgen";

export interface FollowUpFilters {
  ownership?: "mine" | "pool" | "all";
}

export function useFollowUpLeads(filters?: FollowUpFilters) {
  const { currentPortalId } = usePortalDB();
  const [contactedLeads, setContactedLeads] = useState<LeadgenLead[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<LeadgenLead[]>([]);
  const [lastEvents, setLastEvents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [skipVersion, setSkipVersion] = useState(0);

  const ownership = filters?.ownership ?? "all";

  const fetchAll = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setLoading(true);

    let currentUserId: string | undefined;
    if (ownership === "mine") {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    const sevenDaysAgo = new Date(Date.now() - CONTACTED_THRESHOLD_DAYS * 86_400_000).toISOString();

    let contactedQuery = supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("outreach_status", "contacted")
      .lt("contacted_at", sevenDaysAgo)
      .order("contacted_at", { ascending: true });

    let qualifiedQuery = supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("outreach_status", "qualified");

    contactedQuery = applyOwnershipFilter(contactedQuery, ownership, currentUserId);
    qualifiedQuery = applyOwnershipFilter(qualifiedQuery, ownership, currentUserId);

    const [contactedRes, qualifiedRes] = await Promise.all([contactedQuery, qualifiedQuery]);
    if (contactedRes.error || qualifiedRes.error) { setLoading(false); return; }

    const contacted = (contactedRes.data ?? []) as LeadgenLead[];
    const qualified = (qualifiedRes.data ?? []) as LeadgenLead[];

    setContactedLeads(contacted);
    setQualifiedLeads(qualified);

    // Fetch last event timestamp for qualified leads
    if (qualified.length) {
      const ids = qualified.map((l) => l.id);
      const { data: evData } = await supabase
        .from("leadgen_outreach_events")
        .select("lead_id, occurred_at")
        .eq("portal_id", currentPortalId)
        .in("lead_id", ids)
        .order("occurred_at", { ascending: false });

      const latestByLead = new Map<string, string>();
      for (const ev of evData ?? []) {
        if (!latestByLead.has(ev.lead_id)) latestByLead.set(ev.lead_id, ev.occurred_at);
      }
      setLastEvents(latestByLead);
    } else {
      setLastEvents(new Map());
    }

    setLoading(false);
  }, [currentPortalId, ownership]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetchAll();
    });
  }, [fetchAll]);

  const skipLead = useCallback((leadId: string) => {
    if (!currentPortalId) return;
    const map = getSkipMap(followUpSkipKey(currentPortalId));
    map[leadId] = Date.now();
    saveSkipMap(followUpSkipKey(currentPortalId), map);
    setSkipVersion((v) => v + 1);
  }, [currentPortalId]);

  const removeLead = useCallback((leadId: string) => {
    setContactedLeads((prev) => prev.filter((l) => l.id !== leadId));
    setQualifiedLeads((prev) => prev.filter((l) => l.id !== leadId));
  }, []);

  const { contactedAging, qualifiedAging, total } = useMemo(() => {
    if (!currentPortalId) return { contactedAging: [] as LeadgenLead[], qualifiedAging: [] as LeadgenLead[], total: 0 };

    const skipMap = getSkipMap(followUpSkipKey(currentPortalId));
    const now = Date.now();
    const isSkipped = (id: string) => !!skipMap[id] && now - skipMap[id] < FOLLOWUP_SKIP_TTL_MS;

    const contactedAging = contactedLeads.filter((l) => !isSkipped(l.id));

    const fiveDaysAgo = now - QUALIFIED_THRESHOLD_DAYS * 86_400_000;
    const qualifiedAging = qualifiedLeads.filter((l) => {
      if (isSkipped(l.id)) return false;
      const lastEvAt = lastEvents.get(l.id);
      const refTs = lastEvAt ? new Date(lastEvAt).getTime() : new Date(l.updated_at).getTime();
      return refTs < fiveDaysAgo;
    });

    return { contactedAging, qualifiedAging, total: contactedAging.length + qualifiedAging.length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactedLeads, qualifiedLeads, lastEvents, currentPortalId, skipVersion]);

  return { contactedAging, qualifiedAging, total, loading, refetch: fetchAll, skipLead, removeLead };
}
