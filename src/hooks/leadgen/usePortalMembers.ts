import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";

export interface PortalMember {
  user_id: string;
  role: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
}

export function usePortalMembers() {
  const { currentPortalId } = usePortalDB();
  const [members, setMembers] = useState<PortalMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentPortalId) { setLoading(false); return; }
    (async () => {
      const { data: pm } = await supabase
        .from("portal_members")
        .select("user_id, role")
        .eq("portal_id", currentPortalId);
      if (!pm?.length) { setLoading(false); return; }
      const userIds = pm.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, display_name, email, avatar_url")
        .in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      setMembers(pm.map((r) => {
        const prof = profileMap.get(r.user_id);
        return {
          user_id: r.user_id,
          role: r.role,
          display_name: prof?.display_name ?? null,
          email: prof?.email ?? r.user_id,
          avatar_url: prof?.avatar_url ?? null,
        };
      }));
      setLoading(false);
    })();
  }, [currentPortalId]);

  return { members, loading };
}
