// Supabase Edge Function: telegram-webhook
// Handles all incoming Telegram bot updates for ICONOFF
//
// Required secrets (supabase secrets set --env-file .env):
//   TELEGRAM_BOT_TOKEN
//   OPENAI_API_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// ── Webhook registration (run once after deploy) ─────────────────
// curl -X POST "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook" \
//      -H "Content-Type: application/json" \
//      -d '{"url": "https://{PROJECT_REF}.supabase.co/functions/v1/telegram-webhook"}'
//
// ── Verify webhook ───────────────────────────────────────────────
// curl "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getWebhookInfo"
//
// ── Deploy ───────────────────────────────────────────────────────
// supabase functions deploy telegram-webhook --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  document?: TelegramDocument;
  voice?: TelegramVoice;
  caption?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

interface TelegramChat {
  id: number;
}

interface TelegramDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramVoice {
  file_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

interface TelegramInlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

// ─────────────────────────────────────────────────────────────────
// Telegram API helpers
// ─────────────────────────────────────────────────────────────────

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

async function tg(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(
  chatId: number,
  text: string,
  extra?: Partial<{ parse_mode: string; reply_markup: TelegramInlineKeyboard }>
): Promise<void> {
  await tg("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown", ...extra });
}

async function answerCallback(callbackId: string, text: string): Promise<void> {
  await tg("answerCallbackQuery", { callback_query_id: callbackId, text });
}

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  const data = (await res.json()) as { ok: boolean; result?: { file_path: string } };
  if (!data.ok || !data.result) return null;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
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

function inNDaysISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────
// Help message
// ─────────────────────────────────────────────────────────────────

const HELP_TEXT = `
📋 *ICONOFF Bot — Comandi disponibili*

📅 *Task*
/task — tutte le tue task per priorità (completo)
/oggi — task in scadenza oggi
/domani — task in scadenza domani
/scadute — task già scadute
/settimana — overview della settimana
/completed \`[ID]\` — segna una task come completata

📝 *Note*
/nota \`[testo]\` — salva una nota in Generale
_Puoi anche inviare un file o un messaggio vocale_

⚙️ *Impostazioni*
/orario \`HH:MM\` — cambia orario del briefing
/pausa — sospendi notifiche per oggi
/stop — disattiva tutte le notifiche

/cmd — lista completa dei comandi
`.trim();

// ─────────────────────────────────────────────────────────────────
// /cmd — full command reference, formatted
// ─────────────────────────────────────────────────────────────────

const CMD_TEXT = `
📖 *ICONOFF — Tutti i comandi*

━━━━━━━━━━━━━━━━━━━━━━━━━
📅 *TASK*
━━━━━━━━━━━━━━━━━━━━━━━━━
/task
→ Tutte le task attive, ordinate per priorità con tutti i dettagli

/oggi
→ Task in scadenza oggi

/domani
→ Task in scadenza domani

/scadute
→ Task con scadenza già passata

/settimana
→ Overview dei prossimi 7 giorni, raggruppata per giorno

/completed \`ID\`
→ Segna una task come completata sul portale
   Es: \`/completed DEN-2\`
   Senza ID mostra la lista delle task aperte

━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *NOTE*
━━━━━━━━━━━━━━━━━━━━━━━━━
/nota \`testo\`
→ Salva una nota di testo nella sezione Generale
   Es: \`/nota Chiamare il cliente domani\`

📎 Documento
→ Invia un file direttamente in chat per salvarlo come nota

🎙 Vocale → (coming soon)
Invia un messaggio vocale per salvarlo come nota

━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ *IMPOSTAZIONI*
━━━━━━━━━━━━━━━━━━━━━━━━━
/orario \`HH:MM\`
→ Imposta l'orario del briefing mattutino
   Es: \`/orario 08:30\`

/pausa
→ Sospendi le notifiche fino a mezzanotte di oggi

/stop
→ Disattiva completamente le notifiche

/help
→ Mostra il riepilogo rapido dei comandi

/cmd
→ Questa schermata
`.trim();

// ─────────────────────────────────────────────────────────────────
// In-memory pending note store (keyed by chat_id)
// Edge functions are stateless; this handles same-invocation flow.
// For cross-invocation state, use the DB or KV store.
// ─────────────────────────────────────────────────────────────────

const pendingNotes = new Map<number, {
  content: string;
  file_url?: string;
  file_name?: string;
  file_type?: "document" | "voice";
  transcription?: string;
}>();

// ─────────────────────────────────────────────────────────────────
// Supabase client (service role — bypasses RLS)
// ─────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

// ─────────────────────────────────────────────────────────────────
// Lookup user by telegram chat_id
// Returns user_id + notification settings, or null if not linked
// ─────────────────────────────────────────────────────────────────

interface TelegramUserRecord {
  user_id: string;
  notification_time: string;       // HH:MM:SS
  paused_until: string | null;
  notifications_enabled: boolean;
}

async function getUserByChatId(chatId: number): Promise<TelegramUserRecord | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("telegram_settings")
    .select("user_id, notification_time, paused_until, notifications_enabled")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();

