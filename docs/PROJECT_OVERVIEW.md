# SOSA INC — Project Overview

> **One-line description.** SOSA INC is a brutalist multi-portal SaaS that unifies personal/business finance, project & task management, encrypted credential storage, cloud files, content publishing, social analytics, B2B lead generation, and inventory tracking into a single role-gated workspace per organization.

This document is the **single source of truth** for what the tool does, how it is built, and where every feature lives. Keep it in sync when shipping new modules or refactors.

---

## Table of contents

1. [Mission & product goal](#1-mission--product-goal)
2. [User personas](#2-user-personas)
3. [The four portals](#3-the-four-portals)
4. [Top-level architecture](#4-top-level-architecture)
5. [Tech stack](#5-tech-stack)
6. [Routing map](#6-routing-map)
7. [Authentication & permissions](#7-authentication--permissions)
8. [Storage policy — what lives where](#8-storage-policy--what-lives-where)
9. [Database schema](#9-database-schema)
10. [RLS pattern](#10-rls-pattern)
11. [Modules in detail](#11-modules-in-detail)
12. [Settings section](#12-settings-section)
13. [Edge functions](#13-edge-functions)
14. [Hooks reference](#14-hooks-reference)
15. [Services reference](#15-services-reference)
16. [Design system](#16-design-system)
17. [Realtime](#17-realtime)
18. [Internationalization](#18-internationalization)
19. [PWA & offline](#19-pwa--offline)
20. [Local development](#20-local-development)
21. [Conventions](#21-conventions)
22. [Known gaps & roadmap](#22-known-gaps--roadmap)

---

## 1. Mission & product goal

### The problem

Small ops teams (2–20 people) running several brands or business units glue together six to ten SaaS products to run their day: a finance app, a task tracker, a password manager, a file vault, a social scheduler, a CRM, a leads tool, a stock tracker. Each one bills separately, has its own login, its own permissions, its own export format, and none of them talk to each other.

### The product

SOSA INC collapses that stack into a single brutalist workspace where every business unit ("portal") gets its own scoped instance of the same toolset:

- **Finance & accounting** — personal and business transactions, budgets, monthly recaps, goals, recurring subscriptions, crypto, gift cards, exchange-rate aware analytics.
- **Operations** — Linear-style tasks with projects, milestones, comments; markdown notes with folders; cloud file storage; encrypted vault for credentials and documents; physical/digital inventory.
- **Growth** — social-media analytics & content publishing across Instagram, TikTok, LinkedIn, Twitter, Facebook, YouTube; B2B lead generation via Google Maps scraping with outreach tracking.
- **Administration** — portal members, roles (owner/admin/member/viewer), audit log, portal-level password lock, per-portal appearance/accent.

### Design principles

1. **Portal isolation by default** — every query is scoped by `portal_id`. RLS enforces it server-side.
2. **One UI for four brands** — KEYLOW, REDX, TRUST ME, and SOSA INC share the same routes; the only differences are accent color and disabled features.
3. **Brutalist visual identity** — sharp corners, monospace UI for labels, neon-yellow `#d4ff00` accents, grain overlay, corner brackets. No rounded cards, no shadows by default.
4. **Supabase-first storage** — business data goes to Postgres / Storage; only UI preferences live in localStorage.
5. **Italian-first UX, English-first code** — every label users see is Italian; every identifier, comment, and commit message is English.
6. **Role gating at the route** — the Settings and Administration sections are blocked by `AdminRoute` (owner / admin only).

### Who it is for

Founders running multi-brand operations who want a defensible single source of truth instead of paying for SaaS sprawl and re-keying data across tools.

---

## 2. User personas

| Role | Can read | Can write | Can manage portal |
|------|----------|-----------|-------------------|
| **owner** | everything in their portals | everything in their portals | yes (members, settings, billing) |
| **admin** | everything in their portals | everything except billing | yes (members, settings) |
| **member** | most data in their portals | own work (notes, tasks assigned to them) | no |
| **viewer** | most data in read-only mode | none | no |

Permissions live in [src/lib/permissions.ts](src/lib/permissions.ts) and are evaluated by `usePermission(scope)`. The `AdminRoute` route guard and the `AccessDenied` UI both consume this.

---

## 3. The four portals

All portals share the same routes and page components. Per-portal differences live in [src/lib/portalContext.tsx](src/lib/portalContext.tsx) and the `data-portal` attribute on `<html>` (which flips the CSS accent variables).

| Slug | Brand | Accent | Focus | Disabled |
|------|-------|--------|-------|----------|
| `sosa` | SOSA INC. | `#4A9EFF` (blue) | Corporate ops, holding-company finance | social |
| `keylo` | KEYLOW | `#2ECC71` (green) | Access control / security hub | — |
| `redx` | REDX | `#FF5A5A` (red) | Growth ops, leadgen, outreach | inventory, crypto, gift-cards |
| `trustme` | TRUST ME | `#FF9F43` (orange) | Compliance, legal, trust | — |

The list of "disabled features per portal" is encoded so a portal can hide irrelevant modules in the sidebar but every database table is still scoped by `portal_id` regardless.

---

## 4. Top-level architecture

```
+--------------------------------------+
|  React 18 + Vite + TS frontend       |
|  (Tailwind, Radix, Framer, Recharts) |
+------------------+-------------------+
                   |
                   | supabase-js v2
                   v
+--------------------------------------+
|  Supabase (Postgres + Auth + Edge)   |
|  - RLS scoped by portal_id           |
|  - 50+ migrations                    |
|  - 13 edge functions                 |
|  - Storage buckets: vault-files,     |
|    inventory-files                   |
+------------------+-------------------+
                   |
        +----------+----------+
        |                     |
        v                     v
   CoinGecko             Telegram bot
   (crypto prices)       (task briefings)
        |
        v
   Google Maps / Apify
   (leadgen scraping)
        |
        v
   Social platform APIs
   (Meta, TikTok, LinkedIn, ...)
```

### Provider tree (top-down, [src/App.tsx](src/App.tsx))

```
QueryClientProvider              ← @tanstack/react-query
  ThemeProvider                  ← dark/light, persisted to localStorage
    AccentProvider               ← per-portal accent + appearance_settings table
      NumberFormatProvider       ← EU/US number format
        AuthProvider             ← Supabase session
          PortalDBProvider       ← currentPortalId, isOwner, isAdmin, loadingRole
            PortalProvider       ← legacy portal context (slug-based)
              PeriodProvider     ← dashboard period filter
                <Routes />
```

Always use `usePortalDB()` (not `usePortal()`) for permissions and `currentPortalId`. The legacy `usePortal()` still exists for slug-based UI flips and is kept as a transition layer.

---

## 5. Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Build | Vite 5 | Port 8080 in dev |
| UI | React 18 + TypeScript 5 | Strict null checks off project-wide |
| Styling | Tailwind 3 + CSS variables | Per-portal `data-portal` attribute |
| Components | Radix UI primitives + custom brutalist primitives | shadcn-style copy-in-repo |
| Animation | Framer Motion 12 | Light usage, respect `prefers-reduced-motion` |
| Charts | Recharts 2 | Custom glass tooltips |
| Forms | react-hook-form + zod | Validation at service boundary |
| State | React Query 5 + Context | No Redux |
| DB / Auth / Storage / Edge | Supabase 2 | Project ID `ndudzfaisulnmbpnvkwo` |
| Realtime | Supabase channels | `postgres_changes` + custom `BroadcastChannel` events |
| Toasts | Sonner 1.7 | Italian copy |
| PDF | jsPDF 4.2 | Vault export, finance recap |
| Icons | lucide-react | No emoji in code/UI |
| i18n | Custom mini-i18n | Not react-i18next |
| Tests | Vitest 3 + React Testing Library | `npm test`, `npm run test:watch` |

---

## 6. Routing map

All routes inside `/:portalId/*` go through [PortalLayout](src/components/PortalLayout.tsx) which fixes the sidebar, header, and command bar. Settings and Administration are wrapped by [AdminRoute](src/components/AdminRoute.tsx) and require `role IN ('owner','admin')`.

### Public (unauthenticated)

| Path | Component |
|------|-----------|
| `/login` | [LoginPage](src/pages/LoginPage.tsx) |
| `/forgot-password` | ForgotPasswordPage (lazy) |
| `/reset-password` | ResetPasswordPage (lazy) |
| `/oauth/callback` | [OAuthCallback](src/pages/social/OAuthCallback.tsx) (lazy) |

### Protected (require Supabase session)

| Path | Component |
|------|-----------|
| `/` | redirects to `/hub` |
| `/hub` | [HubPage](src/pages/HubPage.tsx) — portal selector |

### Portal-scoped (`/:portalId/...`)

#### Finance

| Path | Component |
|------|-----------|
| `dashboard` | [Dashboard](src/pages/dashboard/Dashboard.tsx) |
| `costs` | [Budget](src/pages/Budget.tsx) |
| `transactions` | [Transactions](src/pages/Transactions.tsx) |
| `pl-rules` | [Goals](src/pages/Goals.tsx) |
| `channels` | [Subscriptions](src/pages/Subscriptions.tsx) |
| `analytics` | [Analytics](src/pages/Analytics.tsx) |
| `recap` | [Recap](src/pages/Recap.tsx) |
| `invoices` | [Invoices](src/pages/Invoices.tsx) (placeholder Q3 2026) |
| `crypto` | [CryptoPage](src/pages/crypto/CryptoPage.tsx) |
| `gift-cards` | [GiftCardsPage](src/pages/gift-cards/GiftCardsPage.tsx) |

#### Operations

| Path | Component |
|------|-----------|
| `vault` | [VaultPage](src/pages/VaultPage.tsx) |
| `cloud` | [CloudPage](src/pages/cloud/CloudPage.tsx) |
| `tasks` | [TasksPage](src/pages/TasksPage.tsx) |
| `notes` | [NotesPage](src/pages/NotesPage.tsx) |
| `inventory` | [InventoryPage](src/pages/InventoryPage.tsx) |
| `profile` | [ProfilePage](src/pages/ProfilePage.tsx) |
| `profile/:userId` | [ProfilePage](src/pages/ProfilePage.tsx) (view other user) |

#### Social (`/:portalId/social/...`)

| Path | Component |
|------|-----------|
| `overview` | [SocialOverview](src/pages/social/SocialOverview.tsx) |
| `accounts` | [SocialAccounts](src/pages/social/SocialAccounts.tsx) |
| `analytics` | [SocialAnalytics](src/pages/social/SocialAnalytics.tsx) |
| `content` | [SocialContent](src/pages/social/SocialContent.tsx) |
| `audience` | [SocialAudience](src/pages/social/SocialAudience.tsx) |
| `competitors` | [SocialCompetitors](src/pages/social/SocialCompetitors.tsx) |

#### Leadgen (REDX-only, lazy) — `/:portalId/leadgen/...`

| Path | Component |
|------|-----------|
| `dashboard` | LeadgenDashboard |
| `overview` | LeadgenOverview |
| `leads` | LeadgenAllLeads |
| `lead/:id` | LeadgenLeadDetail |
| `search` | LeadgenSearch |
| `searches` | LeadgenSearchHistory |

#### Administration (admin-only)

| Path | Component |
|------|-----------|
| `admin` | [AdministrationPage](src/pages/AdministrationPage.tsx) |
| `settings/*` | [SettingsRoutes](src/pages/settings/settingsRoutes.tsx) — see §12 |

#### Fallback

| Path | Component |
|------|-----------|
| `*` | NotFound |

---

## 7. Authentication & permissions

### Auth flow

1. User visits `/login`. [LoginPage](src/pages/LoginPage.tsx) calls `supabase.auth.signInWithPassword`.
2. On success, [AuthProvider](src/lib/authContext.tsx) hydrates the session.
3. [PortalDBProvider](src/lib/portalContextDB.tsx) queries `portal_members` for every row where `user_id = auth.uid()`, hydrating `portals`, `currentPortalId`, `userRole`.
4. `<ProtectedRoute>` redirects to `/login` if no session.
5. `<AdminRoute>` redirects to `/<portalId>/dashboard` if the user is not `owner` / `admin` — but only **after `loadingRole && loadingPortals` resolve**, so a freshly logged-in user is never spuriously kicked out (race condition fixed in commit `beb8be6`).

### Source of truth for role

Always use `usePortalDB()`. The role from `useAuth().user.role` is the JWT cache set at login time and can be stale across portal switches.

```ts
const { isOwner, isAdmin, currentPortalId, userRole, loadingRole } = usePortalDB();
```

### OAuth (social platforms)

The `social-oauth` edge function exposes two actions:

- `GET ?action=auth_url&platform=X&portal_id=Y` → returns a signed OAuth URL. State is an HMAC-SHA256-signed base64 JSON payload (`{portal_id, user_id, platform, exp, nonce}`). No DB round-trip needed for CSRF — the state is self-contained.
- `POST ?action=callback&platform=X` → verifies the signed state, ensures `state.user_id === jwt.userId`, exchanges the code with the platform, upserts into `social_connections` with `portal_id` from the **verified** state (never from the client body).

Callback page: [OAuthCallback](src/pages/social/OAuthCallback.tsx). It postMessages the result back to the opener window — no `popup.closed` polling (which would false-positive on user abort).

---

## 8. Storage policy — what lives where

After the May 2026 LS→Supabase refactor (commits `79bc0ef..a75d63b`), the rule is:

### localStorage (UI preferences only)

| Key | Purpose |
|-----|---------|
| `theme` | dark / light |
| `SOSA INC-accent` | accent color override |
| `SOSA INC_density` | compact / comfortable UI density |
| `numberFormat` | EU (`1.234,56`) vs US (`1,234.56`) |
| `primaryCurrency` | EUR / USD display |
| `dashboardPeriod`, `dashboardCustomRange` | current dashboard filter |
| `portal_last_accessed_*` | last-accessed portal per user |
| `cloud_collapsed_sections` | sidebar collapse state for cloud |
| `SOSA INC_profile_*`, `SOSA INC_avatar_*`, `SOSA INC_banner_*` | profile UI cache |
| `app_reset_version` | one-shot reset gate |
| `leadgen_country_favs` | favorite country chips on leadgen search |

### sessionStorage (ephemeral session flags)

| Key | Purpose |
|-----|---------|
| `vault_locked_unlocked` | vault unlock flag for current session |
| `cloud_unlock_*` | per-folder cloud unlock for current session |

### Supabase (everything else)

| Domain | Tables |
|--------|--------|
| Finance | `personal_transactions`, `subscriptions`, `subscription_transactions`, `financial_goals`, `investments`, `budget_limits`, `finance_transaction_categories`, `crypto_holdings`, `crypto_prices`, `crypto_price_history`, `gift_cards`, `gift_card_brands`, `gift_card_transactions` |
| Operations | `tasks`, `projects`, `task_comments`, `project_milestones`, `notes`, `note_folders`, `vault_items`, `vault_item_history`, `vault_files`, `cloud_folders`, `cloud_files`, `inventory_items`, `inventory_attachments` |
| Social | `social_connections`, `social_posts`, `social_analytics_snapshots`, `social_publishing_rules`, `hashtag_sets`, `content_categories`, `caption_templates` |
| Leadgen | `leadgen_settings`, `leadgen_searches`, `leadgen_leads`, `leadgen_lead_notes`, `leadgen_outreach_events`, `leadgen_blacklist`, `leadgen_members` |
| Admin | `audit_log`, `roles`, `role_permissions`, `departments`, `notification_channels`, `alert_rules` |
| Portal config | `portals`, `portal_members`, `portal_settings`, `portal_security`, `portal_profiles`, `appearance_settings` |
| Users | `user_profiles`, `user_preferences` |

### Two pages still pending migration

`NotesPage.tsx` (1095 LOC) and `CloudPage.tsx` (2075 LOC) currently store data in localStorage. They have full Supabase services ([notesService](src/lib/services/notesService.ts), [cloudService](src/lib/services/cloudService.ts)) ready to use, but the pages have not been wired to them yet. Migration blockers:

- **Notes** — `note_folders` table is missing a `parent_id` column for nested folders.
- **Cloud** — `cloud_folders` schema and the page's nested folder model do not align 1:1.

Both pages keep their existing localStorage behavior until a follow-up PR migrates them.

---

## 9. Database schema

The full SQL is in [supabase/migrations/](supabase/migrations/). TypeScript types live in [src/types/database.ts](src/types/database.ts). High-level grouping:

### Portals & users

- **`portals`** — id, name, slug, owner_id, logo_url, color
- **`portal_members`** — `(user_id, portal_id, role)`. Source of truth for "who can do what where."
- **`portal_settings`** — singleton per portal, JSONB `settings` (e.g. `total_budget_eur`)
- **`portal_profiles`** — per-portal display info (logo, name override)
- **`portal_security`** — portal-level password hash for the lock screen
- **`appearance_settings`** — accent color overrides
- **`user_profiles`** — display_name, bio, phone, timezone, avatar_url, social_links
- **`user_preferences`** — theme, accent, number format, density, language, dashboard period (per-user)

### Finance

- **`personal_transactions`** — `(portal_id, user_id, type, amount, currency, category, category_id, description, date, payment_method, is_recurring, recurring_interval, tags, receipt_url, cost_classification)`
- **`subscriptions`** — `(portal_id, user_id, name, amount, currency, category, billing_cycle, billing_day, start_date, next_billing_date, is_active, status, color, icon, account_id, deleted_at)`
- **`subscription_transactions`** — billing-event ledger; UNIQUE `(subscription_id, billing_date)` prevents duplicates
- **`financial_goals`** — `(portal_id, name, target, saved, deadline, category, color, emoji, is_achieved)`
- **`investments`** — `(portal_id, user_id, name, ticker, type, units, avg_buy_price, current_price, currency, color, emoji, notes)`
- **`budget_limits`** — `(portal_id, category, year_month, monthly_limit)` UNIQUE per `(portal_id, category, year_month)`
- **`finance_transaction_categories`** — `(portal_id, name, slug, type, color, icon, sort_order, is_default, is_active)` where `type IN ('revenue','cogs','opex','other','expense','income','business')`
- **`crypto_holdings`** — `(portal_id, user_id, coin_id, symbol, name, quantity, avg_buy_price_eur, notes)`
- **`crypto_prices`** — CoinGecko cache, refreshed by cron
- **`crypto_price_history`** — sparse history for charts
- **`gift_cards`** — `(portal_id, brand, brand_key, card_code, pin, initial_value, remaining_value, currency, purchase_date, expiry_date, status, notes, is_favorite)`
- **`gift_card_brands`** — catalog with logo, color, category, default_currency, has_expiry, is_popular
- **`gift_card_transactions`** — redemption ledger; triggers update `gift_cards.remaining_value`

### Operations

- **`tasks`** — Linear-style: id, portal_id, project_id, parent_id, title, description, status, priority, assignee_id, creator_id, labels, due_date, estimate
- **`projects`** — id, portal_id, name, status, color, emoji, milestones array
- **`task_comments`** — task-scoped thread
- **`project_milestones`** — milestone tracker
- **`notes`** — `(portal_id, user_id, folder_id, title, content, tags, is_pinned, is_archived, color)`
- **`note_folders`** — `(portal_id, user_id, name, color, icon, sort_order)` *(missing `parent_id` — see §22)*
- **`vault_items`** — `(portal_id, user_id, type, name, category, encrypted_data, is_locked, is_favorite, tags, expires_at, last_accessed_at)` where `type IN ('credential','api_key','document','note','card')`
- **`vault_item_history`** — append-only audit (created / updated / accessed / deleted / restored / shared)
- **`vault_files`** — metadata for Supabase Storage bucket `vault-files`
- **`cloud_folders`** — hierarchical folders with permissions and password lock
- **`cloud_files`** — metadata for iDrive e2 S3 storage; soft-delete with retention
- **`inventory_items`** — physical/digital stock with platform (Vestiaire / Depop / Vinted / Wallapop / eBay / Shopify)
- **`inventory_attachments`** — file references for inventory items

### Social

- **`social_connections`** — `(portal_id, user_id, connected_by, platform, account_handle, account_name, account_avatar_url, access_token, refresh_token, token_expires_at, is_active, connected_at, last_synced_at)`
- **`social_posts`** — drafts / scheduled / published with metrics
- **`social_analytics_snapshots`** — per-platform daily snapshots (followers, engagement, impressions, reach)
- **`social_publishing_rules`** — auto-publish rules
- **`hashtag_sets`** — reusable hashtag bundles
- **`content_categories`** — content tagging
- **`caption_templates`** — reusable captions

### Leadgen

- **`leadgen_settings`** — per-portal Apify token, actor id, scrape defaults
- **`leadgen_searches`** — `(portal_id, status, apify_run_id, country, categories, target_count, result_count, error_message)`
- **`leadgen_leads`** — scraped business record `(portal_id, place_id, name, address, phone, website, has_website, category, city, rating, reviews_count, emails, outreach_status, assigned_to, assigned_at, last_activity_at)`
- **`leadgen_lead_notes`** — per-lead notes
- **`leadgen_outreach_events`** — interaction log `(channel: email|call|chat, direction: inbound|outbound, occurred_at, notes)`
- **`leadgen_blacklist`** — exclusion rules `(pattern_type: email|domain|phone|postal_code, pattern, is_active)`
- **`leadgen_members`** — team assignment with outreach quota and auto-release config

### Admin

- **`audit_log`** — `(portal_id, user_id, action, category, entity_type, entity_id, details, severity, ip_address, created_at)`
- **`roles`**, **`role_permissions`**, **`portal_member_roles`** — granular permissions scaffold
- **`departments`** — org structure
- **`notification_channels`** — Slack / email / in-app
- **`alert_rules`** — trigger config
- **`notification_queue`** — async delivery pipeline (scaffold)

### Tables scoped to a specific portal (legacy ICONOFF schema)

Tables prefixed `sosa_*`, `keylo_*`, `redx_*`, `trustme_*` exist from an earlier per-portal-schema design (migrations `20260319000001..004`). Newer features (May 2026 onwards) all use the shared portal_id pattern. The prefixed tables are still referenced by some legacy code paths but new development should use the shared tables.

---

## 10. RLS pattern

Every user-data table follows the same pattern, anchored on `portal_members`:

```sql
-- SELECT: any portal member can read
CREATE POLICY "<table>_select" ON public.<table>
  FOR SELECT TO authenticated
  USING (
    portal_id IN (
      SELECT portal_id FROM public.portal_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE: owner or admin only
CREATE POLICY "<table>_manage" ON public.<table>
  FOR ALL TO authenticated
  USING (
    portal_id IN (
      SELECT portal_id FROM public.portal_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );
```

The `portal_members` self-reference uses a `SECURITY DEFINER` helper (`get_my_portal_ids()`) to avoid infinite recursion — see migration `20260315000009_fix_rls_recursion.sql` and the May 2026 revert in commit `fa2adab`.

For edge functions that need to bypass RLS (e.g. user provisioning, audit log writes), the function instantiates a `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}})` admin client and never trusts user-provided `portal_id` — it always re-derives it from the JWT.

---

## 11. Modules in detail

### 11.1 Dashboard

[src/pages/dashboard/Dashboard.tsx](src/pages/dashboard/Dashboard.tsx)

Single landing page after login. Renders KPI cards, revenue trend chart, recent transactions, subscription overview, goals progress, crypto snapshot. Data flows from `useNetWorth()` which combines:

- `personal_transactions` (income / expense)
- `subscriptions` (monthly cost normalized)
- `investments.current_price × units` (EUR-converted)
- `crypto_holdings × crypto_prices` (EUR-converted)
- `gift_cards.remaining_value` (EUR-converted)

Period filter persists to localStorage via `PeriodProvider`.

### 11.2 Budget

[src/pages/Budget.tsx](src/pages/Budget.tsx)

Per-category monthly limit manager. State:

- **Limits** — `budget_limits` rows keyed by `(portal_id, category, year_month)`.
- **Total budget** — stored in `portal_settings.settings.total_budget_eur` (JSONB).
- **Spent** — derived live from `personal_transactions WHERE type='expense' AND date BETWEEN month_start AND month_end`.

Categories come from [useCategories](src/hooks/useCategories.ts) (income/expense) plus, for business portals, `finance_transaction_categories` with type IN `('cogs','opex')`.

### 11.3 Transactions

[src/pages/Transactions.tsx](src/pages/Transactions.tsx) + [useTransactions](src/hooks/useTransactions.ts)

Paged list (20 per page, 2000 max) with filters: type, category, costClassification, categoryId, dateFrom/To, minAmount/maxAmount, full-text search on description / category. CRUD goes through Supabase only; `broadcastFinanceUpdate` notifies the Dashboard and Budget pages to refetch.

`cost_classification` constraint:

- `income` rows must have `cost_classification = null`
- `expense` rows must have `cost_classification IN ('cogs','opex')` if set

### 11.4 Goals

[src/pages/Goals.tsx](src/pages/Goals.tsx) + [useFinancialGoals](src/hooks/useFinancialGoals.ts)

`financial_goals` with realtime subscription via `useRealtimeTable<DbFinancialGoal>`. Each goal has a target, optional deadline, category, color, emoji. Saved progress is read live from net-worth integration (migration `20260409000001`).

### 11.5 Subscriptions

[src/pages/Subscriptions.tsx](src/pages/Subscriptions.tsx) + [useSubscriptions](src/hooks/useSubscriptions.ts)

Recurring expense manager. Billing cycles: `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`. The processor ([useSubscriptionProcessor](src/portals/finance/hooks/useSubscriptionProcessor.ts)) runs once per page mount and catches up every overdue billing cycle, inserting one `personal_transactions` row per cycle plus a `subscription_transactions` ledger row. The DB UNIQUE on `(subscription_id, billing_date)` prevents duplicates across tabs / devices.

### 11.6 Analytics

[src/pages/Analytics.tsx](src/pages/Analytics.tsx)

Income vs expense over time, category breakdown, top spend categories, biggest transactions. Backed by `useFinanceSummary(dateRange)` which queries `personal_transactions` aggregated client-side.

### 11.7 Recap

[src/pages/Recap.tsx](src/pages/Recap.tsx)

Month-over-month and year-over-year delta analysis with goal hit rate. Exports a PDF via jsPDF.

### 11.8 Crypto

[src/pages/crypto/CryptoPage.tsx](src/pages/crypto/CryptoPage.tsx)

Portfolio of `crypto_holdings`. Prices come from `crypto_prices` (Supabase cache; refreshed every 15 min by `update-crypto-prices` cron) with a CoinGecko fallback in [cryptoService.ts](src/portals/finance/services/cryptoService.ts). Buy/sell actions record a `personal_transactions` row with `category='Crypto'` and tag `[symbol]`, so they appear in the global transactions list. The detail popup's tx history is now derived from `personal_transactions` filtered by tag — no localStorage.

### 11.9 Gift cards

[src/pages/gift-cards/GiftCardsPage.tsx](src/pages/gift-cards/GiftCardsPage.tsx)

`gift_cards` (per portal) keyed by `brand_key`. A hardcoded `SEED_BRANDS` catalog (33 entries) in [giftCardService.ts](src/portals/finance/services/giftCardService.ts) is used as fallback when `gift_card_brands` is empty. Transactions debit `remaining_value` via DB trigger.

### 11.10 Vault

[src/pages/VaultPage.tsx](src/pages/VaultPage.tsx)

Encrypted storage for five item types: `credential`, `api_key`, `document`, `note`, `card`. Items live in `vault_items.encrypted_data` (JSON). The page also has a **Locked Folder** sub-section gated by a portal-level password (`portal_security.password_hash`, SHA-256) with five-attempt lockout, ten-minute auto-lock, and an optional "remember for this session" toggle stored in sessionStorage.

#### PDF export

The "Esporta PDF" button (commit `291a5b7`, refined in next session) generates a categorized PDF of the entire vault. Sections: Login Credentials (blue), API Keys (amber), Documents & Notes (red), Locked Items (gray). Each card shows a prominent "RELATED TO" row (URL for credentials, Service for API keys) plus full unmasked details — designed for printing as a physical backup.

#### File uploads

A separate Files tab uses Supabase Storage bucket `vault-files` (private, 50 MB / file) via [vaultFileService.ts](src/lib/services/vaultFileService.ts).

### 11.11 Cloud

[src/pages/cloud/CloudPage.tsx](src/pages/cloud/CloudPage.tsx)

Hierarchical folders with per-folder permissions (`view` / `edit` / `admin`), optional password lock and timed unlock window, soft-delete to a Trash view with retention. Files live in iDrive e2 S3 with metadata in `cloud_files`; signed URLs are generated by the `cloud-presign` edge function. *Page is pending full migration off localStorage; see §22.*

### 11.12 Tasks

[src/pages/TasksPage.tsx](src/pages/TasksPage.tsx)

Linear-style issue tracker. Top-level entities: `projects` (with milestones), `tasks` (with sub-tasks via `parent_id`), `task_comments`. Statuses: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`. Priorities: `none`, `urgent`, `high`, `medium`, `low`. View modes: list (grouped by status / priority / assignee / project) or board (Kanban). Keyboard shortcut: <kbd>C</kbd> opens "new issue".

Data loads via `loadTasksFromSupabase` / `loadProjectsFromSupabase` ([src/lib/taskSync.ts](src/lib/taskSync.ts)). Mutations call `upsertTask` / `deleteTask` against Supabase. `ProfileTasksCard` listens to a `SOSA INC:tasks-changed` window event and re-fetches.

### 11.13 Notes

[src/pages/NotesPage.tsx](src/pages/NotesPage.tsx)

Markdown notes with folders, pinning, archiving, tag presets, drag-and-drop between folders, Telegram-sourced notes. Currently localStorage-only; see §22 for migration plan.

### 11.14 Inventory

[src/pages/InventoryPage.tsx](src/pages/InventoryPage.tsx) + [useInventory](src/hooks/useInventory.ts)

Physical / digital stock tracker. Per-item: name, brand, category, size, condition (`new` / `excellent` / `good` / `fair` / `poor`), purchase price, listing price, sale price, sku, status (`in_stock` / `listed` / `sold` / `shipped` / `returned`), platform (Vestiaire, Depop, Vinted, Wallapop, eBay, Shopify, other), photos, description, amount, item_value. Attachments live in Supabase Storage bucket `inventory-files`.

### 11.15 Social

[src/pages/social/*](src/pages/social/)

Connect platforms via OAuth (see §7), then track posts, audience, analytics, competitors. Currently `sync-social-analytics` returns Phase-1 mock data; real platform-graph integration is planned. Posts can be drafted, scheduled, or published from the Content page.

Supported platforms: Instagram, Facebook, TikTok, YouTube (Google OAuth), LinkedIn, Twitter, Threads (planned), Pinterest (planned).

### 11.16 Leadgen (REDX-only)

[src/pages/leadgen/*](src/pages/leadgen/)

B2B lead generation via Apify + Google Maps scraping. Workflow:

1. **Search** — operator picks country, categories, target count. The search row goes into `leadgen_searches` with `status='running'`; an Apify actor scrapes Google Maps.
2. **Results** — each business becomes a `leadgen_leads` row with `place_id` (UNIQUE per portal), name, address, phone, website, has_website, category, city, rating, reviews_count, emails (array).
3. **Outreach** — leads are assigned to team members (`leadgen_members.outreach_quota`), worked through, and tracked via `leadgen_outreach_events` (channel × direction).
4. **Auto-release** — `useAutoRelease` releases assignments idle for 14 days back to the unassigned pool and emits a per-user notification.
5. **Blacklist** — pattern-based exclusion (`email`, `domain`, `phone`, `postal_code`).

Outreach statuses: `new`, `contacted`, `replied`, `qualified`, `converted`, `rejected`, `archived`.

### 11.17 Administration

[src/pages/AdministrationPage.tsx](src/pages/AdministrationPage.tsx)

Admin-only. Three tabs:

- **Members** — invite (via `invite-member`), change role, remove (via `list-members` + `portal_members` mutations).
- **Audit log** — live in-memory feed plus the persistent `audit_log` table via [auditLogService](src/lib/services/auditLogService.ts).
- **Company / security** — non-functional placeholders for now; the real config lives under Settings.

### 11.18 Profile

[src/pages/ProfilePage.tsx](src/pages/ProfilePage.tsx)

Per-user page with avatar, banner, bio, role badge, social-link badges, assigned-tasks board (via [ProfileTasksCard](src/components/profile/ProfileTasksCard.tsx)), recent audit entries. Editable when `userId === me.id`.

---

## 12. Settings section

All under `/:portalId/settings/*`, all gated by `AdminRoute`. Settings pages share a common toolkit ([src/components/settings/](src/components/settings/)):

- `SettingsPageHeader` — title + optional `+ Add` button
- `SettingsCard` — glass-card wrapper (`title`, `description`, `danger` prop)
- `SettingsTable<T>` — CRUD list with loading skeleton, empty state, count footer
- `SettingsModal` — create / edit modal with `Annulla` + `Salva`
- `SettingsDeleteConfirm` — red destruction modal
- `SettingsFormField` — label + error + helper text
- `SettingsColorPicker` — 12 presets + custom hex
- `SettingsToggle` — on / off

Pattern for every list-based page:

```ts
const { data, loading, create, update, remove } = useXxx();
const [errors, setErrors] = useState<Record<string, string>>({});
```

### General

| Path | Page |
|------|------|
| `general/profile` | PortalProfile (portal name, country, timezone) |
| `general/aspetto` | Appearance (theme, accent color) |
| `general/accesso` | PortalAccess (MFA, sessions, password) |

### Finance

| Path | Page |
|------|------|
| `finance/categorie-entrate` | IncomeCategories |
| `finance/categorie-uscite` | ExpenseCategories |
| `finance/categorie-abbonamenti` | SubscriptionCategories |
| `finance/metodi-pagamento` | PaymentMethods |
| `finance/regole-ricorrenze` | RecurrenceRules |
| `finance/valute-tasse` | CurrencyTax |
| `finance/categorie-transazioni` | TransactionCategories |

### Projects

| Path | Page |
|------|------|
| `progetti/stati` | ProjectStatuses |
| `progetti/priorita-label` | PrioritiesLabels |
| `progetti/template-task` | TaskTemplates |

### Social

| Path | Page |
|------|------|
| `social/account-collegati` | SocialAccountsSettings |
| `social/regole-pubblicazione` | PublishingRules |
| `social/categorie-contenuti` | ContentCategories |

### Team

| Path | Page |
|------|------|
| `team/membri` | Members |
| `team/dipartimenti` | Departments |
| `team/ruoli-permessi` | RolesPermissions |

### Notifications

| Path | Page |
|------|------|
| `notifiche/canali` | NotificationChannels |
| `notifiche/regole-alert` | AlertRules |

### Leadgen (REDX-only)

| Path | Page |
|------|------|
| `leadgen/impostazioni` | LeadgenSettings |
| `leadgen/team` | TeamManagement |

### Danger zone

| Path | Page |
|------|------|
| `danger-zone` | DangerZone (delete portal, reset, export) |

---

## 13. Edge functions

All live in [supabase/functions/](supabase/functions/). Each has its own `index.ts` and gets deployed independently.

| Function | Verbs | Auth | What it does |
|----------|-------|------|--------------|
| `admin-list-users` | GET | admin / owner | Returns all auth users that are members of the 4 main portals, with their assignments. |
| `cloud-presign` | POST | portal member | Generates a 1h signed URL for iDrive e2 S3 file download. Requires `IDRIVE_E2_*` secrets. |
| `create-member` | POST | portal owner | Provisions an auth user via `supabase.auth.admin.createUser` and inserts the `portal_members` row in one call. |
| `invite-member` | POST | portal admin / owner | Sends an invite email (Supabase Auth) and pre-creates the `portal_members` row with the requested role. |
| `list-members` | GET | portal member | Fetches `portal_members` joined with `auth.users.email` (via service-role admin client) so members can be displayed in the UI without exposing other users' emails to the regular API. |
| `process-subscriptions` | POST | cron / service role | Cycles through all 4 portals and runs `processAllDueSubscriptions` (mirrors what `useSubscriptionProcessor` does on client mount, for users who do not log in every day). |
| `search-crypto` | GET | portal member | CoinGecko proxy with caching (avoids exposing the rate-limited free-tier API to the client). |
| `social-oauth` | GET / POST | portal admin / owner | HMAC-signed-state OAuth flow. See §7. |
| `sync-social-analytics` | POST | portal member | Phase-1: generates mock analytics. Phase-2 plan: hit each platform's graph API using the stored OAuth token, write to `social_analytics_snapshots`. |
| `task-reminder` | POST | cron | Daily Telegram briefing — picks tasks due today / overdue and pings each user via the Telegram bot. |
| `telegram-webhook` | POST | webhook secret | Receives messages from the Telegram bot (`/note`, `/task`, …). |
| `update-crypto-prices` | POST | cron | Polls CoinGecko, upserts `crypto_prices`, writes daily samples to `crypto_price_history`. |

### Shared utilities

`supabase/functions/_shared/rateLimit.ts` exports `checkRateLimit(req, limit, windowMs)` and `verifyJWT(req)`. The OAuth function uses both.

### Required secrets

Set per environment in the Supabase dashboard (Settings → Edge Functions → Secrets):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (built-in)
- `OAUTH_STATE_SECRET` — HMAC key for the OAuth state. If missing, falls back to `SUPABASE_JWT_SECRET`.
- `FRONTEND_URL` — exact origin used to build OAuth redirect URIs and to whitelist CORS origins.
- `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET`
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`
- `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (for YouTube)
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`
- `IDRIVE_E2_ACCESS_KEY`, `IDRIVE_E2_SECRET_KEY`, `IDRIVE_E2_ENDPOINT`, `IDRIVE_E2_BUCKET`
- `APIFY_TOKEN` (per portal — stored in `leadgen_settings`)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`

---

## 14. Hooks reference

### Core (src/hooks/)

| Hook | Purpose |
|------|---------|
| `use-mobile` | breakpoint detection |
| `use-toast` | sonner integration |
| `useNetWorth` | combined KPI: income − expenses − subscriptions + investments + crypto + gift cards |
| `useKeyboardShortcuts` | global hotkeys (Esc closes modals) |
| `usePortalData<T>(table, opts)` | generic portal-scoped list with auto-refetch on portal switch |
| `useDebounce` | standard |
| `useCloudFiles` | iDrive e2 file CRUD |
| `usePortalMembers` | members + invite / change role / remove |
| `useSubscriptions` | `subscriptions` CRUD |
| `useFinanceCategories` | business categories (revenue / cogs / opex / other) |
| `useFinancialGoals` | goals with realtime |
| `useFinanceSummary` | aggregate transactions by period |
| `useDashboardSubscriptions` | dashboard sub summary |
| `useCategories` | income / expense categories with hardcoded-defaults fallback |
| `useTransactions` | transactions with filters + pagination |
| `useInvestments` | investments with realtime + current-value math |
| `useDashboardTransactions` | full tx set for dashboard period filter |
| `useInventory` | inventory CRUD |
| `useMigration` | removed (commit `c95c6f4`) |

### Settings (src/hooks/settings/index.ts)

Each maps to one settings table; consistent API `{ data, loading, error, create, update, remove }` (list) or `{ data, loading, upsert }` (singleton):

- list — `useIncomeCategories`, `useExpenseCategories`, `useSubscriptionCategories`, `usePaymentMethods`, `useRecurrenceRules`, `useTaxRates`, `useProjectStatuses`, `useTaskPriorities`, `useTaskLabels`, `useTaskTemplates`, `useSocialConnections`, `useHashtagSets`, `useContentCategories`, `useCaptionTemplates`, `useRoles`, `useDepartments`, `useAlertRules`, `useNotificationChannels`, `useRolePermissions`
- singleton — `useCurrencySettings`, `useSocialPublishingRules`, `usePortalProfile`, `useAppearanceSettings`, `usePortalSecurity`

Plus `sha256hex(input)` exported for the vault unlock password check.

### Leadgen (src/hooks/leadgen/)

`useFollowUpLeads`, `useLeadgenLeadNotes`, `useLeadgenOutreachEvents`, `useColdLeads`, `useLeadgenMembers`, `useLeadgenCurrentMember`, `useLeadgenAllLeads`, `useHotLeads`, `useAutoRelease`, `useLeadgenBlacklist`, `useLeadgenSummary`, `usePersonalLeads`, `useArchivedLeads`, `useTodayCount`, `useLeadgenOverviewStats`, `useLeadgenOverviewDashboard`, `useLeadgenLeads`, `useLeadgenSearches`, `useLeadgenSettings`, `usePersonalLeadgenSummary`.

---

## 15. Services reference

### Core (src/lib/services/)

| File | What it does |
|------|--------------|
| `socialPostsService.ts` | draft / schedule / publish / delete posts |
| `userProfileService.ts` | profile CRUD + preferences |
| `auditLogService.ts` | bridge that writes to `audit_log` from the in-memory `adminStore` |
| `cloudService.ts` | folder / file CRUD + permissions + presigned URL |
| `vaultPdfExport.ts` | categorized PDF export of the vault |
| `investmentService.ts` | `investments` CRUD + portfolio math |
| `goalsService.ts` | `financial_goals` CRUD |
| `categoryService.ts` | `finance_transaction_categories` CRUD |
| `personalTransactionService.ts` | `personal_transactions` CRUD with zod validation |
| `budgetService.ts` | `budget_limits` CRUD + total-budget upsert into `portal_settings` |
| `vaultService.ts` | `vault_items` CRUD + access log into `vault_item_history` |
| `notesService.ts` | `notes` + `note_folders` CRUD |
| `tasksService.ts` | `tasks` + `projects` + `task_comments` CRUD |
| `vaultFileService.ts` | vault file uploads / downloads + inventory attachments |

### Finance portal (src/portals/finance/services/)

| File | What it does |
|------|--------------|
| `financialData.ts` | single source of truth for net-worth data |
| `subscriptionCycles.ts` | billing-cycle math (`calculateNextBillingDate`, `getFirstBillingDateFromStart`, `daysUntilBilling`, `toMonthlyAmount`) |
| `cryptoService.ts` | `crypto_holdings` CRUD + CoinGecko fetch with Supabase price-cache fallback |
| `giftCardService.ts` | `gift_cards`, `gift_card_brands`, `gift_card_transactions` CRUD with hardcoded brand seed |
| `subscriptionProcessor.ts` | bills every overdue subscription cycle, writes one tx per cycle |

All services follow the same shape: Supabase-only data flow, error → `toast.error` + return `null` / `false` / `[]`. No localStorage cache. No optimistic local fallback.

---

## 16. Design system

The full reference is in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Quick summary:

### CSS variables (driven by `data-portal`)

- Text — `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-quaternary`
- Accent — `--accent-primary`, `--accent-primary-soft`, `--accent-primary-glow`
- Glass — `--glass-bg`, `--glass-border`, `--glass-border-subtle`
- Status — `--color-success`, `--color-error`, `--color-warning`, `--color-info`
- Brand — `--sosa-yellow` (`#d4ff00`), `--sosa-bg-1..3`, `--sosa-white-40`, `--sosa-border`
- Typography — `--font-body`, `--font-mono`, `--font-display`
- Radii — `--radius-md`, `--radius-lg`, `--radius-xl`

Per-portal accent: setting `data-portal="redx"` on `<html>` swaps `--accent-primary` to the REDX color. Change accent with `useAccent().setAccent(id)` — never write CSS variables directly.

### Utility classes

`glass-input`, `glass-segment`, `glass-segment-item`, `btn-primary`, `btn-glass-ds`, `glass-btn-primary`, `glass-card`.

### Brutalist primitives (planned)

[src/components/sosa/](src/components/sosa/) when built: `CornerBrackets`, `GrainOverlay`, `DiagonalAccent`, `LogoLockup`, `MonoLabel`, `StatusDot`, `HashtagFooter`, `Button` (primary `↗` arrow / outline `→` arrow), `Input`, `Card` (top accent bar), `PortalShell` (wrap every authenticated page).

### Hard rules

- No border-radius > 2px on primary surfaces
- No box-shadow on primary surfaces
- No gradients except grain
- No hex hardcoded in components — tokens only
- No emoji in UI (use `→ ↗ ◆ ● ✕ ⌃ ⌄`)

---

## 17. Realtime

Two channels of realtime updates:

### Supabase postgres_changes

Used for cross-tab and cross-device live updates. Helper hook `useRealtimeTable<T>(table, portalId, { onInsert, onUpdate, onDelete })` is used by `useInvestments`, `useFinancialGoals`, `useFinanceCategories`.

### Custom BroadcastChannel events

Used for in-tab cross-component invalidation when a postgres_changes subscription would be overkill:

- `finance-updates` — fired after any tx / sub / goal / investment mutation. Listeners: Dashboard, Budget, Analytics, Recap.
- `finance-category-update-{portalId}` — fired after a category mutation. Listeners: useBudgetData.
- `leadgen-updates` — fired after lead / search mutations.
- `SOSA INC:tasks-changed` — fired after task mutations. Listeners: ProfileTasksCard.

---

## 18. Internationalization

Minimal custom i18n at [src/i18n](src/i18n). Exports `getStoredLanguage()`, `setLanguage(code)`, `SUPPORTED_LANGUAGES`, `t(key, params)`. Default language: Italian. Not react-i18next.

**Convention:** every user-visible string is Italian. Every identifier, comment, commit, and PR description is English.

---

## 19. PWA & offline

Configured via `vite-plugin-pwa`. The app is installable; service worker caches the shell. The `<PWAUpdatePrompt>` component surfaces a "new version available" toast.

There is no offline-data layer anymore — after the May 2026 LS strip, business data requires a live Supabase connection. The shell still loads from cache, but most pages will show empty states until the network returns.

---

## 20. Local development

### Commands

```bash
npm run dev        # Vite dev server on port 8080
npm run build      # production build
npm run build:dev  # development mode build
npm run lint       # ESLint
npm test           # Vitest run once
npm run test:watch # Vitest watch
npx tsc --noEmit   # type check without emitting
```

After **every** code change run `npx tsc --noEmit` before committing.

### Environment

`.env.local` (not committed):

```
VITE_SUPABASE_URL=https://ndudzfaisulnmbpnvkwo.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Edge-function secrets are set in the Supabase dashboard — see §13.

### Branch policy

Active branch: `feat/sosa-design-system`. Do **not** push to `main` — it's the production deploy target.

### Commit style

Conventional Commits with module scope:

- `feat(vault): add categorized PDF export`
- `fix(auth): loadingRole guard prevents premature permission denial`
- `refactor(finance): remove localStorage from services`
- `chore(supabase): add migration for note_folders.parent_id`
- `docs: update PROJECT_OVERVIEW.md`

Every commit adds:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## 21. Conventions

### Toasts

```ts
import { toast } from "sonner";
toast.success("Salvato");
toast.error("Errore", { description: err.message });
```

Never use `alert()` or `confirm()`.

### Forms

```ts
const [errors, setErrors] = useState<Record<string, string>>({});
// reset on modal open, validate before submit
```

Use zod schemas in `src/lib/validation/schemas.ts` for service-boundary validation.

### Supabase queries

Manual queries must always include `.eq("portal_id", currentPortalId)`. The `usePortalData` hook does this automatically. RLS is the second layer.

### Page error boundaries

Wrap module bodies in `<ModuleErrorBoundary moduleName="Vault">` so a single broken page doesn't crash the whole portal.

### Loading skeletons

Use the shared `<Skeleton>` from [src/components/ui/skeleton.tsx](src/components/ui/skeleton.tsx). Show 3-4 skeleton rows for lists, never a blank screen.

---

## 22. Known gaps & roadmap

### Pages still on localStorage

- **NotesPage** (1095 LOC) — needs `note_folders.parent_id` migration + Note ↔ DbNote mapper + service wiring.
- **CloudPage** (2075 LOC) — `cloud_folders` schema mismatch with the page's hierarchical model.

### Features marked as placeholder

- `invoices` — Q3 2026 plan
- `reports`, `forecast` — coming soon
- `sync-social-analytics` — Phase-1 mock only; Phase-2 = real graph-API ingestion

### Scaffold tables (in DB, not yet wired)

`portal_member_roles`, `telegram_settings`, `notification_queue`, `folder_access_log`, `cloud_file_versions`, `telegram_notes`, `user_activity_log` — flagged with `SCAFFOLD` comment in [list-tables](https://supabase.com/dashboard/project/ndudzfaisulnmbpnvkwo/database/tables) output. No code references yet.

### Design system

Sub-skill `superpowers:design-system` brief lists Steps 2–5 as still planned: shared brutalist primitives, `<PortalShell>` wrap, per-portal refactors (KEYLO → REDX → TRUST ME → SOSA), audit checklist. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the full brief.

### Auth

Mock-auth scaffolding (open RLS, `auth.uid() = null` policies) was removed in commit `6a1b531`. Real Supabase auth is now exclusive. There is no anonymous / demo flow anymore.

---

## 23. Quick reference cheatsheet

```ts
// permission gate
const { isOwner, isAdmin, currentPortalId, loadingRole } = usePortalDB();
if (loadingRole) return null;
if (!isAdmin) return <AccessDenied />;

// portal-scoped list
const { data, loading, create, update, remove } =
  usePortalData<DbTask>("tasks", { orderBy: "created_at", ascending: false });

// singleton settings
const { data, loading, upsert } = useCurrencySettings();
await upsert({ primary_currency: "EUR" });

// realtime
useRealtimeTable<DbInvestment>("investments", portalId, {
  onInsert, onUpdate, onDelete,
});

// audit
addAuditEntry({
  userId: user.id, portalId,
  action: "Created subscription",
  category: "finance", icon: "💳",
  details: `Stripe – €99/month`,
});

// supabase manual
const { data, error } = await supabase
  .from("personal_transactions")
  .select("*")
  .eq("portal_id", currentPortalId)
  .gte("date", "2026-01-01");
```

---

## 24. File map

```
src/
├── App.tsx                       routes + provider tree
├── components/
│   ├── AdminRoute.tsx            owner/admin gate
│   ├── ProtectedRoute.tsx        session gate
│   ├── PortalLayout.tsx          sidebar + header
│   ├── settings/                 SettingsTable, SettingsModal, ...
│   ├── linear/                   tasks UI (Linear-style)
│   ├── social/                   social cards + modals
│   ├── ui/                       shadcn-style primitives
│   └── sosa/                     brutalist primitives (planned)
├── constants/
│   └── storageKeys.ts            ALL localStorage / sessionStorage keys
├── hooks/                        ~40 hooks; see §14
├── i18n/                         custom mini-i18n
├── lib/
│   ├── authContext.tsx
│   ├── portalContext.tsx         legacy slug-based
│   ├── portalContextDB.tsx       live DB role + portal
│   ├── permissions.ts
│   ├── supabase.ts
│   ├── theme.tsx                 dark/light
│   ├── accent.tsx                per-portal accent
│   ├── numberFormat.tsx          EU vs US
│   ├── periodContext.tsx         dashboard period
│   ├── realtime/                 useRealtimeTable
│   ├── services/                 ~14 services; see §15
│   ├── validation/schemas.ts     zod
│   ├── financeCategoryStore.ts   types + DEFAULT_CATEGORIES
│   ├── investmentStore.ts        types + math helpers
│   ├── personalTransactionStore.ts applyFilters only
│   ├── adminStore.ts             in-memory audit log
│   ├── taskSync.ts               tasks load/sync helpers
│   ├── linearStore.ts            task statuses, priorities, labels
│   ├── notesStore.ts             Note types + TAG_PRESETS
│   ├── portalUUID.ts             slug → UUID resolver
│   └── financeRealtime.ts        BroadcastChannel wrapper
├── pages/                        ~70 pages; see §6 and §11
├── portals/
│   └── finance/                  finance-specific hooks + components
└── types/
    ├── database.ts               every Db* interface
    ├── finance.ts                PersonalTransaction, FinanceSummary, ...
    └── leadgen.ts                LeadgenLead, OutreachStatus, ...

supabase/
├── functions/                    13 edge functions; see §13
└── migrations/                   ~50 migrations; see §9

docs/
├── PROJECT_OVERVIEW.md           this file
├── SOCIAL_MODULE.md              social-specific deep-dive
└── FINANCE_MODULE.md             finance-specific deep-dive

DESIGN_SYSTEM.md                  brutalist design brief
AUDIT_REPORT.md                   forensic audit 2026-05-10
SECURITY_AUDIT.md                 security audit 2026-05-10
audit-reports/                    per-module audit reports
```

---

*Last reviewed: 2026-05-16. Keep this file in sync when shipping major features or refactors.*
