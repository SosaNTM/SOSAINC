export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  ownerId: string;
  folderId: string | null;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Telegram-sourced fields (optional)
  source?: "telegram";
  file_url?: string | null;
  file_name?: string | null;
  file_type?: "document" | "voice" | null;
  transcription?: string | null;
}

export interface TelegramNote {
  id: string;
  user_id: string;
  project_id: string | null;
  folder_name: string;        // e.g. "Generale" — set by the bot
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: "document" | "voice" | null;
  transcription: string | null;
  source: "telegram";
  created_at: string;
}

/** Deterministic folder ID: matches the folder created in INITIAL_FOLDERS below. */
export function telegramFolderId(userId: string, folderName: string): string {
  return `fld_tg_${userId}_${folderName}`;
}

export function telegramNoteToNote(tn: TelegramNote): Note {
  const rawTitle =
    tn.file_name ??
    (tn.transcription ? tn.transcription.slice(0, 50) + (tn.transcription.length > 50 ? "…" : "") : null) ??
    (tn.content.slice(0, 50) + (tn.content.length > 50 ? "…" : ""));
  const displayTitle = rawTitle || "Nota Telegram";
  // Map folder_name → deterministic folderId so notes land in the right folder
  const folderId = tn.folder_name
    ? telegramFolderId(tn.user_id, tn.folder_name)
    : null;
  return {
    id: tn.id,
    ownerId: tn.user_id,
    folderId,
    title: displayTitle,
    content: tn.transcription ?? tn.content,
    tags: [],
    isPinned: false,
    isArchived: false,
    createdAt: new Date(tn.created_at),
    updatedAt: new Date(tn.created_at),
    source: "telegram",
    file_url: tn.file_url,
    file_name: tn.file_name,
    file_type: tn.file_type,
    transcription: tn.transcription,
  };
}

export const TAG_PRESETS: Record<string, { color: string; label: string }> = {
  meeting: { color: "#60a5fa", label: "meeting" },
  personal: { color: "#a78bfa", label: "personal" },
  project: { color: "#34d399", label: "project" },
  idea: { color: "#fbbf24", label: "idea" },
  finance: { color: "#6ee7b7", label: "finance" },
  urgent: { color: "#ef4444", label: "urgent" },
  marketing: { color: "#fb923c", label: "marketing" },
  ops: { color: "#38bdf8", label: "ops" },
  hr: { color: "#f472b6", label: "hr" },
  research: { color: "#818cf8", label: "research" },
  design: { color: "#c084fc", label: "design" },
  branding: { color: "#e879f9", label: "branding" },
  planning: { color: "#34d399", label: "planning" },
};

function d(daysAgo: number, hours = 10): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(hours, 0, 0, 0);
  return dt;
}

// ─── FOLDERS ───

export const INITIAL_FOLDERS: NoteFolder[] = [];

// ─── NOTES ───

export const INITIAL_NOTES: Note[] = [];

// ─── TELEGRAM NOTES (mock) ───

export const INITIAL_TELEGRAM_NOTES: TelegramNote[] = [];
