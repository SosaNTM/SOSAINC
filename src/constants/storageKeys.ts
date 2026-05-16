// ── Centralized localStorage / sessionStorage key constants ──────────────────
//
// Only UI preferences and ephemeral session flags live in localStorage. All
// portal-scoped business data (finance, vault items, audit log, inventory,
// crypto holdings, gift cards, leadgen caches, etc.) is stored in Supabase.
//
// Notes/Tasks/Cloud pages still keep some legacy localStorage state — those
// pages will be migrated to Supabase in a follow-up.

// ── Auth ─────────────────────────────────────────────────────────────────────
export const STORAGE_AUTH_USER = "SOSA INC_auth_user";
export const STORAGE_LAST_LOGIN_PREFIX = "SOSA INC_last_login_";

// ── Profile ──────────────────────────────────────────────────────────────────
export const STORAGE_PROFILE_PREFIX = "SOSA INC_profile_";
export const STORAGE_AVATAR_PREFIX = "SOSA INC_avatar_";
export const STORAGE_BANNER_PREFIX = "SOSA INC_banner_";
export const STORAGE_DENSITY = "SOSA INC_density";

// ── Theme & Appearance ───────────────────────────────────────────────────────
export const STORAGE_THEME = "theme";
export const STORAGE_ACCENT = "SOSA INC-accent";

// ── App Reset ────────────────────────────────────────────────────────────────
export const STORAGE_APP_RESET_VERSION = "app_reset_version";

// ── Tasks & Projects (legacy — TasksPage now Supabase-only via taskSync) ─────
// Kept temporarily because notesStore + linearStore still reference these
// helpers; they are no longer written to by current code paths.
export const tasksKey = (portalId: string) => `SOSA INC_tasks_${portalId}`;
export const projectsKey = (portalId: string) => `SOSA INC_projects_${portalId}`;

// ── Notes (NotesPage — pending Supabase migration) ───────────────────────────
export const notesKey = (portalId: string, userId: string) => `SOSA INC_notes_${portalId}_${userId}`;
export const noteFoldersKey = (portalId: string, userId: string) => `SOSA INC_note_folders_${portalId}_${userId}`;

// ── Vault ────────────────────────────────────────────────────────────────────
export const SESSION_VAULT_UNLOCKED = "vault_locked_unlocked";

// ── Cloud (CloudPage — pending Supabase migration) ───────────────────────────
export const STORAGE_CLOUD_FOLDERS = "SOSA INC_cloud_folders";
export const STORAGE_CLOUD_FILES = "SOSA INC_cloud_files";
export const STORAGE_CLOUD_SECTIONS = "SOSA INC_cloud_sections";
export const STORAGE_CLOUD_COLLAPSED_SECTIONS = "cloud_collapsed_sections";
export const SESSION_CLOUD_UNLOCK_PREFIX = "cloud_unlock_";
export const STORAGE_CLOUD_UNLOCK_TIMED_PREFIX = "cloud_unlock_timed_";

// ── Dashboard / UI prefs ─────────────────────────────────────────────────────
export const STORAGE_DASHBOARD_PERIOD = "dashboardPeriod";
export const STORAGE_DASHBOARD_CUSTOM_RANGE = "dashboardCustomRange";
export const STORAGE_NUMBER_FORMAT = "numberFormat";
export const STORAGE_CURRENCY = "primaryCurrency";

// ── Portal ───────────────────────────────────────────────────────────────────
export const STORAGE_PORTAL_LAST_ACCESSED_PREFIX = "portal_last_accessed_";
