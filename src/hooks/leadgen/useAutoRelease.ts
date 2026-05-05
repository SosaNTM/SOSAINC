import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { broadcastLeadgenUpdate } from "@/lib/leadgenRealtime";

const AUTO_RELEASE_DAYS = 14;
const NOTIFICATION_THROTTLE_MS = 60_000;
const SEEN_KEY = (portalId: string) => `leadgen_autoreleased_seen_${portalId}`;

export interface AutoReleaseNotification {
  count: number;
  leadNames: string[];
}

export function useAutoRelease() {
  const { currentPortalId } = usePortalDB();
  const [notification, setNotification] = useState<AutoReleaseNotification | null>(null);

  const runRelease = useCallback(async () => {
    if (!currentPortalId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Find inactive assigned leads
    const { data: staleLeads } = await supabase
      .from("leadgen_leads")
      .select("id, name, assigned_to")
      .eq("portal_id", currentPortalId)
      .in("outreach_status", ["contacted", "replied"])
      .not("assigned_to", "is", null)
      .or(`last_activity_at.lt.${cutoff},and(last_activity_at.is.null,updated_at.lt.${cutoff})`);

    if (!staleLeads?.length) return;

    // Release each lead
    const ids = staleLeads.map((l) => l.id);

    await supabase
      .from("leadgen_leads")
      .update({ assigned_to: null, assigned_at: null, last_activity_at: now })
      .eq("portal_id", currentPortalId)
      .in("id", ids);

    // Insert system events
    const events = staleLeads.map((l) => ({
      portal_id: currentPortalId,
      lead_id: l.id,
      channel: "email" as const,
      direction: "outbound" as const,
      notes: `Rilasciato automaticamente al pool — inattivo ${AUTO_RELEASE_DAYS} giorni`,
      occurred_at: now,
      user_id: null,
    }));
    await supabase.from("leadgen_outreach_events").insert(events);

    broadcastLeadgenUpdate("lead_updated");

    // Notification: only for leads that were assigned to the current user
    const myReleased = staleLeads.filter((l) => l.assigned_to === user.id);
    if (myReleased.length > 0) {
      const lastSeen = localStorage.getItem(SEEN_KEY(currentPortalId));
      // Only notify if we haven't notified for this batch
      if (!lastSeen || new Date(lastSeen).getTime() < Date.now() - NOTIFICATION_THROTTLE_MS) {
        setNotification({
          count: myReleased.length,
          leadNames: myReleased.map((l) => l.name).slice(0, 3),
        });
      }
    }
  }, [currentPortalId]);

  const dismissNotification = useCallback(() => {
    if (!currentPortalId) return;
    localStorage.setItem(SEEN_KEY(currentPortalId), new Date().toISOString());
    setNotification(null);
  }, [currentPortalId]);

  // Run once on mount
  useEffect(() => { runRelease(); }, [runRelease]);

  return { notification, dismissNotification };
}
