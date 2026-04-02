-- =============================================================================
-- ICONOFF PLATFORM — COMPLETE DATABASE MIGRATION v2
-- Generated: 2026-04-02 (corrected after live DB inspection)
-- DB state: 27 config tables exist, all core tables missing
-- Portal UUIDs: sosa=...0001, keylo=...0002, redx=...0003, trustme=...0004
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_updated_at_trigger(tbl TEXT) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON %I;
     CREATE TRIGGER %I BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
    'trg_' || tbl || '_updated_at', tbl,
    'trg_' || tbl || '_updated_at', tbl
  );
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- CORE: SOCIAL CONNECTIONS (needed as FK for social_posts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS social_connections (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id       UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        VARCHAR(30) NOT NULL,
  account_handle  VARCHAR(100),
  account_name    VARCHAR(100),
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active       BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portal_id, user_id, platform)
);


-- =============================================================================
-- CORE: PERSONAL TRANSACTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS personal_transactions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id           UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                VARCHAR(20) NOT NULL CHECK (type IN ('income','expense','transfer')),
  amount              NUMERIC(14,2) NOT NULL,
  currency            VARCHAR(10) DEFAULT 'EUR',
  category            VARCHAR(100),
  category_id         UUID,       -- FK added after finance_transaction_categories is created
  description         TEXT,
  date                DATE        NOT NULL DEFAULT CURRENT_DATE,
  cost_classification VARCHAR(20) CHECK (cost_classification IN ('fixed','variable','semi-variable','one-time')),
  payment_method      VARCHAR(50),
  reference           TEXT,
  tags                TEXT[],
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- CORE: TASKS & PROJECTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(50) DEFAULT 'active',
  color       VARCHAR(7),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  status      VARCHAR(50) DEFAULT 'todo',
  priority    VARCHAR(20) DEFAULT 'medium',
  assigned_to UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id  UUID        REFERENCES projects(id) ON DELETE SET NULL,
  parent_id   UUID        REFERENCES tasks(id) ON DELETE SET NULL,
  labels      TEXT[],
  due_date    DATE,
  estimate    INT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- CORE: SUBSCRIPTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id       UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  currency        VARCHAR(10) DEFAULT 'EUR',
  billing_cycle   VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly','monthly','quarterly','yearly')),
  next_billing_date DATE,
  category        VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  logo_url        TEXT,
  color           VARCHAR(7),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_transactions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID        NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  portal_id       UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'completed',
  billing_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- FINANCE: TRANSACTION CATEGORIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS finance_transaction_categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('revenue','cogs','opex','other','expense','income','business')),
  color       VARCHAR(7),
  icon        VARCHAR(50),
  is_default  BOOLEAN     DEFAULT false,
  is_active   BOOLEAN     DEFAULT true,
  sort_order  INT         DEFAULT 0,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portal_id, slug)
);

-- Add FK from personal_transactions to categories now that it exists
ALTER TABLE personal_transactions
  ADD CONSTRAINT fk_pt_category
  FOREIGN KEY (category_id) REFERENCES finance_transaction_categories(id) ON DELETE SET NULL
  NOT VALID;

-- Seed default categories for all 4 portals
INSERT INTO finance_transaction_categories (portal_id, name, slug, type, color, icon, is_default, sort_order)
SELECT p.id, c.name, c.slug, c.type, c.color, c.icon, c.is_default, c.sort_order
FROM portals p
CROSS JOIN (VALUES
  ('Salary',        'salary',        'income',  '#22c55e','Wallet',      true,  1),
  ('Freelance',     'freelance',     'income',  '#16a34a','Briefcase',   false, 2),
  ('Investments',   'investments',   'revenue', '#3b82f6','TrendingUp',  false, 3),
  ('Other Income',  'other-income',  'income',  '#06b6d4','Plus',        false, 4),
  ('Housing',       'housing',       'opex',    '#f59e0b','Home',        true,  10),
  ('Food & Dining', 'food-dining',   'opex',    '#ef4444','Utensils',    true,  11),
  ('Transport',     'transport',     'opex',    '#8b5cf6','Car',         true,  12),
  ('Entertainment', 'entertainment', 'opex',    '#ec4899','Music',       false, 13),
  ('Healthcare',    'healthcare',    'opex',    '#14b8a6','Heart',       false, 14),
  ('Education',     'education',     'opex',    '#f97316','BookOpen',    false, 15),
  ('Shopping',      'shopping',      'opex',    '#a855f7','ShoppingBag', false, 16),
  ('Subscriptions', 'subscriptions', 'opex',    '#6366f1','RefreshCw',   false, 17),
  ('Utilities',     'utilities',     'opex',    '#64748b','Zap',         false, 18),
  ('Travel',        'travel',        'opex',    '#0ea5e9','Plane',       false, 19),
  ('Other',         'other',         'other',   '#94a3b8','Circle',      true,  99)
) AS c(name, slug, type, color, icon, is_default, sort_order)
ON CONFLICT (portal_id, slug) DO NOTHING;


