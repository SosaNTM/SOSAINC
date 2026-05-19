// supabase/functions/create-member/index.ts
//
// Creates a new Supabase auth user directly (email + password, no invite email)
// and assigns them to one or more portals with a given role.
// Requires caller to be an owner of at least one target portal.
//
// POST body: { email, password, displayName, role, portalSlugs: string[] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PORTAL_UUID: Record<string, string> = {
  sosa:       "a1000000-0000-0000-0000-000000000001",
  keylo:      "a1000000-0000-0000-0000-000000000002",
  redx:       "a1000000-0000-0000-0000-000000000003",
  trustme:    "a1000000-0000-0000-0000-000000000004",
  "trust-me": "a1000000-0000-0000-0000-000000000004",
};

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

  const rateLimitResp = checkRateLimit(req, 10, 60_000);
  if (rateLimitResp) return rateLimitResp;

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, req);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  let body: { email?: string; password?: string; displayName?: string; role?: string; portalSlugs?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, req);
  }

  const { email, password, displayName, role, portalSlugs } = body;

  if (!email || !password || !displayName || !portalSlugs?.length) {
    return json({ error: "Missing required fields: email, password, displayName, portalSlugs" }, 400, req);
  }
  if (!["member", "viewer", "admin"].includes(role ?? "")) {
    return json({ error: "Invalid role. Use: member, viewer, admin" }, 400, req);
  }
  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters" }, 400, req);
  }

  const portalUUIDs = (portalSlugs as string[]).map((s) => PORTAL_UUID[s]).filter(Boolean);
  if (!portalUUIDs.length) {
    return json({ error: "No valid portal slugs provided" }, 400, req);
  }

  // Verify caller is owner of at least one target portal
  const { data: callerCheck } = await userClient
    .from("portal_members")
    .select("role")
    .in("portal_id", portalUUIDs)
    .eq("role", "owner")
    .limit(1);

  if (!callerCheck?.length) {
    return json({ error: "Forbidden: must be owner to create logins" }, 403, req);
  }

  // Create auth user (email_confirm: true = immediate login, no verification email)
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (createError) {
    return json({ error: createError.message }, 400, req);
  }

  const userId = authData.user.id;

  await adminClient
    .from("user_profiles")
    .upsert({ id: userId, display_name: displayName }, { onConflict: "id" });

  const memberships = portalUUIDs.map((portalId) => ({
    portal_id: portalId,
    user_id: userId,
    role: role!,
  }));

  const { error: memberError } = await adminClient
    .from("portal_members")
    .upsert(memberships, { onConflict: "portal_id,user_id" });

  if (memberError) {
    return json({ error: memberError.message }, 500, req);
  }

  return json({ success: true, user: { id: userId, email } }, 200, req);
});