  if (!data) return null;
  return {
    user_id: data.user_id,
    notification_time: data.notification_time ?? "08:00:00",
    paused_until: data.paused_until ?? null,
    notifications_enabled: data.notifications_enabled ?? false,
  };
}

// ─────────────────────────────────────────────────────────────────
// Build project inline keyboard for a user
// ─────────────────────────────────────────────────────────────────

async function buildProjectKeyboard(
  userId: string,
  noteKey: string
): Promise<TelegramInlineKeyboard> {
  const sb = getSupabase();
  const { data: projects } = await sb
    .from("projects")
    .select("id, name")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("name")
    .limit(8);

  const buttons: Array<{ text: string; callback_data: string }> = (projects ?? []).map((p: { id: string; name: string }) => ({
    text: p.name,
    callback_data: `project_select:${p.id}:${noteKey}`,
  }));

  buttons.push({ text: "📥 Nessun progetto", callback_data: `project_select:none:${noteKey}` });

  // Max 2 buttons per row
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  return { inline_keyboard: rows };
}

// ─────────────────────────────────────────────────────────────────
// Task types & formatting
// ─────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string;
  due_date?: string | null;
  priority?: string;
  labels?: string[];
  estimate?: number | null;
  projects?: { name: string } | null;
}

// Priority sort order (lower = more urgent)
const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3, none: 4,
};

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Da fare",
  in_progress: "In corso",
  in_review: "In revisione",
  done: "Completata",
  cancelled: "Annullata",
};

const STATUS_ICON: Record<string, string> = {
  backlog: "⬜", todo: "🔲", in_progress: "🔄", in_review: "👁",
  done: "✅", cancelled: "❌",
};

const PRIORITY_ICON: Record<string, string> = {
  urgent: "🔴", high: "🟠", medium: "🟡", low: "🔵", none: "⚪",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "URGENTE", high: "ALTA", medium: "MEDIA", low: "BASSA", none: "NESSUNA",
};

function formatTask(t: Task): string {
  const project = t.projects?.name ? ` _(${t.projects.name})_` : "";
  const priority = t.priority === "high" ? " 🔴" : t.priority === "medium" ? " 🟡" : "";
  return `• ${t.title}${project}${priority}`;
}

