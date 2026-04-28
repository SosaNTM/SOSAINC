/**
 * TypeScript types for all Supabase tables created in missing_schemas_v2.sql.
 * portal_id fields store UUIDs — use toPortalUUID() from lib/portalUUID.ts when querying.
 */

// ─── FINANCE ─────────────────────────────────────────────────────────────────

export interface DbFinanceCategory {
  id: string;
  portal_id: string;
  name: string;
  slug: string;
  type: "revenue" | "cogs" | "opex" | "other" | "expense" | "income" | "business";
  color: string | null;
  icon: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbFinanceCategory = Omit<DbFinanceCategory, "id" | "created_at" | "updated_at">;

export interface DbPersonalTransaction {
  id: string;
  portal_id: string;
  user_id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  category: string | null;
  category_id: string | null;
  description: string | null;
  date: string;
  cost_classification: "fixed" | "variable" | "semi-variable" | "one-time" | null;
  payment_method: string | null;
  reference: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export type NewDbPersonalTransaction = Omit<DbPersonalTransaction, "id" | "created_at" | "updated_at">;

export interface DbBudgetLimit {
  id: string;
  portal_id: string;
  user_id: string | null;
  category: string;
  category_id: string | null;
  monthly_limit: number;
  color: string | null;
  icon_name: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbBudgetLimit = Omit<DbBudgetLimit, "id" | "created_at" | "updated_at">;

export interface DbFinancialGoal {
  id: string;
  portal_id: string;
  user_id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  category: string | null;
  color: string | null;
  emoji: string | null;
  is_achieved: boolean;
  created_at: string;
  updated_at: string;
}

export type NewDbFinancialGoal = Omit<DbFinancialGoal, "id" | "created_at" | "updated_at">;

export interface DbInvestment {
  id: string;
  portal_id: string;
  user_id: string;
  name: string;
  ticker: string | null;
  type: "stock" | "etf" | "crypto" | "bonds" | "real_estate" | "other";
  units: number;
  avg_buy_price: number;
  current_price: number | null;
  currency: string;
  color: string | null;
  emoji: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbInvestment = Omit<DbInvestment, "id" | "created_at" | "updated_at">;

export interface DbCryptoHolding {
  id: string;
  portal_id: string;
  user_id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  avg_cost_price: number;
  current_price: number;
  color: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbCryptoHolding = Omit<DbCryptoHolding, "id" | "created_at" | "updated_at">;

export interface DbCryptoTransaction {
  id: string;
  portal_id: string;
  user_id: string;
  holding_id: string | null;
  type: "buy" | "sell" | "transfer" | "staking" | "airdrop";
  symbol: string;
  quantity: number;
  price: number;
  fee: number;
  notes: string | null;
  date: string;
  created_at: string;
}

export type NewDbCryptoTransaction = Omit<DbCryptoTransaction, "id" | "created_at">;

// ─── GIFT CARDS ───────────────────────────────────────────────────────────────

export interface DbGiftCardBrand {
  brand_key: string;
  name: string;
  logo_url: string | null;
  color: string | null;
  category: string | null;
  default_currency: string | null;
  has_expiry: boolean | null;
  is_popular: boolean | null;
}

export interface DbGiftCard {
  id: string;
  portal_id: string;
  user_id: string;
  brand: string;
  brand_key: string;
  card_code: string | null;
  pin: string | null;
  initial_value: number;
  remaining_value: number;
  currency: string;
  purchase_date: string | null;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export type NewDbGiftCard = Omit<DbGiftCard, "id" | "created_at" | "updated_at">;

export interface DbGiftCardTransaction {
  id: string;
  gift_card_id: string;
  portal_id: string;
  user_id: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

export type NewDbGiftCardTransaction = Omit<DbGiftCardTransaction, "id" | "created_at">;

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

export interface DbSubscription {
  id: string;
  portal_id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: "weekly" | "monthly" | "quarterly" | "yearly";
  next_billing_date: string | null;
  category: string | null;
  status: "active" | "paused" | "cancelled";
  logo_url: string | null;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbSubscription = Omit<DbSubscription, "id" | "created_at" | "updated_at">;

export interface DbSubscriptionTransaction {
  id: string;
  subscription_id: string;
  portal_id: string;
  amount: number;
  status: string;
  billing_date: string;
  created_at: string;
}

// ─── SOCIAL ───────────────────────────────────────────────────────────────────

export type SocialPlatformDB = "instagram" | "linkedin" | "twitter" | "facebook" | "tiktok" | "youtube";

export interface DbSocialConnection {
  id: string;
  portal_id: string;
  user_id: string;
  platform: string;
  account_handle: string | null;
  account_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SocialConnection = DbSocialConnection;

export interface SocialAnalyticsSnapshot {
  id: string;
  connection_id: string;
  user_id: string;
  portal_id: string;
  platform: SocialPlatformDB;
  snapshot_date: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number;
  impressions: number | null;
  reach: number | null;
  likes_total: number | null;
  comments_total: number | null;
  shares_total: number | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface DbSocialPost {
  id: string;
  portal_id: string;
  user_id: string;
  connection_id: string | null;
  platform: string;
  content_text: string | null;
  media_urls: Array<{ url: string; type: string; alt?: string }>;
  media_type: "image" | "video" | "carousel" | "reel" | "story" | "text" | null;
  status: "draft" | "scheduled" | "published" | "failed" | "deleted";
  scheduled_at: string | null;
  published_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  tags: string[];
  hashtags: string[] | null;
  external_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbSocialPost = Omit<DbSocialPost, "id" | "created_at" | "updated_at" | "likes" | "comments" | "shares" | "impressions" | "reach">;

// ─── TASKS & PROJECTS ─────────────────────────────────────────────────────────

export interface DbProject {
  id: string;
  portal_id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbProject = Omit<DbProject, "id" | "created_at" | "updated_at">;

export interface DbTask {
  id: string;
  portal_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  creator_id: string | null;
  project_id: string | null;
  parent_id: string | null;
  labels: string[] | null;
  due_date: string | null;
  estimate: number | null;
  created_at: string;
  updated_at: string;
}

export type NewDbTask = Omit<DbTask, "id" | "created_at" | "updated_at">;

export interface DbTaskComment {
  id: string;
  task_id: string;
  portal_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type NewDbTaskComment = Omit<DbTaskComment, "id" | "created_at" | "updated_at">;

export interface DbProjectMilestone {
  id: string;
  project_id: string;
  portal_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── CLOUD & VAULT ────────────────────────────────────────────────────────────

export interface DbCloudFolder {
  id: string;
  portal_id: string;
  name: string;
  parent_id: string | null;
  created_by: string;
  permissions: Array<{ userId: string; level: "view" | "edit" | "admin" }>;
  is_locked: boolean;
  password_hash: string | null;
  password_set_at: string | null;
  lock_auto_timeout_minutes: number;
  color: string | null;
  icon: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbCloudFolder = Omit<DbCloudFolder, "id" | "created_at" | "updated_at">;

export interface DbCloudFile {
  id: string;
  portal_id: string;
  folder_id: string | null;
  name: string;
  storage_path: string | null;
  size_bytes: number;
  mime_type: string | null;
  file_type: string | null;
  description: string | null;
  thumbnail_url: string | null;
  owner_id: string;
  uploaded_by: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  permanent_delete_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewDbCloudFile = Omit<DbCloudFile, "id" | "created_at" | "updated_at">;

export interface DbVaultItem {
  id: string;
  portal_id: string;
  user_id: string;
  type: "credential" | "api_key" | "document" | "note" | "card";
  name: string;
  category: string | null;
  encrypted_data: string;
  is_locked: boolean;
  is_favorite: boolean;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  expires_at: string | null;
}

export type NewDbVaultItem = Omit<DbVaultItem, "id" | "created_at" | "updated_at">;

// ─── NOTES ────────────────────────────────────────────────────────────────────

export interface DbNoteFolder {
  id: string;
  portal_id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type NewDbNoteFolder = Omit<DbNoteFolder, "id" | "created_at" | "updated_at">;

export interface DbNote {
  id: string;
  portal_id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  color: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type NewDbNote = Omit<DbNote, "id" | "created_at" | "updated_at">;

// ─── USER ─────────────────────────────────────────────────────────────────────

export interface DbUserProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  phone: string | null;
  timezone: string;
  language: string;
  avatar_url: string | null;
  banner_url: string | null;
  social_links: Record<string, string>;
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export type UpdateDbUserProfile = Partial<Omit<DbUserProfile, "id" | "created_at" | "updated_at">>;

export interface DbUserPreferences {
  id: string;
  user_id: string;
  portal_id: string;
  theme: "dark" | "light" | "system";
  accent_color: string | null;
  number_format: "comma" | "period";
  density: "comfortable" | "compact";
  language: string;
  dashboard_period: string;
  created_at: string;
  updated_at: string;
}

// ─── AUDIT ────────────────────────────────────────────────────────────────────

export interface DbAuditLogEntry {
  id: string;
  portal_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  category: string | null;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  severity: "info" | "warning" | "error" | "critical";
  ip_address: string | null;
  created_at: string;
}

export type NewDbAuditLogEntry = Omit<DbAuditLogEntry, "id" | "created_at">;
