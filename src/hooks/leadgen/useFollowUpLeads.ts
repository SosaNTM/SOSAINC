import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import type { LeadgenLead } from "@/types/leadgen";

const CONTACTED_THRESHOLD_DAYS = 7;
const QUALIFIED_THRESHOLD_DAYS = 5;
const SKIP_TTL = 7 * 24 * 60 * 60 * 1000;

export interface FollowUpFilters {
  ownership?: "mine" | "pool" | "all";
}

function skipKey(portalId: string) { return `leadgen_followup_skipped_${portalId}`; }
function getSkipMap(portalId: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(skipKey(portalId)) || "{}"); }
  catch { return {}; }
}
function saveSkipMap(portalId: string, map: Record<string, number>) {
  try { localStorage.setItem(skipKey(portalId), JSON.stringify(map)); } catch { /**/ }
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

    if (ownership === "mine" && currentUserId) {
      contactedQuery = contactedQuery.eq("assigned_to", currentUserId);
      qualifiedQuery = qualifiedQuery.eq("assigned_to", currentUserId);
    } else if (ownership === "pool") {
      contactedQuery = contactedQuery.is("assigned_to", null);
      qualifiedQuery = qualifiedQuery.is("assigned_to", null);
    }

    const [contactedRes, qualifiedRes] = await Promise.all([contactedQuery, qualifiedQuery]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPortalId, ownership]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetchAll();
    });
  }, [fetchAll]);

  const skipLead = useCallback((leadId: string) => {
    if (!currentPortalId) return;
    const map = getSkipMap(currentPortalId);
    map[leadId] = Date.now();
    saveSkipMap(currentPortalId, map);
    setSkipVersion((v) => v + 1);
  }, [currentPortalId]);

  const removeLead = useCallback((leadId: string) => {
    setContactedLeads((prev) => prev.filter((l) => l.id !== leadId));
    setQualifiedLeads((prev) => prev.filter((l) => l.id !== leadId));
  }, []);

  const { contactedAging, qualifiedAging, total } = useMemo(() => {
    if (!currentPortalId) return { contactedAging: [] as LeadgenLead[], qualifiedAging: [] as LeadgenLead[], total: 0 };

    const skipMap = getSkipMap(currentPortalId);
    const now = Date.now();
    const isSkipped = (id: string) => !!skipMap[id] && now - skipMap[id] < SKIP_TTL;

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
