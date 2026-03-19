// ═══ Supabase Database Types ═══

export type SocialPlatformDB = "instagram" | "linkedin" | "twitter" | "facebook" | "tiktok" | "youtube";

export interface SocialConnection {
  id: string;
  user_id: string;
  platform: SocialPlatformDB;
  account_handle: string;
  account_name: string;
  account_avatar_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  connected_at: string;
  last_synced_at: string | null;
}

export interface SocialAnalyticsSnapshot {
  id: string;
  connection_id: string;
  user_id: string;
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

export interface SubscriptionRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  category: string | null;
  billing_cycle: "monthly" | "quarterly" | "quadrimestral" | "biannual" | "annual";
  billing_day: number;
  start_date: string;
  next_billing_date: string;
  is_active: boolean;
  color: string | null;
  icon: string | null;
  account_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionTransactionRow {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  executed_at: string;
  billing_date: string;
  status: "completed" | "failed" | "pending";
  transaction_id: string | null;
  created_at: string;
}

export interface PersonalTransactionRow {
  id: string;
  user_id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  date: string;
  payment_method: "cash" | "card" | "bank_transfer" | "crypto" | "other" | null;
  is_recurring: boolean;
  recurring_interval: "weekly" | "monthly" | "yearly" | null;
  tags: string[] | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: SubscriptionRow;
        Insert: Omit<SubscriptionRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<SubscriptionRow, "id" | "user_id">>;
      };
      subscription_transactions: {
        Row: SubscriptionTransactionRow;
        Insert: Omit<SubscriptionTransactionRow, "id" | "executed_at" | "created_at"> & { id?: string; executed_at?: string; created_at?: string };
        Update: Partial<Omit<SubscriptionTransactionRow, "id" | "user_id" | "subscription_id">>;
      };
      social_connections: {
        Row: SocialConnection;
        Insert: Omit<SocialConnection, "id" | "connected_at"> & { id?: string; connected_at?: string };
        Update: Partial<Omit<SocialConnection, "id" | "user_id">>;
      };
      social_analytics_snapshots: {
        Row: SocialAnalyticsSnapshot;
        Insert: Omit<SocialAnalyticsSnapshot, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<SocialAnalyticsSnapshot, "id" | "user_id" | "connection_id">>;
      };
      personal_transactions: {
        Row: PersonalTransactionRow;
        Insert: Omit<PersonalTransactionRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<PersonalTransactionRow, "id" | "user_id">>;
      };
    };
  };
}
