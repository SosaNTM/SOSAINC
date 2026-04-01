// Supabase Edge Function: task-reminder
// Sends the ICONOFF daily task briefing via Telegram to all enabled users.
//
// Required secrets:
//   TELEGRAM_BOT_TOKEN
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// ── Deploy ───────────────────────────────────────────────────────
// supabase functions deploy task-reminder --no-verify-jwt
//
// ── Test manually (sends immediately, ignores time) ──────────────
// curl -X POST "https://{PROJECT_REF}.supabase.co/functions/v1/task-reminder?test=true" \
//      -H "Authorization: Bearer {SERVICE_ROLE_KEY}"
//
// ── Scheduling ───────────────────────────────────────────────────
// Triggered by pg_cron at 07:00 UTC daily (see migration task_reminder_cron.sql)
// Per-user notification_time is stored; hourly cron filtering is a future iteration.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

// ─────────────────────────────────────────────────────────────────
// Supabase client
// ─────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─────────────────────────────────────────────────────────────────
// Telegram helper
// ─────────────────────────────────────────────────────────────────

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
  const json = (await res.json()) as { ok: boolean; description?: string };
  if (!json.ok) {
    console.error(`Telegram error for chat ${chatId}:`, json.description);
  }
  return json.ok;
}

// ─────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function yesterdayStartISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─────────────────────────────────────────────────────────────────
// Italian date header
// ─────────────────────────────────────────────────────────────────

