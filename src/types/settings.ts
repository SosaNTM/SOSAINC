// ── Portal ─────────────────────────────────────────────────────────────
export interface Portal {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface PortalMember {
  id: string;
  portal_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

// ── Finance ────────────────────────────────────────────────────────────
export interface IncomeCategory {
  id: string;
  portal_id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  portal_id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  monthly_budget: number | null;
  alert_threshold: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionCategory {
  id: string;
  portal_id: string;
  name: string;
  icon: string;
  color: string;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  reminder_days: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  portal_id: string;
  name: string;
  type: 'card' | 'bank' | 'cash' | 'digital' | 'crypto';
  last_four: string | null;
  is_default: boolean;
  is_active: boolean;
  last_used_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RecurrenceRule {
  id: string;
  portal_id: string;
  name: string;
  direction: 'entrata' | 'uscita';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  next_run_at: string | null;
  amount: number | null;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrencySettings {
  id: string;
  portal_id: string;
  primary_currency: string;
  symbol_position: 'before' | 'after';
  decimal_separator: ',' | '.';
  thousands_sep: '.' | ',' | ' ' | '';
  secondary_currencies: string[];
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  id: string;
  portal_id: string;
  name: string;
  rate: number;
  is_default: boolean;
  applies_to: 'income' | 'expense' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Projects ───────────────────────────────────────────────────────────
export interface ProjectStatus {
  id: string;
  portal_id: string;
  name: string;
  color: string;
  icon: string;
  is_final: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskPriority {
  id: string;
  portal_id: string;
  name: string;
  color: string;
  icon: string;
  level: number;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskLabel {
  id: string;
  portal_id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplate {
  id: string;
  portal_id: string;
  name: string;
  description: string | null;
  checklist: { id: string; text: string; done: boolean }[];
  priority_id: string | null;
  estimated_h: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ── Social ─────────────────────────────────────────────────────────────
export interface SocialPublishingRules {
  id: string;
  portal_id: string;
  schedule: Record<string, { enabled: boolean; times: string[] }>;
  auto_hashtags: boolean;
  require_approval: boolean;
  watermark_enabled: boolean;
  watermark_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface HashtagSet {
  id: string;
  portal_id: string;
  name: string;
  hashtags: string[];
  platforms: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentCategory {
  id: string;
  portal_id: string;
  name: string;
  color: string;
  platforms: string[];
  frequency: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CaptionTemplate {
  id: string;
  portal_id: string;
  name: string;
  platform: string | null;
  body: string;
  variables: string[];
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Team ───────────────────────────────────────────────────────────────
export interface Role {
  id: string;
  portal_id: string;
  name: string;
  description: string | null;
  color: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  portal_id: string;
  role_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

export interface Department {
  id: string;
  portal_id: string;
  name: string;
  color: string;
  description: string | null;
  head_user_id: string | null;
  member_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ── Notifications ──────────────────────────────────────────────────────
export interface NotificationChannel {
  id: string;
  portal_id: string;
  channel_type: 'in_app' | 'email' | 'telegram' | 'browser_push';
  is_enabled: boolean;
  quiet_hours_from: string | null;
  quiet_hours_to: string | null;
  quiet_days: string[];
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AlertRule {
  id: string;
  portal_id: string;
  name: string;
  trigger_type: string;
  priority: 'info' | 'warning' | 'critical';
  channels: string[];
  conditions: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── General ────────────────────────────────────────────────────────────
export interface PortalProfile {
  id: string;
  portal_id: string;
  legal_name: string | null;
  vat_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  language: string;
  timezone: string;
  date_format: string;
  created_at: string;
  updated_at: string;
}

export interface AppearanceSettings {
  id: string;
  portal_id: string;
  theme: 'dark' | 'light' | 'auto';
  accent_color: string;
  font_family: string;
  sidebar_density: 'compact' | 'comfortable' | 'spacious';
  sidebar_style: 'icons_only' | 'icons_labels' | 'full_width';
  created_at: string;
  updated_at: string;
}