-- =============================================================================
-- FINANCE: BUDGET LIMITS
-- =============================================================================
CREATE TABLE IF NOT EXISTS budget_limits (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  category      VARCHAR(100) NOT NULL,
  category_id   UUID        REFERENCES finance_transaction_categories(id) ON DELETE SET NULL,
  monthly_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  color         VARCHAR(7),
  icon_name     VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portal_id, category)
);


-- =============================================================================
-- FINANCE: FINANCIAL GOALS
-- =============================================================================
CREATE TABLE IF NOT EXISTS financial_goals (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  target      NUMERIC(14,2) NOT NULL,
  saved       NUMERIC(14,2) NOT NULL DEFAULT 0,
  deadline    DATE,
  category    VARCHAR(100),
  color       VARCHAR(7),
  emoji       VARCHAR(10),
  is_achieved BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- FINANCE: INVESTMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS investments (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  ticker        VARCHAR(20),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('stock','etf','crypto','bonds','real_estate','other')),
  units         NUMERIC(18,8) NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC(14,4) NOT NULL DEFAULT 0,
  current_price NUMERIC(14,4),
  currency      VARCHAR(10) DEFAULT 'USD',
  color         VARCHAR(7),
  emoji         VARCHAR(10),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- FINANCE: CRYPTO
-- =============================================================================
CREATE TABLE IF NOT EXISTS crypto_holdings (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id      UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol         VARCHAR(20) NOT NULL,
  name           VARCHAR(100),
  quantity       NUMERIC(18,8) NOT NULL DEFAULT 0,
  avg_cost_price NUMERIC(14,4) DEFAULT 0,
  current_price  NUMERIC(14,4) DEFAULT 0,
  color          VARCHAR(7),
  logo_url       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portal_id, user_id, symbol)
);

CREATE TABLE IF NOT EXISTS crypto_transactions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id  UUID        REFERENCES crypto_holdings(id) ON DELETE SET NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('buy','sell','transfer','staking','airdrop')),
  symbol      VARCHAR(20) NOT NULL,
  quantity    NUMERIC(18,8) NOT NULL,
  price       NUMERIC(14,4) NOT NULL,
  fee         NUMERIC(14,4) DEFAULT 0,
  notes       TEXT,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- FINANCE: GIFT CARDS