// TODO: Support user locale preference. Currently hardcoded to Italian.
const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MESI   = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                 "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function italianDateHeader(): string {
  const now = new Date();
  const giorno = GIORNI[now.getDay()];
  const mese   = MESI[now.getMonth()];
  return `${giorno} ${now.getDate()} ${mese} ${now.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface UserToNotify {
  user_id: string;
  telegram_chat_id: string;
  first_name: string | null;
  notification_time: string;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  status: string;
  priority: string | null;
  projects: { name: string } | null;
}

// ─────────────────────────────────────────────────────────────────
// Fetch users eligible for notification
// ─────────────────────────────────────────────────────────────────

async function getEligibleUsers(): Promise<UserToNotify[]> {
  const sb = getSupabase();

  // Get telegram settings for enabled users not paused
  const { data: settings, error } = await sb
    .from("telegram_settings")
    .select("user_id, telegram_chat_id, notification_time")
    .eq("notifications_enabled", true)
    .not("telegram_chat_id", "is", null)
    .or(`paused_until.is.null,paused_until.lt.${new Date().toISOString()}`);

  if (error || !settings?.length) return [];

  // Fetch first names from auth.users metadata in one go
  // (auth.users is only accessible via service role admin API)
  const userIds = settings.map((s: { user_id: string }) => s.user_id);
  const { data: authUsers } = await sb.auth.admin.listUsers({ perPage: 1000 });

  const nameMap = new Map<string, string | null>();
  for (const u of authUsers?.users ?? []) {
    const firstName =
      (u.user_metadata?.first_name as string | undefined) ??
      (u.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
      null;
    nameMap.set(u.id, firstName);
  }

  return settings
    .filter((s: { user_id: string }) => userIds.includes(s.user_id))
    .map((s: { user_id: string; telegram_chat_id: string; notification_time: string }) => ({
      user_id: s.user_id,
      telegram_chat_id: s.telegram_chat_id,
      notification_time: s.notification_time ?? "08:00:00",
      first_name: nameMap.get(s.user_id) ?? null,
    }));
}

// ─────────────────────────────────────────────────────────────────
// Fetch tasks for a user (overdue / today / tomorrow / done-yesterday)
// ─────────────────────────────────────────────────────────────────

interface UserTasks {
  overdue:            Task[];
  today:              Task[];
  tomorrow:           Task[];
  completedYesterday: number;
}

async function getTasksForUser(userId: string): Promise<UserTasks> {
  const sb = getSupabase();
  const today    = todayISO();
  const tomorrow = tomorrowISO();
  const yStart   = yesterdayStartISO();

  const [overdueRes, todayRes, tomorrowRes, doneRes] = await Promise.all([
    sb.from("tasks")
      .select("id, title, due_date, status, priority, projects(name)")
      .eq("assigned_to", userId)
      .lt("due_date", today)
      .neq("status", "completed")
      .order("due_date", { ascending: true })
      .limit(10),

    sb.from("tasks")
      .select("id, title, due_date, status, priority, projects(name)")
      .eq("assigned_to", userId)
      .eq("due_date", today)
      .neq("status", "completed")
      .order("priority", { ascending: false }),

    sb.from("tasks")
      .select("id, title, due_date, status, priority, projects(name)")
      .eq("assigned_to", userId)
      .eq("due_date", tomorrow)
      .neq("status", "completed")
      .order("priority", { ascending: false }),

    sb.from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", userId)
      .eq("status", "completed")
      .gte("updated_at", yStart),
  ]);

  return {
    overdue:            (overdueRes.data ?? []) as Task[],
    today:              (todayRes.data   ?? []) as Task[],
    tomorrow:           (tomorrowRes.data ?? []) as Task[],
    completedYesterday: doneRes.count ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// Build the briefing message
// ─────────────────────────────────────────────────────────────────

function formatTaskLine(t: Task): string {
  const project = t.projects?.name ? ` — _${t.projects.name}_` : "";
  return `• ${t.title}${project}`;
}

function buildBriefing(tasks: UserTasks, firstName: string | null): string {
  const { overdue, today, tomorrow, completedYesterday } = tasks;
  const hasAnything = overdue.length || today.length || tomorrow.length;
  const name = firstName ? `, ${firstName}` : "";

  if (!hasAnything && completedYesterday === 0) {
    return `✅ Nessuna task in scadenza oggi.\nBuona giornata${name}! 🚀`;
  }

  const lines: string[] = [];
  lines.push(`📋 *ICONOFF Daily Brief — ${italianDateHeader()}*`);
  lines.push("");

  if (overdue.length) {
    lines.push(`🔴 *SCADUTE (${overdue.length})*`);
    lines.push("");
    for (const t of overdue) lines.push(formatTaskLine(t));
    lines.push("");
  }

  if (today.length) {
    lines.push(`🟠 *SCADONO OGGI (${today.length})*`);
    lines.push("");
    for (const t of today) lines.push(formatTaskLine(t));
    lines.push("");
  }

  if (tomorrow.length) {
    lines.push(`🟡 *SCADONO DOMANI (${tomorrow.length})*`);
    lines.push("");
    for (const t of tomorrow) lines.push(formatTaskLine(t));
    lines.push("");
  }

  if (completedYesterday > 0) {
    lines.push(`✅ Completate ieri: *${completedYesterday}* task`);
    lines.push("");
  }

  lines.push(`Buona giornata! 🚀`);

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const rl = checkRateLimit(req);
  if (rl) return rl;

  // Health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", fn: "task-reminder" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";

  console.log(`task-reminder triggered | test=${isTest} | ${new Date().toISOString()}`);

  const errors: Array<{ userId: string; error: string }> = [];
  let usersNotified = 0;

  try {
    const users = await getEligibleUsers();
    console.log(`Eligible users: ${users.length}`);

    await Promise.allSettled(
      users.map(async (user) => {
        try {
          const tasks   = await getTasksForUser(user.user_id);
          const message = buildBriefing(tasks, user.first_name);
          const sent    = await sendTelegramMessage(user.telegram_chat_id, message);

          if (sent) {
            usersNotified++;
            console.log(`✓ Notified user ${user.user_id} (chat ${user.telegram_chat_id})`);
          } else {
            errors.push({ userId: user.user_id, error: "Telegram sendMessage returned ok:false" });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`✗ Failed for user ${user.user_id}:`, msg);
          errors.push({ userId: user.user_id, error: msg });
        }
      })
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("task-reminder fatal error:", msg);
    // Still return 200 — pg_cron should not retry on app-level errors
    return new Response(
      JSON.stringify({ success: false, usersNotified: 0, errors: [{ userId: "global", error: msg }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = { success: true, usersNotified, errors };
  console.log("task-reminder complete:", JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
