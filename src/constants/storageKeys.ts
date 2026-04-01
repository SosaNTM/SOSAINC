// ── Centralized localStorage / sessionStorage key constants ──────────────────
// Every raw string used with localStorage or sessionStorage is defined here.
// Import from "@/constants/storageKeys" and use the constant instead of inline strings.

// ── Auth ─────────────────────────────────────────────────────────────────────
export const STORAGE_AUTH_USER = "iconoff_auth_user";
export const STORAGE_LAST_LOGIN_PREFIX = "iconoff_last_login_";

// ── Profile ──────────────────────────────────────────────────────────────────
export const STORAGE_PROFILE_PREFIX = "iconoff_profile_";
export const STORAGE_AVATAR_PREFIX = "iconoff_avatar_";
export const STORAGE_BANNER_PREFIX = "iconoff_banner_";
export const STORAGE_DENSITY = "iconoff_density";

// ── Theme & Appearance ───────────────────────────────────────────────────────
export const STORAGE_THEME = "theme";
export const STORAGE_ACCENT = "iconoff-accent";

// ── App Reset ────────────────────────────────────────────────────────────────
export const STORAGE_APP_RESET_VERSION = "app_reset_version";

// ── Audit ────────────────────────────────────────────────────────────────────
export const STORAGE_AUDIT_LOG = "iconoff_audit_log";

// ── Tasks & Projects ─────────────────────────────────────────────────────────
export const STORAGE_TASKS = "iconoff_tasks";
export const STORAGE_PROJECTS = "iconoff_projects";

// ── Notes ────────────────────────────────────────────────────────────────────
export const STORAGE_NOTES = "iconoff_notes";
export const STORAGE_NOTE_FOLDERS = "iconoff_note_folders";

// ── Vault ────────────────────────────────────────────────────────────────────
export const STORAGE_VAULT_ITEMS = "iconoff_vault_items";
export const SESSION_VAULT_UNLOCKED = "vault_locked_unlocked";

// ── Cloud ────────────────────────────────────────────────────────────────────
export const STORAGE_CLOUD_FOLDERS = "iconoff_cloud_folders";
export const STORAGE_CLOUD_FILES = "iconoff_cloud_files";
export const STORAGE_CLOUD_SECTIONS = "iconoff_cloud_sections";
export const STORAGE_CLOUD_COLLAPSED_SECTIONS = "cloud_collapsed_sections";
export const SESSION_CLOUD_UNLOCK_PREFIX = "cloud_unlock_";
export const STORAGE_CLOUD_UNLOCK_TIMED_PREFIX = "cloud_unlock_timed_";

// ── Dashboard ────────────────────────────────────────────────────────────────
export const STORAGE_DASHBOARD_PERIOD = "dashboardPeriod";
export const STORAGE_DASHBOARD_CUSTOM_RANGE = "dashboardCustomRange";
export const STORAGE_NUMBER_FORMAT = "numberFormat";

// ── Portal ───────────────────────────────────────────────────────────────────
export const STORAGE_PORTAL_LAST_ACCESSED_PREFIX = "portal_last_accessed_";

// ── Finance: Personal Transactions ───────────────────────────────────────────
export const STORAGE_PERSONAL_TX_PREFIX = "personal_transactions_local";
export const STORAGE_PERSONAL_TX_LEGACY = "personal_transactions_local";

// ── Finance: Categories ──────────────────────────────────────────────────────
export const STORAGE_FINANCE_CATEGORIES_PREFIX = "finance_categories";
export const STORAGE_FINANCE_CATEGORIES_LEGACY = "finance_categories";
export const STORAGE_FINANCE_TX_CATEGORIES_PREFIX = "finance_tx_categories";

// ── Finance: Investments ─────────────────────────────────────────────────────
export const STORAGE_INVESTMENTS_PREFIX = "finance_investments";
export const STORAGE_INVESTMENTS_LEGACY = "finance_investments";

// ── Finance: Goals ───────────────────────────────────────────────────────────
export const STORAGE_GOALS_PREFIX = "finance_goals";
export const STORAGE_GOALS_LEGACY = "finance_goals";

// ── Finance: Subscriptions ───────────────────────────────────────────────────
export const STORAGE_SUBSCRIPTIONS_PREFIX = "finance_subscriptions";
export const STORAGE_SUBSCRIPTIONS_LEGACY = "finance_subscriptions";

// ── Finance: Budgets ─────────────────────────────────────────────────────────
export const STORAGE_BUDGET_LIMITS_PREFIX = "finance_budget_limits";
export const STORAGE_BUDGET_TOTAL_PREFIX = "finance_total_budget";
export const STORAGE_BUDGET_LIMITS_LEGACY = "finance_budget_limits";
export const STORAGE_BUDGET_TOTAL_LEGACY = "finance_total_budget";
export const STORAGE_BUDGET_OLD_ARRAY_LEGACY = "finance_budgets";

// ── Finance: Crypto ──────────────────────────────────────────────────────────
export const STORAGE_CRYPTO_HOLDINGS_PREFIX = "crypto_holdings";
export const STORAGE_CRYPTO_HOLDINGS_LEGACY = "crypto_holdings";
export const STORAGE_CRYPTO_TX_HISTORY_PREFIX = "crypto_tx_history";
export const STORAGE_CRYPTO_TX_HISTORY_LEGACY = "crypto_tx_history";
export const STORAGE_CRYPTO_TX_MIGRATED_PREFIX = "crypto_tx_migrated_";

// ── Finance: Gift Cards ──────────────────────────────────────────────────────
export const STORAGE_GIFT_CARDS_PREFIX = "gift_cards";
export const STORAGE_GIFT_CARDS_LEGACY = "gift_cards";
export const STORAGE_GIFT_CARD_TX_PREFIX = "gift_card_transactions";
export const STORAGE_GIFT_CARD_TX_LEGACY = "gift_card_transactions";

// ── Finance: Exchange Rates ──────────────────────────────────────────────────
export const STORAGE_EXCHANGE_RATES = "iconoff_exchange_rates";

// ── Inventory ────────────────────────────────────────────────────────────────
export const STORAGE_INVENTORY_PREFIX = "iconoff_inventory_";
