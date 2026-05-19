# 05 — Supabase Client Mismatch

## The Core Finding

There is NO real "two Supabase client" problem. The codebase documentation describes this as a critical architectural issue, but it is actually a TypeScript casting illusion.

**`src/lib/portalDb.ts`** (full content):
```ts
import { supabase } from './supabase';
export const dynamicSupabase = supabase as unknown as SupabaseClient<any, 'public', any>;
```

`dynamicSupabase` IS `supabase`. It is the same object with a different type assertion.
There is only ONE Supabase client. Every hook uses it.

---

## Actual Client Usage Map

| Hook / Service | Import | Variable Name | Table(s) |
|---|---|---|---|
| `usePortalData` | `@/lib/supabase` | `supabase` | All settings tables, generic portal data |
| `useTransactions` | `@/lib/portalDb` | `dynamicSupabase as supabase` | personal_transactions |
| `useFinanceSummary` | `@/lib/supabase` | `_supabase as any` | personal_transactions |
| `useDashboardTransactions` | `@/lib/portalDb` | `dynamicSupabase as supabase` | personal_transactions |
| `useFinanceCategories` | `@/lib/supabase` | `supabase` | finance_transaction_categories, personal_transactions |
| `useInventory` | `@/lib/portalDb` | `dynamicSupabase as supabase` | inventory_items |
| `useInvestments` | indirect via `investmentService` | `supabase` | investments |
| `useFinancialGoals` | indirect via `goalsService` | `supabase` | financial_goals |
| `useBudgetData (hook)` | `@/lib/supabase` (cast as any) | `supabase` | personal_transactions |
| `useBudgetCategoryTransactions` | `@/lib/supabase` (cast as any) | `supabase` | personal_transactions |
| `settings/index.ts (useSingleton)` | `@/lib/supabase` | `supabase` | portal_profiles, appearance_settings, currency_settings, social_publishing_rules |
| `goalsService` | `@/lib/supabase` | `supabase` | financial_goals |
| `investmentService` | `@/lib/supabase` | `supabase` | investments |
| `vaultService` | `@/lib/supabase` | `supabase` | vault_items, vault_item_history |
| `vaultFileService` | `@/lib/supabase` | `supabase` | vault_files, inventory_attachments |
| `cloudService` | `@/lib/supabase` | `supabase` | cloud_folders, cloud_files |
| `tasksService` | `@/lib/supabase` | `supabase` | tasks, projects, task_comments |
| `notesService` | `@/lib/supabase` | `supabase` | notes, note_folders |
| `socialPostsService` | `@/lib/supabase` | `supabase` | social_posts |
| `categoryService` | `@/lib/supabase` | `supabase` | finance_transaction_categories |
| `budgetService` | `@/lib/supabase` | `supabase` | budget_limits |
| `auditLogService` | `@/lib/supabase` | `supabase` | audit_log, portal_members |
| `userProfileService` | `@/lib/supabase` | `supabase` | user_profiles, user_preferences |
| `cryptoService` | `@/lib/supabase` | `supabase` | crypto_holdings, crypto_prices |
| `giftCardService` | `@/lib/supabase` | `supabase` | gift_cards, gift_card_transactions, gift_card_brands |
| `subscriptionProcessor` | `@/lib/supabase` (cast as any) | `supabase` | subscriptions, subscription_transactions |
| `taskSync` | `@/lib/supabase` | `supabase` | tasks, projects |
| `SocialConnections` | `@/lib/supabase` | `supabase` | social_connections |
| `ConnectAccountModal` | `@/lib/supabase` | `supabase` | social_connections |
| `SocialAnalyticsDashboard` | `@/lib/supabase` | `supabase` | social_analytics_snapshots |
| `portalContextDB` | `@/lib/supabase` | `supabase` | portals, portal_members |
| `supabaseAuth` | `@/lib/supabase` | `supabase` | portal_members |
| `DangerZone` (settings page) | `@/lib/supabase` | `supabase` | portals + finance/settings tables |

---

## Tables Read by Multiple Hooks

| Tabella | Hooks / Services | Concern |
|---|---|---|
| `personal_transactions` | useTransactions, useFinanceSummary, useDashboardTransactions, useBudgetData, useBudgetCategoryTransactions | All use same client — no conflict. BUT useTransactions uses `toPortalUUID()`, while useFinanceSummary also uses `toPortalUUID()`. No divergence in client, but the query structure differs (useTransactions fetches full rows, useFinanceSummary selects only type/amount/category/date for aggregation). |
| `finance_transaction_categories` | useFinanceCategories, categoryService | Both use same client. categoryService also called from useFinanceCategories. Potential double-fetch. |
| `tasks` | tasksService, taskSync | Both use same client. tasksService is used by TasksPage; taskSync is used for bidirectional Supabase↔linearStore sync. |
| `social_connections` | SocialConnections, ConnectAccountModal, useSocialConnections (settings) | `useSocialConnections` goes through `usePortalData` (auto-scopes by portal_id) but `SocialConnections` component queries directly without portal_id. **These two fetch different data for the "same" feature.** |

---

## The Real Problem: Inconsistent `portal.id` Sources

The documented "two client" issue in PROJECT_KNOWLEDGE.md is actually a symptom of using two different portal context hooks:

| Hook | Portal ID Source | Portal ID Format |
|---|---|---|
| `usePortal()` (legacy) | `portal.id` from `portalContext.tsx` | slug string (e.g. "sosa", "keylo") |
| `usePortalDB()` (canonical) | `currentPortalId` from `portalContextDB.tsx` | UUID string from portals table |

`toPortalUUID(portalId)` converts slug → UUID before Supabase queries.  
Both sources eventually produce the same portal UUID after `toPortalUUID()`.  
The divergence only matters if `portal.id` in the legacy context is not kept in sync with `currentPortalId` in the DB context.

---

## Recommendations

1. `dynamicSupabase` export in `portalDb.ts` is dead code — it adds confusion without benefit. Remove it and have `useTransactions`/`useInventory` import directly from `@/lib/supabase`.
2. All hooks should migrate from `usePortal()` to `usePortalDB()` for consistent portal ID sourcing.
3. The `portalDb.ts` file itself should be removed once all direct uses of `dynamicSupabase` are updated.
