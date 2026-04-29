import { supabase } from "@/lib/supabase";
import { toPortalUUID } from "@/lib/portalUUID";
import type { DbAuditLogEntry, NewDbAuditLogEntry } from "@/types/database";

export async function fetchAuditLog(
  portalId: string,
  limit = 100,
  offset = 0,
): Promise<DbAuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .eq("portal_id", toPortalUUID(portalId))
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function addAuditEntry(
  entry: Omit<NewDbAuditLogEntry, "portal_id">,
  portalId: string,
): Promise<void> {
  // Pre-check membership — avoids noisy 403 in console when RLS would reject anyway.
  // If the current user isn't a member of this portal, skip the audit insert entirely.
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    const { count } = await supabase
      .from("portal_members")
      .select("*", { count: "exact", head: true })
      .eq("portal_id", toPortalUUID(portalId))
      .eq("user_id", uid);
    if (!count) return;
    await supabase.from("audit_log").insert({
      ...entry,
      portal_id: toPortalUUID(portalId),
    });
  } catch {
    // Audit log failures must never break the main flow
  }
}

export async function addAuditEntryForUser(
  action: string,
  portalId: string,
  options?: {
    category?: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
    severity?: DbAuditLogEntry["severity"];
  },
): Promise<void> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return; // auth error — skip audit, never throw
    const user = data?.user ?? null;
    await addAuditEntry(
      {
        user_id: user?.id ?? null,
        user_name: user?.email ?? null,
        action,
        category: options?.category ?? null,
        entity_type: options?.entityType ?? null,
        entity_id: options?.entityId ?? null,
        details: options?.details ?? null,
        severity: options?.severity ?? "info",
        ip_address: null,
      },
      portalId,
    );
  } catch {
    // Audit log failures must never break the main flow
  }
}
