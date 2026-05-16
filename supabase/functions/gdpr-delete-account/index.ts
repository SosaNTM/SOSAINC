// supabase/functions/gdpr-delete-account/index.ts
//
// POST — permanently deletes the caller's account (auth.users row) and every
// piece of user-scoped data they own across all portals.
//
// Hard deletes (cannot be undone). Re-confirms identity via JWT. Idempotent
// once executed (a second call returns 410 because the user is gone).
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(data: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

  const rl = checkRateLimit(req, 3, 60_000);
  if (rl) return rl;

  const jwt = await verifyJWT(req);
  if (jwt instanceof Response) return jwt;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const userId = jwt.userId;

  // Tables that store user_id (per-user data — wipe these where user_id matches)
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
    "vault_item_history",
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
  ];

  for (const t of userScopedTables) {
    await admin.from(t).delete().eq("user_id", userId);
  }

  // user_profiles uses 'id' as the user FK
  await admin.from("user_profiles").delete().eq("id", userId);

  // Remove every portal membership
  await admin.from("portal_members").delete().eq("user_id", userId);

  // Storage objects under user-scoped paths
  // Note: Supabase Storage doesn't have native "delete by prefix"; iterate.
  for (const bucket of ["vault-files", "inventory-files"]) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (files && files.length > 0) {
      await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
    }
  }

  // Finally drop the auth.users row (cascade kills identities + sessions)
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return json({ error: `Auth deletion failed: ${delErr.message}` }, 500, req);
  }

  return json({ ok: true, deleted: userId }, 200, req);
});