function formatTaskFull(t: Task, index: number): string {
  const lines: string[] = [];

  // Title line
  const priorityIcon = PRIORITY_ICON[t.priority ?? "none"] ?? "⚪";
  lines.push(`${priorityIcon} *${t.id} — ${t.title}*`);

  // Status
  const statusIcon = STATUS_ICON[t.status ?? "todo"] ?? "🔲";
  const statusLabel = STATUS_LABEL[t.status ?? "todo"] ?? t.status ?? "—";
  lines.push(`├ ${statusIcon} Stato: ${statusLabel}`);

  // Project
  if (t.projects?.name) {
    lines.push(`├ 📁 Progetto: ${t.projects.name}`);
  }

  // Due date
  if (t.due_date) {
    const d = new Date(t.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = d < today;
    const dateStr = d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
    lines.push(`├ 📅 Scadenza: ${overdue ? "⚠️ " : ""}${dateStr}`);
  }

  // Labels
  if (t.labels && t.labels.length > 0) {
    lines.push(`├ 🏷 Label: ${t.labels.join(", ")}`);
  }

  // Estimate
  if (t.estimate != null && t.estimate > 0) {
    lines.push(`├ ⏱ Stima: ${t.estimate}h`);
  }

  // Description (last item, use └)
  if (t.description && t.description.trim()) {
    const desc = t.description.trim().slice(0, 120) + (t.description.trim().length > 120 ? "…" : "");
    lines.push(`└ 📝 ${desc}`);
  } else {
    // Replace last ├ with └
    const last = lines[lines.length - 1];
    if (last) lines[lines.length - 1] = last.replace("├", "└");
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// /task command — all tasks sorted by priority
// ─────────────────────────────────────────────────────────────────

async function handleTask(chatId: number, userId: string): Promise<void> {
  const sb = getSupabase();

  const { data: tasks, error } = await sb
    .from("tasks")
    .select("id, title, description, status, priority, labels, due_date, estimate, projects(name)")
    .or(`assigned_to.eq.${userId},creator_id.eq.${userId}`)
    .not("status", "in", '("done","cancelled")')
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    await sendMessage(chatId, "❌ Errore nel recupero delle task. Riprova più tardi.");
    return;
  }

  if (!tasks || tasks.length === 0) {
    await sendMessage(chatId, "✅ Nessuna task in corso. Ottimo lavoro!");
    return;
  }

  // Sort by priority then by due_date
  const sorted = [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority ?? "none"] ?? 4;
    const pb = PRIORITY_ORDER[b.priority ?? "none"] ?? 4;
    if (pa !== pb) return pa - pb;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  // Group by priority
  const groups: Record<string, Task[]> = {};
  for (const t of sorted) {
    const p = t.priority ?? "none";
    if (!groups[p]) groups[p] = [];
    groups[p].push(t as Task);
  }

  const priorityOrder = ["urgent", "high", "medium", "low", "none"];
  const sections: string[] = [];

  for (const p of priorityOrder) {
    if (!groups[p]?.length) continue;
    const icon = PRIORITY_ICON[p];
    const label = PRIORITY_LABEL[p];
    const count = groups[p].length;
    sections.push(`${icon} *${label} (${count})*\n`);
    sections.push(...groups[p].map((t, i) => formatTaskFull(t as Task, i)));
  }

  // Telegram has a 4096 char limit — split into chunks if needed
  const header = `📋 *Le tue task (${tasks.length})*\n`;
  const body = sections.join("\n\n");
  const full = header + "\n" + body;

  if (full.length <= 4000) {
    await sendMessage(chatId, full);
  } else {
    // Send header + each priority group as separate messages
    await sendMessage(chatId, header + `\nHai *${tasks.length}* task attive. Le invio in più messaggi per la leggibilità.\n`);
    for (const p of priorityOrder) {
      if (!groups[p]?.length) continue;
      const icon = PRIORITY_ICON[p];
      const label = PRIORITY_LABEL[p];
      const taskLines = groups[p].map((t, i) => formatTaskFull(t as Task, i)).join("\n\n");
      const chunk = `${icon} *${label} (${groups[p].length})*\n\n${taskLines}`;
      if (chunk.length > 0) await sendMessage(chatId, chunk);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Command handlers
// ─────────────────────────────────────────────────────────────────

async function handleStart(chatId: number, payload: string): Promise<void> {
  const iconoffUserId = payload.replace("/start", "").trim();

  if (!iconoffUserId) {
    await sendMessage(chatId,
      "⚠️ Per collegare il tuo account, usa il link dal profilo ICONOFF."
    );
    return;
  }

  const sb = getSupabase();

  // Upsert telegram_settings row
  const { error } = await sb
    .from("telegram_settings")
    .upsert({
      user_id: iconoffUserId,
      telegram_chat_id: String(chatId),
      notifications_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    await sendMessage(chatId, "❌ Errore durante il collegamento. Riprova più tardi.");
    return;
  }

  await sendMessage(chatId,
    "✅ *Account ICONOFF collegato!*\n\n" +
    "Riceverai il briefing giornaliero ogni mattina alle 08:00.\n\n" +
    "Usa /help per vedere tutti i comandi disponibili."
  );
}

// /completed [task_id] — mark a task as done
// ─────────────────────────────────────────────────────────────────

async function handleCompleted(chatId: number, userId: string, text: string): Promise<void> {
  const taskId = text.replace("/completed", "").trim().toUpperCase();

  // No ID provided — show open tasks so user can pick one
  if (!taskId) {
    const sb = getSupabase();
    const { data: tasks } = await sb
      .from("tasks")
      .select("id, title, priority")
      .or(`assigned_to.eq.${userId},creator_id.eq.${userId}`)
      .not("status", "in", '("done","cancelled")')
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(15);

    if (!tasks?.length) {
      await sendMessage(chatId, "✅ Nessuna task aperta da completare!");
      return;
    }

    const lines = (tasks as Task[]).map(t => {
      const icon = PRIORITY_ICON[t.priority ?? "none"] ?? "⚪";
      return `${icon} \`${t.id}\` — ${t.title}`;
    });

    await sendMessage(
      chatId,
      `📋 *Task aperte*\n\nRispondi con:\n/completed \`ID\`\n\n${lines.join("\n")}`
    );
    return;
  }

  const sb = getSupabase();

  // Fetch the task — must belong to this user
  const { data: task, error: fetchErr } = await sb
    .from("tasks")
    .select("id, title, status, assigned_to, creator_id")
    .eq("id", taskId)
    .maybeSingle();

  if (fetchErr || !task) {
    await sendMessage(chatId, `❌ Task \`${taskId}\` non trovata. Controlla l'ID e riprova.`);
    return;
  }

  if (task.assigned_to !== userId && task.creator_id !== userId) {
    await sendMessage(chatId, `⛔ Non hai i permessi per completare questa task.`);
    return;
  }

  if (task.status === "done") {
    await sendMessage(chatId, `✅ La task *${task.title}* era già segnata come completata.`);
    return;
  }

  // Mark as done
  const { error: updateErr } = await sb
    .from("tasks")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (updateErr) {
    await sendMessage(chatId, "❌ Errore nell'aggiornamento. Riprova più tardi.");
    return;
  }

  await sendMessage(
    chatId,
    `✅ *Task completata!*\n\n*${task.title}* (\`${task.id}\`) è stata segnata come _done_ sul portale ICONOFF.`
  );
}

async function handleStop(chatId: number, userId: string): Promise<void> {
  const sb = getSupabase();
  await sb
    .from("telegram_settings")
    .update({ notifications_enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  await sendMessage(chatId, "🔕 Notifiche disattivate. Scrivi /start per riattivarle.");
}

async function handleOggi(chatId: number, userId: string): Promise<void> {
  const sb = getSupabase();
  const { data: tasks } = await sb
    .from("tasks")
    .select("id, title, due_date, priority, projects(name)")
    .or(`assigned_to.eq.${userId},creator_id.eq.${userId}`)
    .eq("due_date", todayISO())
    .neq("status", "completed")
    .order("priority", { ascending: false })
    .limit(20);

  if (!tasks?.length) {
    await sendMessage(chatId, "✅ Nessuna task in scadenza oggi!");
    return;
  }

  const lines = tasks.map((t) => formatTask(t as Task));
  await sendMessage(chatId, `📋 *Task di oggi (${todayISO()})*\n\n${lines.join("\n")}`);
}

async function handleDomani(chatId: number, userId: string): Promise<void> {
  const sb = getSupabase();
  const { data: tasks } = await sb
    .from("tasks")
    .select("id, title, due_date, priority, projects(name)")
    .or(`assigned_to.eq.${userId},creator_id.eq.${userId}`)
    .eq("due_date", tomorrowISO())
    .neq("status", "completed")
    .order("priority", { ascending: false })
    .limit(20);

  if (!tasks?.length) {
    await sendMessage(chatId, "✅ Nessuna task per domani!");
    return;
  }

  const lines = tasks.map((t) => formatTask(t as Task));
  await sendMessage(chatId, `📋 *Task di domani (${tomorrowISO()})*\n\n${lines.join("\n")}`);
}

async function handleScadute(chatId: number, userId: string): Promise<void> {
  const sb = getSupabase();
  const { data: tasks } = await sb
    .from("tasks")
    .select("id, title, due_date, priority, projects(name)")
    .or(`assigned_to.eq.${userId},creator_id.eq.${userId}`)
    .lt("due_date", todayISO())
    .neq("status", "completed")
    .order("due_date", { ascending: true })
    .limit(10);

  if (!tasks?.length) {
    await sendMessage(chatId, "✅ Nessuna task scaduta!");
    return;
  }

  const lines = tasks.map((t) => {
    const base = formatTask(t as Task);
    return `${base} — _scad. ${(t as Task).due_date}_`;
  });

  await sendMessage(chatId, `⚠️ *Task scadute*\n\n${lines.join("\n")}`);
}

async function handleSettimana(chatId: number, userId: string): Promise<void> {
  const sb = getSupabase();
  const from = todayISO();
  const to = inNDaysISO(7);

  const { data: tasks } = await sb
    .from("tasks")
    .select("id, title, due_date, priority, projects(name)")
    .or(`assigned_to.eq.${userId},creator_id.eq.${userId}`)
    .gte("due_date", from)
    .lte("due_date", to)
    .neq("status", "completed")
    .order("due_date", { ascending: true })
    .limit(50);

  if (!tasks?.length) {
    await sendMessage(chatId, "✅ Nessuna task per i prossimi 7 giorni!");
    return;
  }

  // Group by date
  const grouped: Record<string, Task[]> = {};
  for (const t of tasks) {
    const task = t as Task;
    if (!grouped[task.due_date]) grouped[task.due_date] = [];
    grouped[task.due_date].push(task);
  }

  const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const sections: string[] = [];

  for (const [date, dayTasks] of Object.entries(grouped)) {
    const dayName = DAY_NAMES[new Date(date).getDay()];
    const header = `*${dayName} ${date}*`;
    const lines = dayTasks.map(formatTask);
    sections.push(`${header}\n${lines.join("\n")}`);
  }

  await sendMessage(chatId, `📅 *Prossimi 7 giorni*\n\n${sections.join("\n\n")}`);
}

async function handlePausa(chatId: number, userId: string): Promise<void> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const pausedUntil = today.toISOString();

  const sb = getSupabase();
  await sb
    .from("telegram_settings")
    .update({ paused_until: pausedUntil, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  await sendMessage(chatId, "⏸ Notifiche in pausa per oggi. Riprenderanno domani mattina.");
}

async function handleOrario(chatId: number, userId: string, text: string): Promise<void> {
  const match = text.match(/\/orario\s+(\d{1,2}):(\d{2})/);
  if (!match) {
    await sendMessage(chatId, "⚠️ Formato non valido. Usa: `/orario 09:30`");
    return;
  }

  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    await sendMessage(chatId, "⚠️ Orario non valido. Usa un formato tipo `08:00` o `21:30`.");
    return;
  }

  const timeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
  const sb = getSupabase();
  await sb
    .from("telegram_settings")
    .update({ notification_time: timeStr, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  await sendMessage(chatId,
    `⏰ Orario aggiornato! Riceverai il briefing ogni giorno alle *${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}*.`
  );
}

async function handleNota(chatId: number, userId: string, text: string): Promise<void> {
  const content = text.replace(/^\/nota\s*/i, "").trim();

  if (!content) {
    await sendMessage(chatId, "📝 Scrivi la nota dopo il comando, es: `/nota Chiamare il cliente`");
    return;
  }

  // Save directly to "Generale" — no picker needed
  const sb = getSupabase();
  const { error } = await sb.from("telegram_notes").insert({
    user_id: userId,
    content,
    folder_name: "Generale",
    source: "telegram",
    created_at: new Date().toISOString(),
  });

  if (error) {
    await sendMessage(chatId, "❌ Errore nel salvataggio della nota. Riprova più tardi.");
    return;
  }

  await sendMessage(chatId,
    `✅ *Nota salvata!*\n\n_"${content}"_\n\n📁 Salvata in *Generale* — puoi spostarla in un'altra sezione dal portale ICONOFF.`
  );
}

async function handleDocument(chatId: number, userId: string, msg: TelegramMessage): Promise<void> {
  const doc = msg.document!;
  const fileUrl = await getTelegramFileUrl(doc.file_id);
  if (!fileUrl) {
    await sendMessage(chatId, "❌ Impossibile ottenere il file. Riprova.");
    return;
  }

  // Download and upload to Supabase Storage
  const fileRes = await fetch(fileUrl);
  const fileBlob = await fileRes.blob();
  const fileName = doc.file_name ?? `doc_${Date.now()}`;
  const storagePath = `telegram-notes/${userId}/${fileName}`;

  const sb = getSupabase();
  const { data: uploaded, error: uploadErr } = await sb.storage
    .from("files")
    .upload(storagePath, fileBlob, {
      contentType: doc.mime_type ?? "application/octet-stream",
      upsert: true,
    });

  if (uploadErr) {
    await sendMessage(chatId, "❌ Errore nel caricamento del file.");
    return;
  }

  const { data: publicUrlData } = sb.storage.from("files").getPublicUrl(storagePath);
  const publicUrl = publicUrlData?.publicUrl ?? fileUrl;

  const { error: insertErr } = await sb.from("telegram_notes").insert({
    user_id: userId,
    content: msg.caption ?? fileName,
    file_url: publicUrl,
    file_name: fileName,
    file_type: "document",
    folder_name: "Generale",
    source: "telegram",
    created_at: new Date().toISOString(),
  });

  if (insertErr) {
    await sendMessage(chatId, "❌ Errore nel salvataggio del file.");
    return;
  }

  await sendMessage(chatId,
    `✅ *File salvato!*\n📎 *${fileName}*\n\n📁 Salvato in *Generale* — puoi spostarlo dal portale ICONOFF.`
  );
}

async function handleVoice(chatId: number, userId: string, msg: TelegramMessage): Promise<void> {
  const voice = msg.voice!;
  const fileUrl = await getTelegramFileUrl(voice.file_id);
  if (!fileUrl) {
    await sendMessage(chatId, "❌ Impossibile ottenere il messaggio vocale. Riprova.");
    return;
  }

  // Download OGG
  const audioRes = await fetch(fileUrl);
  const audioBlob = await audioRes.blob();

  // Transcribe via OpenAI Whisper
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  let transcription = "";

  if (openaiKey) {
    const formData = new FormData();
    formData.append("file", new File([audioBlob], "audio.ogg", { type: "audio/ogg" }));
    formData.append("model", "whisper-1");
    formData.append("language", "it");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });

    const whisperData = (await whisperRes.json()) as { text?: string; error?: { message: string } };
    transcription = whisperData.text ?? "";

    if (!transcription) {
      await sendMessage(chatId, "⚠️ Trascrizione non riuscita. Salvo il file vocale senza testo.");
    }
  }

  // Upload voice file to Supabase Storage
  const sb = getSupabase();
  const fileName = `voice_${Date.now()}.ogg`;
  const storagePath = `telegram-notes/${userId}/${fileName}`;

  const { error: uploadErr } = await sb.storage
    .from("files")
    .upload(storagePath, audioBlob, { contentType: "audio/ogg", upsert: true });

  const { data: publicUrlData } = sb.storage.from("files").getPublicUrl(storagePath);
  const publicUrl = publicUrlData?.publicUrl ?? fileUrl;

  const displayText = transcription
    ? `🎤 *Trascrizione:*\n_${transcription}_`
    : "🎤 _Messaggio vocale ricevuto_";

  const { error: insertErr } = await sb.from("telegram_notes").insert({
    user_id: userId,
    content: transcription || "[Messaggio vocale]",
    file_url: publicUrl,
    file_name: fileName,
    file_type: "voice",
    transcription,
    folder_name: "Generale",
    source: "telegram",
    created_at: new Date().toISOString(),
  });

  if (insertErr) {
    await sendMessage(chatId, "❌ Errore nel salvataggio del messaggio vocale.");
    return;
  }

  await sendMessage(chatId,
    `✅ *Nota vocale salvata!*\n\n${displayText}\n\n📁 Salvata in *Generale* — puoi spostarla dal portale ICONOFF.`
  );
}

async function handleCallbackQuery(cb: TelegramCallbackQuery): Promise<void> {
  const chatId = cb.from.id;
  const data = cb.data ?? "";

  if (!data.startsWith("project_select:")) {
    await answerCallback(cb.id, "❓ Azione non riconosciuta.");
    return;
  }

  // Format: project_select:{project_id_or_none}:{noteKey}
  const parts = data.split(":");
  const projectId = parts[1] === "none" ? null : parts[1];

  const userRecord = await getUserByChatId(chatId);
  if (!userRecord) {
    await answerCallback(cb.id, "❌ Account non trovato.");
    return;
  }
  const userId = userRecord.user_id;

  const pending = pendingNotes.get(chatId);
  if (!pending) {
    await answerCallback(cb.id, "⚠️ Nessuna nota in attesa. Riprova.");
    return;
  }

  pendingNotes.delete(chatId);

  const sb = getSupabase();
  const { error } = await sb.from("telegram_notes").insert({
    user_id: userId,
    project_id: projectId,
    content: pending.content,
    file_url: pending.file_url ?? null,
    file_name: pending.file_name ?? null,
    file_type: pending.file_type ?? null,
    transcription: pending.transcription ?? null,
    source: "telegram",
  });

  if (error) {
    await answerCallback(cb.id, "❌ Errore nel salvataggio.");
    return;
  }

  await answerCallback(cb.id, "✅ Nota salvata!");

  // Edit the original message to confirm
  if (cb.message) {
    await tg("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: cb.message.message_id,
      reply_markup: { inline_keyboard: [] },
    });
    await sendMessage(chatId, "✅ *Nota salvata con successo!*");
  }
}

// ─────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Telegram sends POST; return 200 immediately on GET (health check)
  if (req.method !== "POST") {
    return new Response("ICONOFF Telegram Webhook — OK", { status: 200 });
  }

  const rl = checkRateLimit(req);
  if (rl) return rl;

  // Verify Telegram secret token to ensure requests originate from Telegram
  const telegramSecret = Deno.env.get("TELEGRAM_SECRET_TOKEN");
  if (telegramSecret) {
    const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
    if (incomingSecret !== telegramSecret) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await req.json() as TelegramUpdate;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    // ── Callback queries (project selection) ──────────────────────
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return new Response("ok", { status: 200 });
    }

    const msg = update.message;
    if (!msg) return new Response("ok", { status: 200 });

    const chatId = msg.chat.id;
    const text = msg.text ?? "";

    // ── /start (with optional ICONOFF user_id payload) ────────────
    if (text.startsWith("/start")) {
      await handleStart(chatId, text);
      return new Response("ok", { status: 200 });
    }

    // ── All other commands require a linked account ───────────────
    const userRecord = await getUserByChatId(chatId);

    if (!userRecord) {
      await sendMessage(chatId,
        "⚠️ Account non collegato.\n\nUsa il link dal profilo ICONOFF per iniziare."
      );
      return new Response("ok", { status: 200 });
    }

    const userId = userRecord.user_id;

    // ── Text commands ─────────────────────────────────────────────
    if (text) {
      if (text === "/stop")              await handleStop(chatId, userId);
      else if (text === "/task")         await handleTask(chatId, userId);
      else if (text === "/oggi")         await handleOggi(chatId, userId);
      else if (text === "/domani")       await handleDomani(chatId, userId);
      else if (text === "/scadute")      await handleScadute(chatId, userId);
      else if (text === "/settimana")    await handleSettimana(chatId, userId);
      else if (text === "/pausa")        await handlePausa(chatId, userId);
      else if (text === "/help")         await sendMessage(chatId, HELP_TEXT);
      else if (text === "/cmd")          await sendMessage(chatId, CMD_TEXT);
      else if (text.startsWith("/completed")) await handleCompleted(chatId, userId, text);
      else if (text.startsWith("/orario"))   await handleOrario(chatId, userId, text);
      else if (text.startsWith("/nota"))     await handleNota(chatId, userId, text);
      else {
        // Unknown command
        await sendMessage(chatId, "❓ Comando non riconosciuto. Usa /help per vedere i comandi disponibili.");
      }
      return new Response("ok", { status: 200 });
    }

    // ── Document ──────────────────────────────────────────────────
    if (msg.document) {
      await handleDocument(chatId, userId, msg);
      return new Response("ok", { status: 200 });
    }

    // ── Voice message ─────────────────────────────────────────────
    if (msg.voice) {
      await handleVoice(chatId, userId, msg);
      return new Response("ok", { status: 200 });
    }

  } catch (err) {
    console.error("telegram-webhook error:", err);
    // Always return 200 to Telegram to prevent retries
    return new Response("ok", { status: 200 });
  }

  return new Response("ok", { status: 200 });
});
