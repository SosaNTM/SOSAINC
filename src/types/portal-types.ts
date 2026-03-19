// Portal-specific typed interfaces
// After running `supabase gen types typescript`, replace this with auto-generated types.
// For now, these are manually defined to match the migration schemas.

export type PortalPrefix = 'sosa' | 'keylo' | 'redx' | 'trustme';

// ── Shared field types ──────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';
export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial' | 'expired';
export type PaymentMethodType = 'cash' | 'card' | 'bank_transfer' | 'crypto' | 'paypal' | 'other';
export type GoalType = 'savings' | 'debt_payoff' | 'investment' | 'purchase' | 'emergency_fund' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
export type ContactType = 'client' | 'vendor' | 'partner' | 'lead' | 'personal' | 'other';
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type NoteType = 'note' | 'checklist' | 'voice' | 'image' | 'link';
export type EventType = 'event' | 'meeting' | 'deadline' | 'reminder' | 'task_due';

// ── Portal Transaction ─────────────────────────────────────────

export interface PortalTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category_id: string | null;
  category_name: string;
  subcategory: string | null;
  description: string | null;
  date: string;
  payment_method: PaymentMethodType | null;
  payment_method_id: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  recurring_end_date: string | null;
  parent_recurring_id: string | null;
  tags: string[] | null;
  receipt_url: string | null;
  notes: string | null;
  subscription_id: string | null;
  invoice_id: string | null;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Portal Budget ───────────────────────────────────────────────

export interface PortalBudget {
  id: string;
  user_id: string;
  category_id: string | null;
  category_name: string;
  monthly_limit: number;
  month: number;
  year: number;
  warning_threshold: number;
  critical_threshold: number;
  notify_on_warning: boolean;
  notify_on_critical: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Portal Subscription ────────────────────────────────────────

export interface PortalSubscription {
  id: string;
  user_id: string;
  name: string;
  provider: string | null;
  logo_url: string | null;
  url: string | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  category_id: string | null;
  category_name: string;
  start_date: string;
  next_billing_date: string | null;
  end_date: string | null;
  trial_end_date: string | null;
  status: SubscriptionStatus;
  auto_renew: boolean;
  payment_method: PaymentMethodType | null;
  payment_method_id: string | null;
  notify_before_renewal: boolean;
  notify_days_before: number;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Portal Financial Goal ──────────────────────────────────────

export interface PortalFinancialGoal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  start_date: string;
  goal_type: GoalType;
  auto_contribute: boolean;
  contribution_amount: number | null;
  contribution_interval: string | null;
  status: GoalStatus;
  priority: number;
  linked_category: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Portal Contact ─────────────────────────────────────────────

export interface PortalContact {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  contact_type: ContactType;
  status: string;
  vat_number: string | null;
  fiscal_code: string | null;
  sdi_code: string | null;
  pec: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Portal Task ────────────────────────────────────────────────

export interface PortalTask {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee_name: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  labels: string[] | null;
  tags: string[] | null;
  sort_order: number;
  parent_task_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Portal Note ────────────────────────────────────────────────

export interface PortalNote {
  id: string;
  user_id: string;
  notebook_id: string | null;
  title: string;
  content: string | null;
  content_plain: string | null;
  excerpt: string | null;
  note_type: NoteType;
  is_pinned: boolean;
  is_archived: boolean;
  is_favorite: boolean;
  color: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
