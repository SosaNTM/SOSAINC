-- ============================================================
-- ICONOFF — Sosa Inc Database Schema
-- Portal: sosa_ | 27 tables + 1 view
-- Dependency order: categories → payment_methods → contacts →
--   deals → subscriptions → invoices → transactions → budgets →
--   budget_summary → goals → invoice_items → snapshots →
--   notebooks → notes → note_tags → note_attachments →
--   workspaces → projects → tasks → task_comments →
--   task_attachments → task_time_entries → events → reminders →
--   portal_settings
-- ============================================================

-- ── MODULE 1: FINANCE ──────────────────────────────────────────

-- 1. Transaction Categories
CREATE TABLE IF NOT EXISTS sosa_transaction_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  parent_id UUID REFERENCES sosa_transaction_categories(id),
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_sosa_cat_user_slug ON sosa_transaction_categories(user_id, slug);
CREATE INDEX idx_sosa_cat_user_type ON sosa_transaction_categories(user_id, type);

ALTER TABLE sosa_transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_transaction_categories_user_policy" ON sosa_transaction_categories FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Payment Methods
CREATE TABLE IF NOT EXISTS sosa_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'debit_card', 'credit_card', 'bank_account', 'crypto_wallet', 'paypal', 'other')),
  last_four TEXT,
  institution TEXT,
  color TEXT,
  icon TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sosa_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_payment_methods_user_policy" ON sosa_payment_methods FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── MODULE 4: CONTACTS / CRM (created early for FK references) ──

-- 3. Contacts
CREATE TABLE IF NOT EXISTS sosa_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IT',
  vat_number TEXT,
  fiscal_code TEXT,
  sdi_code TEXT,
  pec TEXT,
  contact_type TEXT DEFAULT 'client' CHECK (contact_type IN ('client', 'vendor', 'partner', 'lead', 'personal', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  avatar_url TEXT,
  notes TEXT,
  tags TEXT[],
  source TEXT,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_invoiced NUMERIC(12,2) DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_contacts_user ON sosa_contacts(user_id);
CREATE INDEX idx_sosa_contacts_type ON sosa_contacts(user_id, contact_type);
CREATE INDEX idx_sosa_contacts_search ON sosa_contacts USING gin(to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(email, '')));

ALTER TABLE sosa_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_contacts_user_policy" ON sosa_contacts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Deals
CREATE TABLE IF NOT EXISTS sosa_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES sosa_contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  value NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  probability INT DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  actual_close_date DATE,
  source TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_deals_user ON sosa_deals(user_id);
CREATE INDEX idx_sosa_deals_stage ON sosa_deals(user_id, stage);
CREATE INDEX idx_sosa_deals_contact ON sosa_deals(contact_id);

ALTER TABLE sosa_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_deals_user_policy" ON sosa_deals FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── BACK TO FINANCE (needs contacts for invoices FK) ────────────

-- 5. Subscriptions
CREATE TABLE IF NOT EXISTS sosa_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  provider TEXT,
  logo_url TEXT,
  url TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  category_id UUID REFERENCES sosa_transaction_categories(id),
  category_name TEXT NOT NULL DEFAULT 'Abbonamenti',
  start_date DATE NOT NULL,
  next_billing_date DATE,
  end_date DATE,
  trial_end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'trial', 'expired')),
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'crypto', 'paypal', 'other')),
  payment_method_id UUID REFERENCES sosa_payment_methods(id),
  notify_before_renewal BOOLEAN DEFAULT true,
  notify_days_before INT DEFAULT 3,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_sub_user ON sosa_subscriptions(user_id);
CREATE INDEX idx_sosa_sub_user_status ON sosa_subscriptions(user_id, status);
CREATE INDEX idx_sosa_sub_next_billing ON sosa_subscriptions(user_id, next_billing_date);

ALTER TABLE sosa_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_subscriptions_user_policy" ON sosa_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Invoices
CREATE TABLE IF NOT EXISTS sosa_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sent', 'received')),
  contact_id UUID REFERENCES sosa_contacts(id),
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_address TEXT,
  contact_vat TEXT,
  subtotal NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 22.00,
  tax_amount NUMERIC(12,2),
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  terms TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_inv_user ON sosa_invoices(user_id);
CREATE INDEX idx_sosa_inv_user_status ON sosa_invoices(user_id, status);
CREATE INDEX idx_sosa_inv_user_date ON sosa_invoices(user_id, issue_date DESC);
CREATE UNIQUE INDEX idx_sosa_inv_number ON sosa_invoices(user_id, invoice_number);

