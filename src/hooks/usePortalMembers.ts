// ── usePortalMembers ──────────────────────────────────────────────────────────
//
// Fetches portal members with emails (via list-members edge function),
// and exposes invite / changeRole / removeMember mutations.
//
// invite → invite-member edge function (needs service role for auth.admin)
// changeRole / removeMember → direct Supabase (RLS admins_manage_members covers it)

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";

export interface PortalMember {
  user_id:      string;
  role:         string;
  email:        string;
  display_name: string;
  avatar_url:   string | null;
}

export type PortalRole = "member" | "admin" | "viewer";

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1`;

async function authHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session ? `Bearer ${data.session.access_token}` : "";
}

export interface UsePortalMembersResult {
  members:      PortalMember[];
  loading:      boolean;
  invite:       (email: string, role: PortalRole) => Promise<{ error?: string }>;
  changeRole:   (userId: string, role: PortalRole) => Promise<{ error?: string }>;
  removeMember: (userId: string) => Promise<{ error?: string }>;
  refetch:      () => void;
}

export function usePortalMembers(): UsePortalMembersResult {
  const { currentPortalId } = usePortalDB();
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);

  useEffect(() => {
    if (!currentPortalId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const auth = await authHeader();
      const res  = await fetch(
        `${EDGE_BASE}/list-members?portalId=${encodeURIComponent(currentPortalId)}`,
        { headers: { Authorization: auth, "Content-Type": "application/json" } },
      );
      if (cancelled) return;
      if (res.ok) {
        const json = await res.json() as { members: PortalMember[] };
        setMembers(json.members ?? []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [currentPortalId, tick]);

  const invite = useCallback(async (email: string, role: PortalRole) => {
    if (!currentPortalId) return { error: "No portal selected" };
    const auth = await authHeader();
    const res  = await fetch(`${EDGE_BASE}/invite-member`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ email, portalId: currentPortalId, role }),
    });
    const json = await res.json() as { error?: string };
    if (!res.ok) return { error: json.error ?? "Invite failed" };
    setTick((t) => t + 1);
    return {};
  }, [currentPortalId]);

  const changeRole = useCallback(async (userId: string, role: PortalRole) => {
    if (!currentPortalId) return { error: "No portal selected" };
    const { error } = await supabase
      .from("portal_members")
      .update({ role })
      .eq("portal_id", currentPortalId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role } : m));
    return {};
  }, [currentPortalId]);

  const removeMember = useCallback(async (userId: string) => {
    if (!currentPortalId) return { error: "No portal selected" };
    const { error } = await supabase
      .from("portal_members")
      .delete()
      .eq("portal_id", currentPortalId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    return {};
  }, [currentPortalId]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { members, loading, invite, changeRole, removeMember, refetch };
}
