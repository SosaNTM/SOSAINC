import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BACKUP_TABLES = [
  "portals",
  "portal_members",
  "portal_security_settings",
  "transactions",
  "transaction_categories",
  "budgets",
  "goals",
  "subscriptions",
  "crypto_holdings",
  "tasks",
  "projects",
  "notes",
  "note_folders",
  "cloud_folders",
  "cloud_files",
  "vault_items",
  "gift_cards",
  "invoices",
];

const RETENTION_DAYS = 30;

serve(async (req) => {
  // Only accept calls from the cron scheduler (service role)
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const cutoff = new Date(date.getTime() - RETENTION_DAYS * 86_400_000).toISOString();

  const results: Record<string, { rows: number } | { error: string }> = {};

  for (const table of BACKUP_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        results[table] = { error: error.message };
        continue;
      }

      const payload = new TextEncoder().encode(JSON.stringify(data, null, 2));
      const { error: uploadErr } = await supabase.storage
        .from("backups")
        .upload(`${timestamp}/${table}.json`, payload, {
          contentType: "application/json",
          upsert: true,
        });

      results[table] = uploadErr ? { error: uploadErr.message } : { rows: data.length };
    } catch (err) {
      results[table] = { error: String(err) };
    }
  }

  // Purge backups older than RETENTION_DAYS
  try {
    const { data: oldFiles } = await supabase.storage
      .from("backups")
      .list("", { limit: 1000 });

    const toDelete = (oldFiles ?? [])
      .filter((f) => f.name < cutoff.slice(0, 19).replace(/[:.]/g, "-"))
      .map((f) => f.name);

    if (toDelete.length > 0) {
      await supabase.storage.from("backups").remove(toDelete);
    }
  } catch (_) {
    // Purge failure is non-fatal
  }

  return new Response(JSON.stringify({ timestamp, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
