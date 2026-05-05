import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenMember, LeadgenMemberRole, LeadgenMemberTeam } from "@/types/leadgen";

export interface LeadgenMemberWithProfile extends LeadgenMember {
  email: string;
  avatar_url: string | null;
}

export interface WorkloadEntry {
  total: number;      // all assigned leads
  active: number;     // contacted + replied + qualified
}

export function useLeadgenMembers() {
  const { currentPortalId } = usePortalDB();
  const [members, setMembers] = useState<LeadgenMemberWithProfile[]>([]);
  const [currentMember, setCurrentMember] = useState<LeadgenMember | null>(null);
  const [workload, setWorkload] = useState<Map<string, WorkloadEntry>>(new Map());
  const [poolCount, setPoolCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const [membersRes, workloadRes, poolRes] = await Promise.all([
      supabase
        .from("leadgen_members")
        .select("*")
        .eq("portal_id", currentPortalId)
        .order("added_at"),
      supabase
        .from("leadgen_leads")
        .select("assigned_to, outreach_status")
        .eq("portal_id", currentPortalId)
        .not("assigned_to", "is", null),
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "new")
        .is("assigned_to", null),
    ]);

    const rawMembers = (membersRes.data ?? []) as LeadgenMember[];

    // Enrich with profiles
    const userIds = rawMembers.map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await supabase
          .from("user_profiles")
          .select("id, email, avatar_url")
          .in("id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const enriched: LeadgenMemberWithProfile[] = rawMembers.map((m) => ({
      ...m,
      email: profileMap.get(m.user_id)?.email ?? m.user_id,
      avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
    }));

    setMembers(enriched);

    if (user) {
      const own = rawMembers.find((m) => m.user_id === user.id) ?? null;
      setCurrentMember(own);
    }

    // Compute workload map
    const wmap = new Map<string, WorkloadEntry>();
    const ACTIVE_STATUSES = new Set(["contacted", "replied", "qualified"]);
    for (const row of workloadRes.data ?? []) {
      const uid = row.assigned_to as string;
      const entry = wmap.get(uid) ?? { total: 0, active: 0 };
      entry.total += 1;
      if (ACTIVE_STATUSES.has(row.outreach_status)) entry.active += 1;
      wmap.set(uid, entry);
    }
    setWorkload(wmap);
    setPoolCount(poolRes.count ?? 0);

    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const searchByEmail = useCallback(async (email: string): Promise<{ user_id: string; display_name: string | null; email: string } | null> => {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, display_name, email")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (!data) return null;
    return { user_id: data.id, display_name: data.display_name ?? null, email: data.email };
  }, []);

  const addMember = useCallback(async (params: {
    user_id: string;
    role: LeadgenMemberRole;
    team: LeadgenMemberTeam;
    display_name?: string;
  }): Promise<{ error: string | null }> => {
    if (!currentPortalId) return { error: "Nessun portale" };
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("leadgen_members").insert({
      portal_id: currentPortalId,
      user_id: params.user_id,
      role: params.role,
      team: params.team,
      display_name: params.display_name ?? null,
      added_by: user?.id ?? null,
    });
    if (!error) await fetchAll();
    return { error: error?.message ?? null };
  }, [currentPortalId, fetchAll]);

  const updateMember = useCallback(async (id: string, patch: Partial<Pick<LeadgenMember, "role" | "team" | "display_name" | "active" | "notes">>): Promise<{ error: string | null }> => {
    const { error } = await supabase.from("leadgen_members").update(patch).eq("id", id);
    if (!error) await fetchAll();
    return { error: error?.message ?? null };
  }, [fetchAll]);

  const deactivateMember = useCallback(async (id: string): Promise<{ error: string | null }> => {
    return updateMember(id, { active: false });
  }, [updateMember]);

  return {
    members,
    currentMember,
    workload,
    poolCount,
    loading,
    refetch: fetchAll,
    searchByEmail,
    addMember,
    updateMember,
    deactivateMember,
  };
}
