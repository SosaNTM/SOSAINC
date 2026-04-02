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
  try {
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