-- =============================================================================
CREATE TABLE IF NOT EXISTS gift_card_brands (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  logo_url   TEXT,
  color      VARCHAR(7),
  website    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id       UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id        UUID        REFERENCES gift_card_brands(id) ON DELETE SET NULL,
  brand_name      VARCHAR(100),
  balance         NUMERIC(12,2) NOT NULL DEFAULT 0,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'EUR',
  card_number     TEXT,
  expiry_date     DATE,
  notes           TEXT,
  color           VARCHAR(7),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_card_id UUID        NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  portal_id    UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL,
  type         VARCHAR(20) NOT NULL CHECK (type IN ('credit','debit','refund','expiry')),
  description  TEXT,
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- SOCIAL: POSTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS social_posts (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id        UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id    UUID        REFERENCES social_connections(id) ON DELETE SET NULL,
  platform         VARCHAR(30) NOT NULL,
  content_text     TEXT,
  media_urls       JSONB       DEFAULT '[]',
  media_type       VARCHAR(20) CHECK (media_type IN ('image','video','carousel','reel','story','text')),
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','scheduled','published','failed','deleted')),
  scheduled_at     TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  likes            INT         DEFAULT 0,
  comments         INT         DEFAULT 0,
  shares           INT         DEFAULT 0,
  impressions      INT         DEFAULT 0,
  reach            INT         DEFAULT 0,
  tags             JSONB       DEFAULT '[]',
  hashtags         TEXT[],
  external_post_id TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- TASKS: COMMENTS & MILESTONES
-- =============================================================================
CREATE TABLE IF NOT EXISTS task_comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  portal_id    UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  due_date     DATE,
  is_completed BOOLEAN     DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- CLOUD: FOLDERS, FILES, VERSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS cloud_folders (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id                 UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  name                      VARCHAR(255) NOT NULL,
  parent_id                 UUID        REFERENCES cloud_folders(id) ON DELETE CASCADE,
  created_by                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions               JSONB       DEFAULT '[]',
  is_locked                 BOOLEAN     DEFAULT false,
  password_hash             TEXT,
  password_set_at           TIMESTAMPTZ,
  lock_auto_timeout_minutes INT         DEFAULT 5,
  color                     VARCHAR(7),
  icon                      VARCHAR(50),
  is_deleted                BOOLEAN     DEFAULT false,
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_files (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id           UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  folder_id           UUID        REFERENCES cloud_folders(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  storage_path        TEXT,
  size_bytes          BIGINT      DEFAULT 0,
  mime_type           VARCHAR(100),
  file_type           VARCHAR(20),
  description         TEXT,
  thumbnail_url       TEXT,
  owner_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted          BOOLEAN     DEFAULT false,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  permanent_delete_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_file_versions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id      UUID        NOT NULL REFERENCES cloud_files(id) ON DELETE CASCADE,
  version_num  INT         NOT NULL,
  storage_path TEXT        NOT NULL,
  size_bytes   BIGINT      DEFAULT 0,
  uploaded_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (file_id, version_num)
);

CREATE TABLE IF NOT EXISTS folder_access_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id   UUID        NOT NULL REFERENCES cloud_folders(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  action      VARCHAR(30) NOT NULL CHECK (action IN ('unlock','lock','view','edit','delete','share')),
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- VAULT: ITEMS & HISTORY
-- =============================================================================
CREATE TABLE IF NOT EXISTS vault_items (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id        UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             VARCHAR(20) NOT NULL CHECK (type IN ('credential','api_key','document','note','card')),
  name             VARCHAR(255) NOT NULL,
  category         VARCHAR(100),
  encrypted_data   TEXT        NOT NULL,
  is_locked        BOOLEAN     DEFAULT false,
  is_favorite      BOOLEAN     DEFAULT false,
  tags             TEXT[],
  created_by       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vault_item_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     UUID        NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  action      VARCHAR(20) NOT NULL CHECK (action IN ('created','updated','accessed','deleted','restored','shared')),
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- NOTES
-- =============================================================================
CREATE TABLE IF NOT EXISTS note_folders (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  color       VARCHAR(7),
  icon        VARCHAR(50),
  sort_order  INT         DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id   UUID        REFERENCES note_folders(id) ON DELETE SET NULL,
  title       VARCHAR(500) NOT NULL DEFAULT 'Untitled',
  content     TEXT,
  is_pinned   BOOLEAN     DEFAULT false,
  is_archived BOOLEAN     DEFAULT false,
  color       VARCHAR(7),
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);


-- =============================================================================
-- USER: PROFILES & PREFERENCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  bio          TEXT,
  phone        VARCHAR(30),
  timezone     VARCHAR(50) DEFAULT 'UTC',
  language     VARCHAR(10) DEFAULT 'en',
  avatar_url   TEXT,
  banner_url   TEXT,
  social_links JSONB       DEFAULT '{}',
  is_onboarded BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_id       UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  theme           VARCHAR(10) DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
  accent_color    VARCHAR(7),
  number_format   VARCHAR(10) DEFAULT 'comma' CHECK (number_format IN ('comma','period')),
  density         VARCHAR(15) DEFAULT 'comfortable' CHECK (density IN ('comfortable','compact')),
  language        VARCHAR(10) DEFAULT 'en',
  dashboard_period VARCHAR(20) DEFAULT '1M',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, portal_id)
);

CREATE TABLE IF NOT EXISTS user_activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   TEXT,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- ADMIN: AUDIT LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID        NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   VARCHAR(100),
  action      VARCHAR(100) NOT NULL,
  category    VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id   TEXT,
  details     JSONB,
  severity    VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sc_portal_user     ON social_connections (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pt_portal_user     ON personal_transactions (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pt_date            ON personal_transactions (portal_id, date);
CREATE INDEX IF NOT EXISTS idx_pt_category_id     ON personal_transactions (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_portal       ON tasks (portal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project      ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned     ON tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_proj_portal        ON projects (portal_id);
CREATE INDEX IF NOT EXISTS idx_subs_portal_user   ON subscriptions (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_subs_next_billing  ON subscriptions (next_billing_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ftc_portal         ON finance_transaction_categories (portal_id);
CREATE INDEX IF NOT EXISTS idx_ftc_type           ON finance_transaction_categories (portal_id, type);
CREATE INDEX IF NOT EXISTS idx_bl_portal          ON budget_limits (portal_id);
CREATE INDEX IF NOT EXISTS idx_fg_portal_user     ON financial_goals (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_inv_portal_user    ON investments (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ch_portal_user     ON crypto_holdings (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ctx_portal_user    ON crypto_transactions (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ctx_date           ON crypto_transactions (date);
CREATE INDEX IF NOT EXISTS idx_gc_portal_user     ON gift_cards (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gct_card           ON gift_card_transactions (gift_card_id);
CREATE INDEX IF NOT EXISTS idx_sp_portal_user     ON social_posts (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sp_status          ON social_posts (portal_id, status);
CREATE INDEX IF NOT EXISTS idx_sp_scheduled       ON social_posts (scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_tc_task            ON task_comments (task_id);
CREATE INDEX IF NOT EXISTS idx_pm_project         ON project_milestones (project_id);
CREATE INDEX IF NOT EXISTS idx_cf_portal          ON cloud_folders (portal_id);
CREATE INDEX IF NOT EXISTS idx_cf_parent          ON cloud_folders (parent_id);
CREATE INDEX IF NOT EXISTS idx_cfi_portal         ON cloud_files (portal_id);
CREATE INDEX IF NOT EXISTS idx_cfi_folder         ON cloud_files (folder_id);
CREATE INDEX IF NOT EXISTS idx_vi_portal_user     ON vault_items (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_vih_item           ON vault_item_history (item_id);
CREATE INDEX IF NOT EXISTS idx_notes_portal       ON notes (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_nf_portal_user     ON note_folders (portal_id, user_id);
CREATE INDEX IF NOT EXISTS idx_up_user_portal     ON user_preferences (user_id, portal_id);
CREATE INDEX IF NOT EXISTS idx_ual_user           ON user_activity_log (user_id, portal_id);
CREATE INDEX IF NOT EXISTS idx_al_portal          ON audit_log (portal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_severity        ON audit_log (portal_id, severity);


-- =============================================================================
-- RLS — ENABLE
-- =============================================================================
ALTER TABLE social_connections              ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transaction_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_limits                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_holdings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_transactions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_brands                ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_folders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_files                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_file_versions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_access_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_item_history              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_folders                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                       ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- RLS — POLICIES (all use (SELECT auth.uid()) for plan-time evaluation)
-- =============================================================================

-- Helper: is current user a member of the given portal?
-- Used inline in policies below.

-- social_connections
DROP POLICY IF EXISTS "sc_all" ON social_connections;
CREATE POLICY "sc_all" ON social_connections FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- personal_transactions
DROP POLICY IF EXISTS "pt_all" ON personal_transactions;
CREATE POLICY "pt_all" ON personal_transactions FOR ALL
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));

-- tasks
DROP POLICY IF EXISTS "tasks_all" ON tasks;
CREATE POLICY "tasks_all" ON tasks FOR ALL
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));

-- projects
DROP POLICY IF EXISTS "proj_all" ON projects;
CREATE POLICY "proj_all" ON projects FOR ALL
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));

-- subscriptions
DROP POLICY IF EXISTS "subs_all" ON subscriptions;
CREATE POLICY "subs_all" ON subscriptions FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- subscription_transactions
DROP POLICY IF EXISTS "subtx_all" ON subscription_transactions;
CREATE POLICY "subtx_all" ON subscription_transactions FOR ALL
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));

-- finance_transaction_categories
DROP POLICY IF EXISTS "ftc_select" ON finance_transaction_categories;
CREATE POLICY "ftc_select" ON finance_transaction_categories FOR SELECT
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "ftc_insert" ON finance_transaction_categories;
CREATE POLICY "ftc_insert" ON finance_transaction_categories FOR INSERT
  WITH CHECK (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "ftc_update" ON finance_transaction_categories;
CREATE POLICY "ftc_update" ON finance_transaction_categories FOR UPDATE
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "ftc_delete" ON finance_transaction_categories;
CREATE POLICY "ftc_delete" ON finance_transaction_categories FOR DELETE
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())) AND is_default = false);

-- budget_limits
DROP POLICY IF EXISTS "bl_all" ON budget_limits;
CREATE POLICY "bl_all" ON budget_limits FOR ALL
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));

-- financial_goals
DROP POLICY IF EXISTS "fg_all" ON financial_goals;
CREATE POLICY "fg_all" ON financial_goals FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- investments
DROP POLICY IF EXISTS "inv_all" ON investments;
CREATE POLICY "inv_all" ON investments FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- crypto_holdings
DROP POLICY IF EXISTS "ch_all" ON crypto_holdings;
CREATE POLICY "ch_all" ON crypto_holdings FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- crypto_transactions
DROP POLICY IF EXISTS "ctx_all" ON crypto_transactions;
CREATE POLICY "ctx_all" ON crypto_transactions FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- gift_card_brands: public read, authenticated write
DROP POLICY IF EXISTS "gcb_select" ON gift_card_brands;
CREATE POLICY "gcb_select" ON gift_card_brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "gcb_insert" ON gift_card_brands;
CREATE POLICY "gcb_insert" ON gift_card_brands FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- gift_cards
DROP POLICY IF EXISTS "gc_all" ON gift_cards;
CREATE POLICY "gc_all" ON gift_cards FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- gift_card_transactions
DROP POLICY IF EXISTS "gct_all" ON gift_card_transactions;
CREATE POLICY "gct_all" ON gift_card_transactions FOR ALL
  USING (user_id = (SELECT auth.uid()) AND portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (user_id = (SELECT auth.uid()) AND portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));

-- social_posts
DROP POLICY IF EXISTS "sp_all" ON social_posts;
CREATE POLICY "sp_all" ON social_posts FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- task_comments
DROP POLICY IF EXISTS "tc_select" ON task_comments;
CREATE POLICY "tc_select" ON task_comments FOR SELECT
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "tc_write" ON task_comments;
CREATE POLICY "tc_write" ON task_comments FOR ALL
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

-- project_milestones
DROP POLICY IF EXISTS "pm_all" ON project_milestones;
CREATE POLICY "pm_all" ON project_milestones FOR ALL
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));

-- cloud_folders
DROP POLICY IF EXISTS "cf_select" ON cloud_folders;
CREATE POLICY "cf_select" ON cloud_folders FOR SELECT
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())) AND is_deleted = false);
DROP POLICY IF EXISTS "cf_insert" ON cloud_folders;
CREATE POLICY "cf_insert" ON cloud_folders FOR INSERT
  WITH CHECK (created_by = (SELECT auth.uid()) AND portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "cf_update" ON cloud_folders;
CREATE POLICY "cf_update" ON cloud_folders FOR UPDATE
  USING (created_by = (SELECT auth.uid()));
DROP POLICY IF EXISTS "cf_delete" ON cloud_folders;
CREATE POLICY "cf_delete" ON cloud_folders FOR DELETE
  USING (created_by = (SELECT auth.uid()));

-- cloud_files
DROP POLICY IF EXISTS "cfi_select" ON cloud_files;
CREATE POLICY "cfi_select" ON cloud_files FOR SELECT
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())) AND is_deleted = false);
DROP POLICY IF EXISTS "cfi_insert" ON cloud_files;
CREATE POLICY "cfi_insert" ON cloud_files FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()) AND portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "cfi_update" ON cloud_files;
CREATE POLICY "cfi_update" ON cloud_files FOR UPDATE
  USING (owner_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "cfi_delete" ON cloud_files;
CREATE POLICY "cfi_delete" ON cloud_files FOR DELETE
  USING (owner_id = (SELECT auth.uid()));

-- cloud_file_versions
DROP POLICY IF EXISTS "cfv_select" ON cloud_file_versions;
CREATE POLICY "cfv_select" ON cloud_file_versions FOR SELECT
  USING (file_id IN (SELECT id FROM cloud_files WHERE owner_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "cfv_insert" ON cloud_file_versions;
CREATE POLICY "cfv_insert" ON cloud_file_versions FOR INSERT
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

-- folder_access_log
DROP POLICY IF EXISTS "fal_select" ON folder_access_log;
CREATE POLICY "fal_select" ON folder_access_log FOR SELECT
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "fal_insert" ON folder_access_log;
CREATE POLICY "fal_insert" ON folder_access_log FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- vault_items
DROP POLICY IF EXISTS "vi_all" ON vault_items;
CREATE POLICY "vi_all" ON vault_items FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- vault_item_history
DROP POLICY IF EXISTS "vih_select" ON vault_item_history;
CREATE POLICY "vih_select" ON vault_item_history FOR SELECT
  USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "vih_insert" ON vault_item_history;
CREATE POLICY "vih_insert" ON vault_item_history FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- notes
DROP POLICY IF EXISTS "notes_all" ON notes;
CREATE POLICY "notes_all" ON notes FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- note_folders
DROP POLICY IF EXISTS "nf_all" ON note_folders;
CREATE POLICY "nf_all" ON note_folders FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_profiles: visible to portal co-members
DROP POLICY IF EXISTS "up_select" ON user_profiles;
CREATE POLICY "up_select" ON user_profiles FOR SELECT
  USING (id = (SELECT auth.uid()) OR id IN (
    SELECT DISTINCT pm2.user_id FROM portal_members pm1
    JOIN portal_members pm2 ON pm1.portal_id = pm2.portal_id
    WHERE pm1.user_id = (SELECT auth.uid())
  ));
DROP POLICY IF EXISTS "up_modify" ON user_profiles;
CREATE POLICY "up_modify" ON user_profiles FOR ALL
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- user_preferences
DROP POLICY IF EXISTS "uprefs_all" ON user_preferences;
CREATE POLICY "uprefs_all" ON user_preferences FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- user_activity_log
DROP POLICY IF EXISTS "ual_select" ON user_activity_log;
CREATE POLICY "ual_select" ON user_activity_log FOR SELECT
  USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "ual_insert" ON user_activity_log;
CREATE POLICY "ual_insert" ON user_activity_log FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- audit_log
DROP POLICY IF EXISTS "al_select" ON audit_log;
CREATE POLICY "al_select" ON audit_log FOR SELECT
  USING (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid()) AND role IN ('owner','admin','manager')));
DROP POLICY IF EXISTS "al_insert" ON audit_log;
CREATE POLICY "al_insert" ON audit_log FOR INSERT
  WITH CHECK (portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = (SELECT auth.uid())));


-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
SELECT create_updated_at_trigger('social_connections');
SELECT create_updated_at_trigger('personal_transactions');
SELECT create_updated_at_trigger('tasks');
SELECT create_updated_at_trigger('projects');
SELECT create_updated_at_trigger('subscriptions');
SELECT create_updated_at_trigger('finance_transaction_categories');
SELECT create_updated_at_trigger('budget_limits');
SELECT create_updated_at_trigger('financial_goals');
SELECT create_updated_at_trigger('investments');
SELECT create_updated_at_trigger('crypto_holdings');
SELECT create_updated_at_trigger('gift_cards');
SELECT create_updated_at_trigger('social_posts');
SELECT create_updated_at_trigger('task_comments');
SELECT create_updated_at_trigger('project_milestones');
SELECT create_updated_at_trigger('cloud_folders');
SELECT create_updated_at_trigger('cloud_files');
SELECT create_updated_at_trigger('notes');
SELECT create_updated_at_trigger('note_folders');
SELECT create_updated_at_trigger('user_profiles');
SELECT create_updated_at_trigger('user_preferences');