ALTER TABLE sosa_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_invoices_user_policy" ON sosa_invoices FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Transactions (core table — references categories, payment_methods, subscriptions, invoices)
CREATE TABLE IF NOT EXISTS sosa_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  category_id UUID REFERENCES sosa_transaction_categories(id),
  category_name TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'crypto', 'paypal', 'other')),
  payment_method_id UUID REFERENCES sosa_payment_methods(id),
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  recurring_end_date DATE,
  parent_recurring_id UUID REFERENCES sosa_transactions(id),
  tags TEXT[],
  receipt_url TEXT,
  notes TEXT,
  subscription_id UUID REFERENCES sosa_subscriptions(id),
  invoice_id UUID REFERENCES sosa_invoices(id),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_tx_user_date ON sosa_transactions(user_id, date DESC);
CREATE INDEX idx_sosa_tx_user_category ON sosa_transactions(user_id, category_name);
CREATE INDEX idx_sosa_tx_user_type ON sosa_transactions(user_id, type);
CREATE INDEX idx_sosa_tx_user_status ON sosa_transactions(user_id, status);
CREATE INDEX idx_sosa_tx_subscription ON sosa_transactions(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX idx_sosa_tx_invoice ON sosa_transactions(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_sosa_tx_recurring_parent ON sosa_transactions(parent_recurring_id) WHERE parent_recurring_id IS NOT NULL;

ALTER TABLE sosa_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_transactions_user_policy" ON sosa_transactions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER sosa_transactions_updated
  BEFORE UPDATE ON sosa_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. Budgets
CREATE TABLE IF NOT EXISTS sosa_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES sosa_transaction_categories(id),
  category_name TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL CHECK (monthly_limit > 0),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2020),
  warning_threshold NUMERIC(3,2) DEFAULT 0.75,
  critical_threshold NUMERIC(3,2) DEFAULT 1.00,
  notify_on_warning BOOLEAN DEFAULT true,
  notify_on_critical BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_sosa_budget_unique ON sosa_budgets(user_id, category_name, month, year);
CREATE INDEX idx_sosa_budget_period ON sosa_budgets(user_id, year, month);

ALTER TABLE sosa_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_budgets_user_policy" ON sosa_budgets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Budget Summary View (computed, never stored)
CREATE OR REPLACE VIEW sosa_budget_summary AS
SELECT
  b.id AS budget_id,
  b.user_id,
  b.category_name,
  b.monthly_limit,
  b.month,
  b.year,
  COALESCE(SUM(t.amount), 0) AS spent,
  b.monthly_limit - COALESCE(SUM(t.amount), 0) AS remaining,
  CASE
    WHEN b.monthly_limit > 0
    THEN ROUND((COALESCE(SUM(t.amount), 0) / b.monthly_limit) * 100, 1)
    ELSE 0
  END AS percentage,
  b.warning_threshold,
  b.critical_threshold
FROM sosa_budgets b
LEFT JOIN sosa_transactions t
  ON t.user_id = b.user_id
  AND t.category_name = b.category_name
  AND t.type = 'expense'
  AND t.status = 'completed'
  AND t.deleted_at IS NULL
  AND EXTRACT(MONTH FROM t.date) = b.month
  AND EXTRACT(YEAR FROM t.date) = b.year
GROUP BY b.id, b.user_id, b.category_name, b.monthly_limit, b.month, b.year,
         b.warning_threshold, b.critical_threshold;

-- 10. Financial Goals
CREATE TABLE IF NOT EXISTS sosa_financial_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#c9a96e',
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) DEFAULT 0 CHECK (current_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  target_date DATE,
  start_date DATE DEFAULT CURRENT_DATE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('savings', 'debt_payoff', 'investment', 'purchase', 'emergency_fund', 'custom')),
  auto_contribute BOOLEAN DEFAULT false,
  contribution_amount NUMERIC(12,2),
  contribution_interval TEXT CHECK (contribution_interval IN ('weekly', 'biweekly', 'monthly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  priority INT DEFAULT 0,
  linked_category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_goals_user ON sosa_financial_goals(user_id);
CREATE INDEX idx_sosa_goals_user_status ON sosa_financial_goals(user_id, status);

ALTER TABLE sosa_financial_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_financial_goals_user_policy" ON sosa_financial_goals FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. Invoice Items
CREATE TABLE IF NOT EXISTS sosa_invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES sosa_invoices(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 22.00,
  total NUMERIC(12,2) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sosa_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_invoice_items_user_policy" ON sosa_invoice_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 12. Finance Snapshots
CREATE TABLE IF NOT EXISTS sosa_finance_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly')),
  total_income NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,
  net_balance NUMERIC(12,2) DEFAULT 0,
  transaction_count INT DEFAULT 0,
  top_expense_category TEXT,
  top_expense_amount NUMERIC(12,2),
  category_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_sosa_snap_unique ON sosa_finance_snapshots(user_id, snapshot_date, period_type);

ALTER TABLE sosa_finance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_finance_snapshots_user_policy" ON sosa_finance_snapshots FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subscription → Transaction function
CREATE OR REPLACE FUNCTION sosa_generate_subscription_transaction(sub_id UUID)
RETURNS UUID AS $$
DECLARE
  sub RECORD;
  new_tx_id UUID;
BEGIN
  SELECT * INTO sub FROM sosa_subscriptions WHERE id = sub_id AND status = 'active';
  IF sub IS NULL THEN RETURN NULL; END IF;

  INSERT INTO sosa_transactions (user_id, type, amount, currency, category_name, category_id, description, date, payment_method, subscription_id, status)
  VALUES (sub.user_id, 'expense', sub.amount, sub.currency, sub.category_name, sub.category_id, 'Abbonamento: ' || sub.name, sub.next_billing_date, sub.payment_method, sub.id, 'completed')
  RETURNING id INTO new_tx_id;

  UPDATE sosa_subscriptions SET
    next_billing_date = CASE billing_cycle
      WHEN 'weekly' THEN next_billing_date + INTERVAL '1 week'
      WHEN 'monthly' THEN next_billing_date + INTERVAL '1 month'
      WHEN 'quarterly' THEN next_billing_date + INTERVAL '3 months'
      WHEN 'yearly' THEN next_billing_date + INTERVAL '1 year'
    END,
    updated_at = now()
  WHERE id = sub_id;

  RETURN new_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── MODULE 2: NOTES ────────────────────────────────────────────

-- 13. Notebooks
CREATE TABLE IF NOT EXISTS sosa_notebooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📓',
  color TEXT DEFAULT '#c9a96e',
  cover_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_notebooks_user ON sosa_notebooks(user_id);

ALTER TABLE sosa_notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_notebooks_user_policy" ON sosa_notebooks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 14. Notes
CREATE TABLE IF NOT EXISTS sosa_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notebook_id UUID REFERENCES sosa_notebooks(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Senza titolo',
  content TEXT,
  content_plain TEXT,
  excerpt TEXT,
  note_type TEXT DEFAULT 'note' CHECK (note_type IN ('note', 'checklist', 'voice', 'image', 'link')),
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  color TEXT,
  audio_url TEXT,
  audio_duration_seconds INT,
  transcription TEXT,
  source_url TEXT,
  word_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_notes_user ON sosa_notes(user_id);
CREATE INDEX idx_sosa_notes_notebook ON sosa_notes(user_id, notebook_id);
CREATE INDEX idx_sosa_notes_search ON sosa_notes USING gin(to_tsvector('italian', coalesce(title, '') || ' ' || coalesce(content_plain, '')));

ALTER TABLE sosa_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_notes_user_policy" ON sosa_notes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 15. Note Tags
CREATE TABLE IF NOT EXISTS sosa_note_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id UUID REFERENCES sosa_notes(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sosa_ntags_note ON sosa_note_tags(note_id);
CREATE INDEX idx_sosa_ntags_user_tag ON sosa_note_tags(user_id, tag);
CREATE UNIQUE INDEX idx_sosa_ntags_unique ON sosa_note_tags(note_id, tag);

ALTER TABLE sosa_note_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_note_tags_user_policy" ON sosa_note_tags FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 16. Note Attachments
CREATE TABLE IF NOT EXISTS sosa_note_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id UUID REFERENCES sosa_notes(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sosa_nattach_note ON sosa_note_attachments(note_id);

ALTER TABLE sosa_note_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_note_attachments_user_policy" ON sosa_note_attachments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── MODULE 3: TASKS & PROJECTS ─────────────────────────────────

-- 17. Workspaces
CREATE TABLE IF NOT EXISTS sosa_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏢',
  color TEXT DEFAULT '#c9a96e',
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE sosa_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_workspaces_user_policy" ON sosa_workspaces FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 18. Projects
CREATE TABLE IF NOT EXISTS sosa_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES sosa_workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  cover_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')),
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  estimated_budget NUMERIC(12,2),
  actual_budget NUMERIC(12,2),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_proj_user ON sosa_projects(user_id);
CREATE INDEX idx_sosa_proj_workspace ON sosa_projects(workspace_id);
CREATE INDEX idx_sosa_proj_status ON sosa_projects(user_id, status);

ALTER TABLE sosa_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_projects_user_policy" ON sosa_projects FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 19. Tasks
CREATE TABLE IF NOT EXISTS sosa_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES sosa_projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')),
  assignee_name TEXT,
  assignee_avatar TEXT,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC(6,1),
  actual_hours NUMERIC(6,1),
  story_points INT,
  labels TEXT[],
  tags TEXT[],
  sort_order INT DEFAULT 0,
  board_column TEXT,
  parent_task_id UUID REFERENCES sosa_tasks(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_tasks_user ON sosa_tasks(user_id);
CREATE INDEX idx_sosa_tasks_project ON sosa_tasks(project_id);
CREATE INDEX idx_sosa_tasks_status ON sosa_tasks(user_id, status);
CREATE INDEX idx_sosa_tasks_parent ON sosa_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_sosa_tasks_due ON sosa_tasks(user_id, due_date) WHERE status NOT IN ('done', 'cancelled');

ALTER TABLE sosa_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_tasks_user_policy" ON sosa_tasks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 20. Task Comments
CREATE TABLE IF NOT EXISTS sosa_task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES sosa_tasks(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES sosa_task_comments(id),
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_tcomments_task ON sosa_task_comments(task_id);

ALTER TABLE sosa_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_task_comments_user_policy" ON sosa_task_comments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 21. Task Attachments
CREATE TABLE IF NOT EXISTS sosa_task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES sosa_tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sosa_task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_task_attachments_user_policy" ON sosa_task_attachments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 22. Task Time Entries
CREATE TABLE IF NOT EXISTS sosa_task_time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES sosa_tasks(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  is_running BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sosa_time_task ON sosa_task_time_entries(task_id);
CREATE INDEX idx_sosa_time_user ON sosa_task_time_entries(user_id, started_at DESC);

ALTER TABLE sosa_task_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_task_time_entries_user_policy" ON sosa_task_time_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── CRM continued: Interactions ─────────────────────────────────

-- 23. Interactions
CREATE TABLE IF NOT EXISTS sosa_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES sosa_contacts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'message', 'note', 'other')),
  subject TEXT,
  content TEXT,
  interaction_date TIMESTAMPTZ DEFAULT now(),
  duration_minutes INT,
  deal_id UUID REFERENCES sosa_deals(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sosa_interactions_contact ON sosa_interactions(contact_id);

ALTER TABLE sosa_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_interactions_user_policy" ON sosa_interactions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── MODULE 5: CALENDAR / EVENTS ────────────────────────────────

-- 24. Events
CREATE TABLE IF NOT EXISTS sosa_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'Europe/Rome',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  recurrence_end_date DATE,
  parent_event_id UUID REFERENCES sosa_events(id),
  event_type TEXT DEFAULT 'event' CHECK (event_type IN ('event', 'meeting', 'deadline', 'reminder', 'task_due')),
  color TEXT,
  project_id UUID REFERENCES sosa_projects(id),
  task_id UUID REFERENCES sosa_tasks(id),
  contact_id UUID REFERENCES sosa_contacts(id),
  deal_id UUID REFERENCES sosa_deals(id),
  reminder_minutes INT[],
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sosa_events_user ON sosa_events(user_id);
CREATE INDEX idx_sosa_events_user_date ON sosa_events(user_id, start_at);
CREATE INDEX idx_sosa_events_project ON sosa_events(project_id) WHERE project_id IS NOT NULL;

ALTER TABLE sosa_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_events_user_policy" ON sosa_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 25. Reminders
CREATE TABLE IF NOT EXISTS sosa_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  event_id UUID REFERENCES sosa_events(id) ON DELETE CASCADE,
  task_id UUID REFERENCES sosa_tasks(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES sosa_subscriptions(id) ON DELETE CASCADE,
  is_sent BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'telegram', 'email', 'push')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sosa_reminders_user ON sosa_reminders(user_id);
CREATE INDEX idx_sosa_reminders_pending ON sosa_reminders(remind_at) WHERE is_sent = false AND is_dismissed = false;

ALTER TABLE sosa_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_reminders_user_policy" ON sosa_reminders FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── MODULE 6: SETTINGS ─────────────────────────────────────────

-- 26. Portal Settings
CREATE TABLE IF NOT EXISTS sosa_portal_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_currency TEXT DEFAULT 'EUR',
  fiscal_year_start_month INT DEFAULT 1,
  tax_rate NUMERIC(5,2) DEFAULT 22.00,
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  number_format TEXT DEFAULT 'it-IT',
  week_start TEXT DEFAULT 'monday',
  email_notifications BOOLEAN DEFAULT true,
  telegram_notifications BOOLEAN DEFAULT false,
  telegram_chat_id TEXT,
  business_name TEXT,
  business_address TEXT,
  business_vat TEXT,
  business_fiscal_code TEXT,
  business_pec TEXT,
  business_sdi TEXT,
  business_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_sosa_settings_user ON sosa_portal_settings(user_id);

ALTER TABLE sosa_portal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sosa_portal_settings_user_policy" ON sosa_portal_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
