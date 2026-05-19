// supabase/functions/admin-list-users/index.ts
//
// Returns all unique users across the 4 main portals with their portal assignments.
// Requires caller to be admin/owner of at least one main portal.
//
// GET (no params)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAIN_PORTAL_IDS = [
  "a1000000-0000-0000-0000-000000000001",
  "a1000000-0000-0000-0000-000000000002",
  "a1000000-0000-0000-0000-000000000003",
  "a1000000-0000-0000-0000-000000000004",
];

// Return frontend-compatible slugs (no hyphens). DB has "trust-me" but frontend uses "trustme".
const PORTAL_SLUG: Record<string, string> = {
  "a1000000-0000-0000-0000-000000000001": "sosa",
  "a1000000-0000-0000-0000-000000000002": "keylo",
  "a1000000-0000-0000-0000-000000000003": "redx",
  "a1000000-0000-0000-0000-000000000004": "trustme",
};

const ROLE_RANK: Record<string, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };

const ALLOWED_ORIGINS = [
  Deno.env.get("FRONTEND_URL") ?? "http://localhost:8080",
  "https://sosainc.xyz",
  "https://www.sosainc.xyz",
  "https://sosa-inc.vercel.app",
  "http://localhost:8080",
  "https://iconoff.io",
  "https://www.iconoff.io",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

function json(data: unknown, status = 200, req: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, req);

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, req);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  // Verify caller is admin/owner of at least one main portal
  const { data: callerCheck } = await userClient
    .from("portal_members")
    .select("role")
    .in("portal_id", MAIN_PORTAL_IDS)
    .in("role", ["owner", "admin"])
    .limit(1);

  if (!callerCheck?.length) {
    return json({ error: "Forbidden" }, 403, req);
  }

  const { data: memberships, error: membershipsError } = await adminClient
    .from("portal_members")
    .select("portal_id, user_id, role, joined_at")
    .in("portal_id", MAIN_PORTAL_IDS);

  if (membershipsError) {
    return json({ error: membershipsError.message }, 500, req);
  }

  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id))];
  if (!userIds.length) return json({ users: [] }, 200, req);

  const { data: profiles } = await adminClient
    .from("user_profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  const createdAtMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) {
    if (userIds.includes(u.id)) {
      emailMap[u.id] = u.email ?? "";
      createdAtMap[u.id] = u.created_at;
    }
  }

  const userPortals: Record<string, { portal_id: string; slug: string; role: string }[]> = {};
  for (const m of memberships ?? []) {
    if (!userPortals[m.user_id]) userPortals[m.user_id] = [];
    userPortals[m.user_id].push({
      portal_id: m.portal_id,
      slug: PORTAL_SLUG[m.portal_id] ?? m.portal_id,
      role: m.role,
    });
  }

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const users = userIds.map((uid) => {
    const portals = userPortals[uid] ?? [];
    const topRole = portals.reduce(
      (best, p) => ((ROLE_RANK[p.role] ?? 0) > (ROLE_RANK[best] ?? 0) ? p.role : best),
      "member",
    );
    return {
      id: uid,
      email: emailMap[uid] ?? "",
      display_name: profileMap[uid]?.display_name ?? emailMap[uid]?.split("@")[0] ?? "Unknown",
      avatar_url: profileMap[uid]?.avatar_url ?? null,
      top_role: topRole,
      portals,
      created_at: createdAtMap[uid] ?? null,
    };
  });

  users.sort((a, b) => {
    const rd = (ROLE_RANK[b.top_role] ?? 0) - (ROLE_RANK[a.top_role] ?? 0);
    if (rd !== 0) return rd;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  return json({ users }, 200, req);
});
