import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenOutreachEvent, OutreachChannel, OutreachDirection } from "@/types/leadgen";

export function useLeadgenOutreachEvents(leadId: string | null) {
  const { currentPortalId } = usePortalDB();
  const [events, setEvents] = useState<LeadgenOutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!currentPortalId || !leadId) { setLoading(false); return; }
    const { data } = await supabase
      .from("leadgen_outreach_events")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false });
    setEvents((data ?? []) as LeadgenOutreachEvent[]);
    setLoading(false);
  }, [currentPortalId, leadId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addEvent = useCallback(async (payload: {
    channel: OutreachChannel;
    direction: OutreachDirection;
    notes?: string;
    occurred_at?: string;
  }) => {
    if (!currentPortalId || !leadId) return { error: "Nessun portale o lead" };
    const { data, error } = await supabase
      .from("leadgen_outreach_events")
      .insert({
        portal_id: currentPortalId,
        lead_id: leadId,
        channel: payload.channel,
        direction: payload.direction,
        notes: payload.notes ?? null,
        occurred_at: payload.occurred_at ?? new Date().toISOString(),
      })
      .select()
      .single();
    if (!error && data) setEvents((prev) => [data as LeadgenOutreachEvent, ...prev]);
    return { error: error?.message ?? null };
  }, [currentPortalId, leadId]);

  const removeEvent = useCallback(async (id: string) => {
    if (!currentPortalId) return { error: "Nessun portale" };
    const { error } = await supabase
      .from("leadgen_outreach_events")
      .delete()
      .eq("portal_id", currentPortalId)
      .eq("id", id);
    if (!error) setEvents((prev) => prev.filter((e) => e.id !== id));
    return { error: error?.message ?? null };
  }, [currentPortalId]);

  return { events, loading, refetch: fetchEvents, addEvent, removeEvent };
}
