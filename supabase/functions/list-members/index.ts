// supabase/functions/list-members/index.ts
//
// Returns portal members with email addresses (requires service role for auth.admin).
// Caller must be a member of the requested portal.
//
// GET ?portalId=<uuid>
//
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  const rateLimitResp = checkRateLimit(req, 60, 60_000);
  if (rateLimitResp) return rateLimitResp;

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, req);

  const url     = new URL(req.url);
  const portalId = url.searchParams.get("portalId");
  if (!portalId) return json({ error: "Missing required query param: portalId" }, 400, req);

  // User client (RLS) — verify caller is a member of this portal
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: callerCheck } = await userClient
    .from("portal_members")
    .select("user_id")
    .eq("portal_id", portalId)
    .maybeSingle();

  if (!callerCheck) return json({ error: "Forbidden: not a member of this portal" }, 403, req);

  // Admin client — fetch member rows + auth user emails
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  const { data: memberRows, error: memberErr } = await adminClient
    .from("portal_members")
    .select("user_id, role")
    .eq("portal_id", portalId);

  if (memberErr) return json({ error: memberErr.message }, 500, req);
  if (!memberRows?.length) return json({ members: [] }, 200, req);

  const userIds = memberRows.map((r: { user_id: string }) => r.user_id);

  // Fetch profiles for display names + avatars
  const { data: profiles } = await adminClient
    .from("user_profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p: {
    id: string; display_name: string | null; avatar_url: string | null
  }) => [p.id, p]));

  // Fetch auth users for emails
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    (authData?.users ?? [])
      .filter((u) => userIds.includes(u.id))
      .map((u) => [u.id, u.email ?? ""]),
  );

  const members = memberRows.map((row: { user_id: string; role: string }) => {
    const prof = profileMap.get(row.user_id);
    return {
      user_id:      row.user_id,
      role:         row.role,
      email:        emailMap.get(row.user_id) ?? "",
      display_name: prof?.display_name ?? emailMap.get(row.user_id) ?? row.user_id,
      avatar_url:   prof?.avatar_url ?? null,
    };
  });

  return json({ members }, 200, req);
});
