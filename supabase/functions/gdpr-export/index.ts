// supabase/functions/gdpr-export/index.ts
//
// GET — returns a JSON dump of all data tied to the calling user across every
// portal they belong to. Includes user profile, preferences, transactions,
// vault items (still encrypted — caller must decrypt client-side), notes,
// tasks, cloud file metadata, social connections, audit log entries.
//
// Output is a single JSON document. Caller's UI can offer it as a download.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, verifyJWT } from "../_shared/rateLimit.ts";

const ALLOWED_ORIGINS = [
  Deno.env.get("FRONTEND_URL") ?? "http://localhost:8080",
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

function json(data: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sosa-export-${new Date().toISOString().slice(0,10)}.json"`,
    },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, req);

  const rl = checkRateLimit(req, 5, 60_000);
  if (rl) return rl;

  const jwt = await verifyJWT(req);
  if (jwt instanceof Response) return jwt;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const userId = jwt.userId;

  const userScopedTables = [
    "personal_transactions",
    "subscriptions",
    "subscription_transactions",
    "financial_goals",
    "investments",
    "crypto_holdings",
    "gift_cards",
    "gift_card_transactions",
    "vault_items",
    "vault_files",
    "cloud_files",
    "notes",
    "note_folders",
    "tasks",
    "task_comments",
    "social_connections",
    "social_posts",
    "social_analytics_snapshots",
    "user_preferences",
    "audit_log",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dump: Record<string, any> = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    notice: "Personal data export per GDPR Art. 20. Vault items remain AES-256-GCM-encrypted; decrypt client-side with your account.",
  };

  for (const t of userScopedTables) {
    const { data } = await admin.from(t).select("*").eq("user_id", userId);
    dump[t] = data ?? [];
  }

  const { data: profile } = await admin.from("user_profiles").select("*").eq("id", userId).maybeSingle();
  dump["user_profile"] = profile ?? null;

  const { data: memberships } = await admin
    .from("portal_members").select("*, portals(slug, name)").eq("user_id", userId);
  dump["portal_memberships"] = memberships ?? [];

  return json(dump, 200, req);
});
