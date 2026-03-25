# ICONOFF / SOSA INC. — Platform Documentation

> Complete reference for the ICONOFF multi-portal financial management platform.
> Last updated: 2026-03-22

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Portal System](#2-portal-system)
3. [Authentication & Roles](#3-authentication--roles)
4. [Finance Module](#4-finance-module)
5. [Crypto Module](#5-crypto-module)
6. [Gift Cards Module](#6-gift-cards-module)
7. [Investments Module](#7-investments-module)
8. [Net Worth Engine](#8-net-worth-engine)
9. [Social Media Module](#9-social-media-module)
10. [Workspace Tools](#10-workspace-tools)
11. [Settings — Complete Reference](#11-settings--complete-reference)
12. [Design System](#12-design-system)
13. [Data Layer](#13-data-layer)
14. [Database Schema](#14-database-schema)
15. [Tech Stack](#15-tech-stack)
16. [File Structure](#16-file-structure)

---

## 1. Architecture Overview

ICONOFF is a **multi-portal SaaS dashboard** built with React + TypeScript + Supabase. Each portal represents an independent business entity with its own isolated data, branding, and feature set.

```
                   ┌─────────────────────┐
                   │     Hub Page        │
                   │  (Portal Selector)  │
                   └────────┬────────────┘
            ┌───────────────┼───────────────┐
            v               v               v
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │ SOSA INC │   │  KEYLO   │   │   REDX   │  ...
      │ (blue)   │   │ (green)  │   │  (red)   │
      └────┬─────┘   └────┬─────┘   └────┬─────┘
           │               │               │
     ┌─────┴─────┐   ┌────┴─────┐   ┌─────┴─────┐
     │ Finance   │   │ Finance  │   │ Finance   │
     │ Social    │   │ Social   │   │ Social    │
     │ Workspace │   │ Workspace│   │ Workspace │
     │ Settings  │   │ Settings │   │ Settings  │
     └───────────┘   └──────────┘   └───────────┘
```

**Key design decisions:**
- Portal-scoped data isolation (all localStorage keys and DB rows include portal ID)
- Supabase-first with localStorage fallback when DB is unavailable
- Mock authentication (hardcoded users, no Supabase Auth yet)
- Glassmorphism UI with dark/light theme + 10 accent color presets
- Italian labels in finance UI, English everywhere else

---

## 2. Portal System

### Portals

| ID | Name | Color | Route | Disabled Features |
|----|------|-------|-------|-------------------|
| `sosa` | SOSA INC. | `#4A9EFF` (blue) | `/sosa` | cloud, social |
| `keylo` | KEYLO | `#2ECC71` (green) | `/keylo` | none |
| `redx` | REDX | `#FF5A5A` (red) | `/redx` | none |
| `trustme` | TRUST ME | `#FF9F43` (orange) | `/trustme` | none |

### How it works

1. **`PortalProvider`** (`src/lib/portalContext.tsx`) — Holds the static portal config (name, color, route prefix, disabled features). Set when the user navigates to `/:portalId`.
2. **`PortalDBProvider`** (`src/lib/portalContextDB.tsx`) — Bridges the static config with the Supabase `portals` table (UUID mapping, member roles).
3. **`PortalLayout`** (`src/components/PortalLayout.tsx`) — Route wrapper that validates portal access. If the user doesn't have access, redirects to `/hub`.
4. **CSS variable** `--portal-accent` is set on document root for portal-specific accent color.

### Portal routes

All portal pages are mounted under `/:portalId/`:

```
/:portalId/dashboard       — Finance dashboard
/:portalId/transactions    — Personal transactions
/:portalId/costs           — Budget management
/:portalId/channels        — Subscriptions
/:portalId/pl-rules        — Financial goals
/:portalId/investments     — Investment portfolio
/:portalId/crypto          — Cryptocurrency holdings
/:portalId/gift-cards      — Gift card inventory
/:portalId/analytics       — Financial analytics
/:portalId/invoices        — Invoice management
/:portalId/profile         — User profile
/:portalId/vault           — Secure credentials
/:portalId/cloud           — Cloud storage
/:portalId/tasks           — Task management
/:portalId/notes           — Notes
/:portalId/admin           — Administration
/:portalId/social/*        — Social media module
/:portalId/settings/*      — Settings pages
```

---

## 3. Authentication & Roles

### Auth System

**Type:** Mock-based (hardcoded users in `src/lib/authContext.tsx`)

**Default users:**

| Email | Name | Role | Password |
|-------|------|------|----------|
| `owner@iconoff.com` | Alessandro | owner | any |
| `admin@iconoff.com` | Marco | admin | any |
| `sara@iconoff.com` | Sara | member | any |
| `elena@iconoff.com` | Elena | member | any |
| `denis@iconoff.com` | Denis | owner | any |

Login simulates an 800ms delay. "Remember me" persists to `localStorage`; otherwise `sessionStorage`.

### Role hierarchy

| Role | Access |
|------|--------|
| `owner` | Full access to all portals and features. Cannot be removed. |
| `admin` | All portal features, user management |
| `manager` | Team/project management, finance view |
| `member` | Basic access, limited to assigned items |
| `viewer` | Read-only |

### Permission model

Permissions are defined per module per role:

```
module: finance | projects | social | team | notifications | vault | cloud | tasks | notes
actions: can_view | can_create | can_edit | can_delete | can_export
```

Configured in **Settings > Team > Roles & Permissions**.

---

## 4. Finance Module

The core module. All finance features live under the `/:portalId/` route.

### Dashboard (`/dashboard`)

The main view with:
- **Period selector** — Last 7 days, last week, last month, last quarter, this year, custom range
- **KPI cards** — Total income, total expenses, net balance, savings rate
- **Transaction summary** — Recent transactions with category breakdown
- **Goals progress** — Active financial goals with completion bars
- **Subscriptions** — Upcoming renewals
- **Investment snapshot** — Portfolio value + P&L
- **Crypto holdings** — Total crypto value in EUR
- **Gift Cards** — Active gift card value
- **Net Worth card** — Aggregated net worth with trend

### Transactions (`/transactions`)

Full CRUD for personal income/expense transactions.

**Data source:** `useTransactions` hook → Supabase `personal_transactions` table (or `personalTransactionStore` localStorage fallback)

**Features:**
- Filter by type (income/expense/all), category, date range, amount range
- Search by description
- Pagination
- Add/edit/delete with modal
- Category assignment

**Storage key (local):** `personal_transactions_local_${portalId}`

### Budget (`/costs`)

Category-based budget tracking.

**Data source:** `useBudgetData` hook → `budgetStorage` service

**Features:**
- Set monthly budget limits per expense category
- Track spent vs. limit with progress bars
- Alert thresholds (yellow at 80%, red at 100%)
- Drill-down into category transactions

**Storage key (local):** `finance_budget_limits`

### Subscriptions (`/channels`)

Recurring billing management.

**Data source:** `useDashboardSubscriptions` hook

**Features:**
- Add/edit/delete subscriptions (name, amount, billing cycle, category)
- Billing cycles: monthly, quarterly, semi-annual, annual
- Next billing date calculation
- Active/paused/cancelled status
- Total monthly/annual subscription cost

**Storage key (local):** `finance_subscriptions`

### Goals (`/pl-rules`)

Financial goal tracking.

**Data source:** `useFinancialGoals` hook

**Features:**
- Goal types: savings, debt payoff, investment, emergency fund, custom
- Target amount and deadline
- Progress tracking with contribution history
- Priority levels
- Completion percentage with visual progress

**Storage key (local):** `finance_goals`

### Invoices (`/invoices`)

Invoice creation and management.

**Features:**
- Line items with quantity, unit price, tax
- Client details
- Payment terms and due dates
- PDF export via jsPDF
- Status: draft, sent, paid, overdue

**Storage key (local):** `invoices_${portalId}`

### Analytics (`/analytics`)

Financial reporting and charts.

**Features:**
- Income vs expenses trend (line chart)
- Category breakdown (donut chart)
- Monthly comparison (bar chart)
- Period-over-period analysis

---

## 5. Crypto Module

**Page:** `/:portalId/crypto`
**Files:** `src/pages/crypto/`, `src/portals/finance/services/cryptoService.ts`, `src/portals/finance/hooks/useCrypto*.ts`

### How it works

1. **Holdings CRUD** — Add/edit/delete crypto holdings (coin, quantity, buy price)
2. **Price fetching** — `useCryptoPrices` hook fetches live prices from Supabase `crypto_prices` table (updated by edge function cron)
3. **Portfolio aggregation** — `useCryptoPortfolio` calculates total value, P&L, allocation percentages
4. **Chart data** — `useCryptoChart` provides historical price data for sparklines

### Supabase tables

- `crypto_holdings` — User holdings (coin_id, quantity, buy_price, user_id)
- `crypto_prices` — Latest prices per coin
- `crypto_price_history` — Historical price data

### Edge functions

- `search-crypto/` — CoinGecko API search proxy
- `update-crypto-prices/` — Cron job to refresh prices

### localStorage fallback

When Supabase is not configured, holdings are stored in `crypto_holdings_local` and prices use hardcoded fallback data.

---

## 6. Gift Cards Module

**Page:** `/:portalId/gift-cards`
**Files:** `src/pages/gift-cards/`, `src/portals/finance/services/giftCardService.ts`, `src/portals/finance/hooks/useGiftCard*.ts`

### How it works

1. **Brand catalog** — 30 pre-seeded brands (Amazon, Apple, Netflix, Spotify, etc.) across 8 categories
2. **Card CRUD** — Register gift cards with brand, initial value, currency (EUR/USD/GBP), code, PIN, expiry date
3. **Balance tracking** — "Use balance" form decrements remaining value with transaction history
4. **Status lifecycle** — `active` → `partially_used` → `fully_used` (automatic via triggers)
5. **Expiry monitoring** — Cards expiring within 30 days flagged as "in scadenza"

### 2-step add modal

- **Step 1:** Brand selector grid (popular brands, search, category filter, or custom)
- **Step 2:** Detail form (initial value, currency, code, PIN, expiry date, notes)

### Detail panel

Slide-in panel (420px from right) with:
- Brand header with logo
- Balance progress bar (used vs remaining)
- "Usa Saldo" inline form with live balance calculation
- Transaction history with delete
- Card details (masked code/PIN with reveal toggle + copy)
- Actions: edit, archive, delete

### Multi-currency

Supports EUR, USD, GBP with fallback conversion rates to EUR for net worth aggregation.

### Supabase tables

- `gift_cards` — Card records (brand, values, status, code, pin, expiry)
- `gift_card_transactions` — Balance usage history
- `gift_card_brands` — Brand catalog with categories

### Database triggers

- `auto_status` — Updates card status when `remaining_value` changes
- `auto_remaining` — Decrements balance on transaction insert
- `reverse` — Restores balance on transaction delete
- `expiry_cron` — Marks expired cards

---

## 7. Investments Module

**Page:** `/:portalId/investments`
**Files:** `src/pages/Investments.tsx`, `src/hooks/useInvestments.ts`, `src/lib/investmentStore.ts`

### Features

- Add/edit/delete investment positions
- Track: asset name, type, quantity, cost basis, current value
- Calculate: P&L, ROI percentage, allocation weight
- Types: stocks, ETFs, mutual funds, bonds, crypto, real estate

**Storage key (local):** `investments_${portalId}`

---

## 8. Net Worth Engine

**File:** `src/hooks/useNetWorth.ts`

### Formula

```
Net Worth = Income - Expenses - Subscriptions + Portfolio Value + Crypto Value + Gift Cards Value
```

### Breakdown

| Component | Source |
|-----------|--------|
| Income | Sum of income transactions in period |
| Expenses | Sum of expense transactions in period |
| Subscriptions | Monthly subscription cost |
| Portfolio Value | Total current value of investments |
| Crypto Value | Total crypto holdings in EUR |
| Gift Cards Value | Total remaining gift card balance in EUR |

### Balance trend

Tracks `totalAssetValue` over time for the net worth chart on the dashboard.

---

## 9. Social Media Module

**Pages:** `/:portalId/social/*`
**Files:** `src/pages/social/`

| Page | Route | Description |
|------|-------|-------------|
| Overview | `/social/overview` | KPIs, engagement trends, top posts |
| Accounts | `/social/accounts` | Connected platform accounts |
| Analytics | `/social/analytics` | Platform-level analytics |
| Content | `/social/content` | Content calendar and post management |
| Audience | `/social/audience` | Follower demographics and growth |
| Competitors | `/social/competitors` | Competitor benchmarking |

**Note:** Disabled for the SOSA portal (`disabledFeatures: ["social"]`).

---

## 10. Workspace Tools

### Vault (`/vault`)

Secure storage for credentials, API keys, and sensitive documents.

**Features:**
- Items: passwords, API keys, documents, secure notes
- Search and filter by type
- Encryption/lock per item
- Copy-to-clipboard

**Storage:** `vault_items_${portalId}`

### Cloud (`/cloud`)

File and folder management.

**Features:**
- Folder tree navigation
- File upload with sharing permissions
- Folder/file CRUD

**Storage:** `cloud_files_${portalId}`

### Tasks (`/tasks`)

Task/project management board.

**Features:**
- Kanban-style board with custom statuses
- Priority levels and labels
- Assignees, due dates, attachments
- Comments and activity feed
- Checklist sub-items

**Storage:** `tasks_${portalId}`

### Notes (`/notes`)

Note-taking with organization.

**Features:**
- Rich text notes
- Folders and favorites
- Color coding
- Archive
- Word count

**Storage:** `notes_${portalId}`

### Administration (`/admin`)

Admin dashboard (owner/admin only, SOSA portal only).

**Features:**
- User management (create, delete, role assignment)
- Portal access control
- Audit log (login/logout, CRUD actions across modules)

---

## 11. Settings — Complete Reference

All settings are portal-scoped. Access via `/:portalId/settings`.

### General

#### Portal Profile (`/settings/portal-profile`)

| Setting | Description |
|---------|-------------|
| Legal Name | Official business name |
| VAT Number | Tax identification number |
| Address | Street, city, postal code |
| Country | Country selection |
| Phone | Business phone number |
| Website | Company website URL |
| Language | Interface language |
| Timezone | Timezone for date calculations |
| Date Format | DD/MM/YYYY or MM/DD/YYYY |

#### Appearance (`/settings/appearance`)

| Setting | Description | Options |
|---------|-------------|---------|
| Theme | Color mode | `dark`, `light` |
| Accent Color | UI accent | `emerald`, `ocean`, `night`, `rose`, `sunset`, `royal`, `grape`, `pink`, `amber`, `teal` |
| Number Format | Currency/number formatting | `eu` (1.000,00) or `us` (1,000.00) |

Theme stored in `localStorage("theme")`, accent in `localStorage("iconoff-accent")`, number format in `localStorage("numberFormat")`.

---

### Finance Settings

#### Income Categories (`/settings/income-categories`)

Create and manage income source types.

| Field | Description |
|-------|-------------|
| Name | Category label (e.g., "Stipendio", "Freelance") |
| Icon | Lucide icon name |
| Color | Hex color for charts/badges |
| Description | Optional notes |

#### Expense Categories (`/settings/expense-categories`)

Manage expense categories with budgets.

| Field | Description |
|-------|-------------|
| Name | Category label (e.g., "Affitto", "Cibo") |
| Icon | Lucide icon name |
| Color | Hex color |
| Monthly Budget | Budget limit for the category |
| Alert Threshold | % at which to show warning (default 80%) |

#### Subscription Categories (`/settings/subscription-categories`)

| Field | Description |
|-------|-------------|
| Name | Category (e.g., "Streaming", "SaaS") |
| Default Cycle | monthly, quarterly, semi-annual, annual |
| Color | Hex color |

#### Payment Methods (`/settings/payment-methods`)

| Field | Description |
|-------|-------------|
| Name | Method label |
| Type | card, bank_transfer, cash, crypto, paypal, other |
| Is Default | Default payment method flag |

#### Recurrence Rules (`/settings/recurrence-rules`)

| Field | Description |
|-------|-------------|
| Name | Rule label |
| Frequency | daily, weekly, monthly, quarterly, annual |
| Amount | Fixed amount |
| Category | Linked income/expense category |
| Start Date | When rule becomes active |
| End Date | Optional end date |

#### Currency & Tax (`/settings/currency-tax`)

| Field | Description |
|-------|-------------|
| Base Currency | Primary currency (default EUR) |
| Display Currencies | Additional currencies to show |
| Tax Rates | Named tax rate definitions (e.g., "IVA 22%") |

---

### Projects Settings

#### Project Statuses (`/settings/project-statuses`)

Define custom workflow statuses.

| Field | Description |
|-------|-------------|
| Name | Status label (e.g., "Backlog", "In Progress", "Done") |
| Color | Status color |
| Order | Sort position in workflow |
| Is Default | Auto-assigned to new tasks |
| Is Final | Marks task as completed |

#### Priorities & Labels (`/settings/priorities-labels`)

| Field | Description |
|-------|-------------|
| Priority Name | Level name (e.g., "Critical", "High", "Medium", "Low") |
| Priority Color | Visual color |
| Priority Order | Sort weight |
| Label Name | Tag label (e.g., "Bug", "Feature", "Design") |
| Label Color | Tag color |

#### Task Templates (`/settings/task-templates`)

| Field | Description |
|-------|-------------|
| Template Name | Template label |
| Default Status | Initial status |
| Default Priority | Initial priority |
| Checklist Items | Pre-filled subtask checklist |
| Estimated Hours | Time estimate |
| Description | Template description |

---

### Social Media Settings

#### Social Accounts (`/settings/social-accounts`)

| Field | Description |
|-------|-------------|
| Platform | Instagram, Twitter/X, LinkedIn, TikTok, YouTube, Facebook |
| Account Handle | @username or page name |
| Connected | OAuth connection status |
| Auto-Post | Enable automatic posting |

#### Publishing Rules (`/settings/publishing-rules`)

| Field | Description |
|-------|-------------|
| Schedule | Posting days and times |
| Approval Required | Whether posts need manager approval |
| Hashtag Sets | Pre-defined hashtag groups |
| Watermark | Auto-apply brand watermark to images |
| Caption Templates | Reusable caption formats |

#### Content Categories (`/settings/content-categories`)

| Field | Description |
|-------|-------------|
| Name | Category (e.g., "Promotional", "Educational", "Behind the Scenes") |
| Color | Visual color |
| Default Hashtags | Auto-applied hashtags |

---

### Team Settings

#### Roles & Permissions (`/settings/roles-permissions`)

Define custom roles with granular permissions per module.

| Module | Permissions |
|--------|------------|
| Finance | view, create, edit, delete, export |
| Projects | view, create, edit, delete, export |
| Social | view, create, edit, delete, export |
| Team | view, create, edit, delete |
| Vault | view, create, edit, delete |
| Cloud | view, create, edit, delete |
| Tasks | view, create, edit, delete |
| Notes | view, create, edit, delete |

#### Departments (`/settings/departments`)

| Field | Description |
|-------|-------------|
| Name | Department name |
| Head | Department lead (user) |
| Members | Assigned team members |
| Description | Department purpose |

---

### Notification Settings

#### Notification Channels (`/settings/notification-channels`)

| Channel | Options |
|---------|---------|
| In-App | Enable/disable, sound |
| Email | Enable/disable, digest frequency |
| Telegram | Enable/disable, bot token, chat ID |
| Browser Push | Enable/disable |
| Quiet Hours | Start time, end time, timezone |

#### Alert Rules (`/settings/alert-rules`)

| Field | Description |
|-------|-------------|
| Name | Rule name |
| Trigger | Event type (budget exceeded, deadline approaching, new transaction, etc.) |
| Condition | Threshold or pattern |
| Channels | Which notification channels to use |
| Enabled | Active/inactive toggle |

---

## 12. Design System

### Theme: Luxury Glassmorphism

Every surface is a translucent glass layer with `backdrop-filter: blur()`. Four depth levels:

| Layer | Class | Purpose |
|-------|-------|---------|
| 0 | `.ambient-orbs` | Animated gradient background |
| 1 | `.glass-shell` / `.liquid-glass-container` | Main app container |
| 2 | `.glass-card` / `.glass-card-static` | Content cards |
| 3 | `.glass-card-inner` | Nested/inner cards |

### Fonts

| Token | Font | Use |
|-------|------|-----|
| `--font-display` | Cormorant Garamond | Page titles, section headers |
| `--font-body` | DM Sans | Body text, UI elements |
| `--font-mono` | DM Mono | Code, labels, badges |

### Type Scale

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--text-hero` | 32px | 600 | Page titles |
| `--text-h1` | 24px | 600 | Section headers |
| `--text-h2` | 18px | 600 | Card titles |
| `--text-h3` | 15px | 600 | Sub-headers |
| `--text-body` | 14px | 400 | General content |
| `--text-small` | 12px | 400 | Captions, timestamps |
| `--text-micro` | 10px | 500 | Badges, labels |
| `--text-data` | 28px | 700 | KPI big numbers |

### Color Modes

**Dark** (default for finance) and **Light**, toggled via `data-theme` attribute.

### Accent Colors (10 presets)

Toggled via `data-color` attribute. Each preset defines `--accent-color`, `--accent-dim`, `--glass-bg`, `--glass-border`, orb colors, etc.

| Preset | Dark Accent | Light Accent |
|--------|-------------|--------------|
| Emerald | `#6ee7b7` | `#059669` |
| Ocean | `#93c5fd` | `#2563eb` |
| Night | `#60a5fa` | `#1e40af` |
| Rose | `#fda4af` | `#e11d48` |
| Sunset | `#fdba74` | `#ea580c` |
| Royal | `#c4b5fd` | `#7c3aed` |
| Grape | `#a78bfa` | `#5b21b6` |
| Pink | `#f9a8d4` | `#db2777` |
| Amber | `#fbbf24` | `#92400e` |
| Teal | `#5eead4` | `#0d9488` |

### Semantic Colors

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--color-success` | `#22c55e` | `#16a34a` | Completed, active, positive |
| `--color-warning` | `#f59e0b` | `#d97706` | In progress, generating |
| `--color-error` | `#ef4444` | `#dc2626` | Failed, blocked, negative |
| `--color-info` | `#38bdf8` | `#0e74b2` | Informational |

### Chart Palette

`--chart-1` through `--chart-6` — theme-aware colors for Recharts.

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.glass-card` | Interactive card with hover lift |
| `.glass-card-static` | Non-interactive card |
| `.glass-card-inner` | Nested card (Layer 3) |
| `.glass-shell` | Main container shell |
| `.glass-sidebar` | Sidebar glass panel |
| `.glass-btn` | Secondary glass button |
| `.glass-btn-primary` | Primary accent button |
| `.glass-input` | Glass input field |
| `.glass-modal` | Modal dialog |
| `.glass-tooltip` | Tooltip |
| `.glass-segment` | Segmented control |
| `.glass-badge` | Generic badge |
| `.badge-success/warning/error/info/neutral` | Semantic status badges |
| `.input-glass` | Design system input |
| `.btn-primary` | Design system primary button |
| `.btn-glass-ds` | Design system glass button |
| `.skeleton` | Loading shimmer |

---

## 13. Data Layer

### Strategy

```
isSupabaseConfigured() ? Supabase : localStorage
```

The function checks if `VITE_SUPABASE_URL` is set and doesn't contain "placeholder".

### Supabase connection

```env
VITE_SUPABASE_URL=https://ndudzfaisulnmbpnvkwo.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

Configured in `.env` (git-ignored).

### localStorage keys (fallback)

| Key Pattern | Data |
|-------------|------|
| `personal_transactions_local_${portalId}` | Personal transactions |
| `finance_subscriptions` | Subscriptions |
| `finance_goals` | Financial goals |
| `finance_budget_limits` | Budget limits |
| `finance_categories_${portalId}` | Income/expense categories |
| `investments_${portalId}` | Investment portfolio |
| `crypto_holdings_local` | Crypto holdings |
| `gift_cards_local` | Gift cards |
| `gift_card_transactions_local` | Gift card transactions |
| `vault_items_${portalId}` | Vault credentials |
| `cloud_files_${portalId}` | Cloud files |
| `tasks_${portalId}` | Tasks |
| `notes_${portalId}` | Notes |
| `invoices_${portalId}` | Invoices |
| `iconoff_profile_${userId}` | User profile |
| `iconoff_auth_user` | Auth session |
| `theme` | Dark/light mode |
| `iconoff-accent` | Accent color preset |
| `numberFormat` | EU/US number format |
| `dashboardPeriod` | Period filter |
| `dashboardCustomRange` | Custom date range |

### Data reset mechanism

`App.tsx` contains a one-time reset that wipes localStorage keys not in the keep list. Controlled by `RESET_VERSION` constant — bump to force a clean slate.

---

## 14. Database Schema

### Supabase Migrations (29 files)

**Core:**
- `portals` — Portal definitions with UUID
- `portal_members` — User-portal association with roles

**Personal Finance:**
- `personal_transactions` — Income/expense records (user_id, portal_id scoped)

**Finance Config (per portal):**
- `income_categories`, `expense_categories`, `subscription_categories`
- `payment_methods`, `recurrence_rules`
- `currency_settings`, `tax_rates`

**Crypto (3 tables):**
- `crypto_holdings` — User holdings (coin_id, quantity, buy_price)
- `crypto_prices` — Latest coin prices
- `crypto_price_history` — Historical price data

**Gift Cards (3 tables):**
- `gift_cards` — Card records with brand, values, status, code, pin, expiry
- `gift_card_transactions` — Balance usage history
- `gift_card_brands` — 30 seeded brands across 8 categories

**Projects:**
- `project_statuses`, `task_priorities`, `task_labels`, `task_templates`

**Social:**
- `social_connections`, social accounts, posts, content categories

**Team:**
- `roles`, `role_permissions`, `departments`

**Notifications:**
- `notification_channels`, `alert_rules`

**General:**
- `contacts`, `deals`, `invoices`, `invoice_line_items`

**Telegram:**
- `telegram_users`, `telegram_chat_context`
- Cron: `task_reminder_cron`

### Row-Level Security

All tables use RLS with `user_id = auth.uid()` policies. Portal-scoped tables additionally filter by `portal_id`.

### Database Triggers (Gift Cards)

| Trigger | When | Action |
|---------|------|--------|
| `auto_status` | After UPDATE on `gift_cards` | Sets status based on `remaining_value` |
| `auto_remaining` | After INSERT on `gift_card_transactions` | Decrements card balance |
| `reverse` | After DELETE on `gift_card_transactions` | Restores card balance |
| `expiry_cron` | Scheduled | Marks expired cards |

---

## 15. Tech Stack

### Frontend

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| React Router | 6.30.1 | Client-side routing |
| TailwindCSS | 3.4.17 | Utility-first CSS |
| Radix UI | 40+ packages | Accessible component primitives |
| Lucide React | 0.462.0 | Icon library |
| Framer Motion | 12.35.0 | Animations |
| Recharts | 2.15.4 | Charts and visualizations |
| React Hook Form | 7.61.1 | Form management |
| Zod | 3.25.76 | Schema validation |
| TanStack React Query | 5.83.0 | Async state management |
| date-fns | 3.6.0 | Date utilities |
| Sonner | 1.7.4 | Toast notifications |
| jsPDF | 4.2.0 | PDF generation |

### Backend

| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL database, RLS, Edge Functions, Realtime |
| Vite | Dev server and bundler |

### Fonts

| Font | Weight | Use |
|------|--------|-----|
| Cormorant Garamond | 300–700 | Display headings |
| DM Sans | 300–700 | Body text |
| DM Mono | 400–500 | Code, labels |

---

## 16. File Structure

```
src/
├── main.tsx                         # App entry point
├── App.tsx                          # Router, providers, portal routes
├── index.css                        # CSS variables, glass system, animations
├── styles/
│   └── accent-colors.css            # 10 accent color themes × 2 modes
├── lib/
│   ├── supabase.ts                  # Supabase client
│   ├── supabase.types.ts            # Generated DB types
│   ├── authContext.tsx               # Mock auth with hardcoded users
│   ├── portalContext.tsx             # Static portal config
│   ├── portalContextDB.tsx           # Supabase portal bridge
│   ├── permissions.ts                # Role/permission definitions
│   ├── theme.tsx                     # Dark/light theme context
│   ├── accent.tsx                    # Accent color context
│   ├── numberFormat.tsx              # EU/US number formatting
│   ├── periodContext.tsx             # Dashboard period filter
│   ├── personalTransactionStore.ts   # Transaction localStorage
│   ├── financeCategoryStore.ts       # Category localStorage
│   ├── investmentStore.ts            # Investment localStorage
│   ├── profileStore.ts              # Profile localStorage
│   ├── vaultStore.ts                # Vault localStorage
│   ├── tasksStore.ts                # Tasks localStorage
│   ├── notesStore.ts                # Notes localStorage
│   ├── cloudStore.ts                # Cloud localStorage
│   ├── invoiceStore.ts              # Invoice localStorage
│   ├── adminStore.ts                # Audit log (in-memory)
│   └── ...                          # Other stores
├── hooks/
│   ├── useTransactions.ts            # Transaction CRUD (Supabase + fallback)
│   ├── useFinanceSummary.ts          # Aggregate finance data
│   ├── useFinancialGoals.ts          # Goals tracking
│   ├── useDashboardSubscriptions.ts  # Subscription widget
│   ├── useInvestments.ts             # Investment portfolio
│   ├── useNetWorth.ts                # Net worth calculation
│   └── useCategories.ts             # Finance categories
├── portals/
│   └── finance/
│       ├── types/
│       │   └── giftCards.ts          # Gift card TypeScript types
│       ├── services/
│       │   ├── financialData.ts      # Financial snapshot
│       │   ├── cryptoService.ts      # Crypto CRUD
│       │   ├── giftCardService.ts    # Gift card CRUD
│       │   ├── budgetStorage.ts      # Budget persistence
│       │   └── subscriptionProcessor.ts # Subscription engine
│       ├── hooks/
│       │   ├── useCryptoHoldings.ts
│       │   ├── useCryptoPortfolio.ts
│       │   ├── useCryptoPrices.ts
│       │   ├── useCryptoChart.ts
│       │   ├── useCoinSelector.ts
│       │   ├── useGiftCards.ts
│       │   ├── useGiftCardDetail.ts
│       │   ├── useGiftCardsSummary.ts
│       │   └── useBudgetData.tsx
│       └── utils/
│           ├── currency.ts           # Currency conversion
│           └── giftCardUtils.ts      # Gift card helpers
├── types/
│   ├── finance.ts                    # Personal finance types
│   ├── settings.ts                   # Settings/config types
│   └── portal-types.ts              # Portal entity types
├── components/
│   ├── AppLayout.tsx                 # Main layout shell
│   ├── AppSidebar.tsx                # Sidebar navigation
│   ├── AppHeader.tsx                 # Top bar
│   ├── PortalLayout.tsx              # Portal access wrapper
│   ├── ProtectedRoute.tsx            # Auth guard
│   ├── ErrorBoundary.tsx             # Error boundary
│   ├── NewTransactionModal.tsx       # Add transaction
│   ├── InvestmentModal.tsx           # Add investment
│   └── ui/                          # Reusable UI primitives
├── pages/
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── Budget.tsx
│   ├── Goals.tsx
│   ├── Subscriptions.tsx
│   ├── Investments.tsx
│   ├── Analytics.tsx
│   ├── Invoices.tsx
│   ├── ProfilePage.tsx
│   ├── VaultPage.tsx
│   ├── CloudPage.tsx
│   ├── TasksPage.tsx
│   ├── NotesPage.tsx
│   ├── AdministrationPage.tsx
│   ├── HubPage.tsx
│   ├── LoginPage.tsx
│   ├── crypto/
│   │   ├── CryptoPage.tsx
│   │   ├── CryptoHoldingModal.tsx
│   │   └── CryptoDeleteConfirm.tsx
│   ├── gift-cards/
│   │   ├── GiftCardsPage.tsx
│   │   ├── GiftCardModal.tsx
│   │   ├── GiftCardDetailPanel.tsx
│   │   └── GiftCardCodePopup.tsx
│   ├── social/
│   │   ├── SocialOverview.tsx
│   │   ├── SocialAccounts.tsx
│   │   ├── SocialAnalytics.tsx
│   │   ├── SocialContent.tsx
│   │   ├── SocialAudience.tsx
│   │   └── SocialCompetitors.tsx
│   └── settings/
│       ├── settingsRoutes.tsx
│       ├── SettingsLayout.tsx
│       ├── general/
│       ├── finance/
│       ├── projects/
│       ├── social/
│       ├── team/
│       └── notifications/
└── supabase/
    ├── migrations/                   # 29 SQL migration files
    └── functions/
        ├── search-crypto/            # CoinGecko search proxy
        ├── update-crypto-prices/     # Price update cron
        └── ...                       # Other edge functions
```

---

**End of documentation.**
