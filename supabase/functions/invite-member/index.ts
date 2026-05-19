// supabase/functions/invite-member/index.ts
//
// Invites a user by email to a portal with a given role.
// Requires caller to be an admin/owner of the target portal.
//
// POST body: { email: string, portalId: string, role: "member"|"admin"|"viewer" }
//
// Required secrets (Supabase Dashboard → Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL            = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY       = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  const rateLimitResp = checkRateLimit(req, 20, 60_000);
  if (rateLimitResp) return rateLimitResp;

  // Auth check — user client with caller's JWT respects RLS
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, req);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Admin client bypasses RLS — only used for auth.admin operations
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  let body: { email?: string; portalId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, req);
  }

  const { email, portalId, role } = body;
  if (!email || !portalId || !role) {
    return json({ error: "Missing required fields: email, portalId, role" }, 400, req);
  }
  if (!["member", "admin", "viewer"].includes(role)) {
    return json({ error: "Invalid role. Use: member, admin, viewer" }, 400, req);
  }

  // Verify caller is admin/owner of this portal (via RLS-filtered query)
  const { data: callerMembership } = await userClient
    .from("portal_members")
    .select("role")
    .eq("portal_id", portalId)
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (!callerMembership) {
    return json({ error: "Forbidden: must be admin or owner of this portal" }, 403, req);
  }

  // Owners can assign any role; admins cannot create other admins/owners
  const { data: { user: callerUser } } = await userClient.auth.getUser();
  if (!callerUser) return json({ error: "Unauthorized" }, 401, req);

  if (callerMembership.role === "admin" && (role === "admin" || role === "owner")) {
    return json({ error: "Admins can only invite members and viewers" }, 403, req);
  }

  // Invite or look up existing user
  let targetUserId: string;

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin
    .inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get("FRONTEND_URL") ?? "http://localhost:8080"}/hub`,
      data: { invited_to_portal: portalId },
    });

  if (inviteError) {
    // User already registered — look up by email
    if (inviteError.message?.toLowerCase().includes("already")) {
      const { data: users } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const existing = users?.users.find((u) => u.email === email);
      if (!existing) {
        return json({ error: `Could not find user with email: ${email}` }, 404, req);
      }
      targetUserId = existing.id;
    } else {
      return json({ error: inviteError.message }, 500, req);
    }
  } else {
    targetUserId = inviteData.user.id;
  }

  // Add to portal_members (upsert — safe if already member, just updates role)
  const { error: memberError } = await adminClient
    .from("portal_members")
    .upsert(
      { portal_id: portalId, user_id: targetUserId, role },
      { onConflict: "portal_id,user_id" },
    );

  if (memberError) {
    return json({ error: memberError.message }, 500, req);
  }

  // Seed a user_profiles row if none exists (so member list shows something)
  await adminClient
    .from("user_profiles")
    .upsert({ id: targetUserId, display_name: email }, { onConflict: "id", ignoreDuplicates: true });

  return json({ success: true, userId: targetUserId }, 200, req);
});
