# 02 — Frontend Section → Table Map

**Route base:** `/:portalId/`  
**Client A:** `@/lib/supabase` (global, used by most hooks)  
**Client B:** `@/lib/portalDb` (dynamicSupabase) — NOTE: this is Client A cast differently, same underlying client.

Legend:
- ✅ allineato — page, hook, and tables are consistent
- ⚠️ parziale — partial alignment or minor issues
- ❌ disallineato — confirmed structural mismatch or missing tables

---

| Sezione | Rotta | Pagina | Hook/Service | Tabelle attese | Tabelle trovate nel codice | Client Supabase | Stato |
|---|---|---|---|---|---|---|---|
| Dashboard | `/dashboard` | `src/pages/dashboard/Dashboard.tsx` | `useDashboardTransactions`, `useFinancialGoals`, `useInvestments`, `useDashboardSubscriptions` | personal_transactions, financial_goals, investments, subscriptions | personal_transactions (portalDb), financial_goals (supabase), investments (supabase) | Mixed: portalDb + supabase | ⚠️ parziale |
| Budget / Costs | `/costs` | `src/pages/Budget.tsx` | `useBudgetData`, `useBudgetCategoryTransactions`, `useExpenseCategories`, `useIncomeCategories` | personal_transactions, expense_categories, income_categories, budget_limits | All found | supabase (global) | ✅ allineato |
| Recap (Finance Dashboard) | `/recap` | `src/pages/Recap.tsx` | `useFinanceSummary`, `useTransactions`, `useExpenseCategories` | personal_transactions, expense_categories | Found — two separate hook calls to personal_transactions via different client aliases | supabase + portalDb alias | ⚠️ parziale — dual-hook issue |
| Transactions | `/transactions` | `src/pages/Transactions.tsx` | `useTransactions` | personal_transactions | personal_transactions | portalDb (= supabase) | ✅ allineato |
| Goals / PL Rules | `/pl-rules` | `src/pages/Goals.tsx` | `useFinancialGoals`, `goalsService` | financial_goals | financial_goals | supabase | ✅ allineato |
| Analytics | `/analytics` | `src/pages/Analytics.tsx` | `useFinanceSummary`, `useTransactions` | personal_transactions | personal_transactions | supabase + portalDb | ⚠️ parziale — same dual-hook |
| Subscriptions / Channels | `/channels` | `src/pages/Subscriptions.tsx` | `useDashboardSubscriptions`, `subscriptionProcessor` | subscriptions, subscription_transactions | subscriptions, subscription_transactions | supabase | ✅ allineato |
| Invoices | `/invoices` | `src/pages/Invoices.tsx` | None found in scan | invoices (expected) | NONE — page may be placeholder | NONE | ❌ disallineato — likely placeholder |
| Crypto | `/crypto` | `src/pages/crypto/CryptoPage.tsx` | `useCryptoHoldings`, `useCryptoPrices`, `cryptoService` | crypto_holdings, crypto_prices | crypto_holdings, crypto_prices | supabase | ✅ allineato |
| Gift Cards | `/gift-cards` | `src/pages/gift-cards/GiftCardsPage.tsx` | `useGiftCards`, `giftCardService` | gift_cards, gift_card_transactions, gift_card_brands | gift_cards, gift_card_transactions, gift_card_brands | supabase | ⚠️ parziale — portal singleton state pattern is risky |
| Vault | `/vault` | `src/pages/VaultPage.tsx` | `vaultService`, `vaultFileService` | vault_items, vault_item_history, vault_files | All found | supabase | ⚠️ parziale — delete leaks (see 04) |
| Cloud | `/cloud` | `src/pages/cloud/CloudPage.tsx` | `cloudService` | cloud_folders, cloud_files | Found | supabase | ⚠️ parziale — softDelete/restore leaks (see 04) |
| Tasks | `/tasks` | `src/pages/TasksPage.tsx` | `tasksService`, `taskSync` | tasks, projects, task_comments | Found, plus task_priorities/labels/statuses from settings | supabase | ⚠️ parziale — taskSync delete has no portal_id |
| Notes | `/notes` | `src/pages/NotesPage.tsx` | `notesService` | notes, note_folders | Found | supabase | ⚠️ parziale — update/delete optional portal_id |
| Inventory | `/inventory` | `src/pages/InventoryPage.tsx` | `useInventory`, `vaultFileService` | inventory_items, inventory_attachments | Found | portalDb (= supabase) | ⚠️ parziale — uses raw slug not UUID; attachment delete unscoped |
| Administration | `/admin` | `src/pages/AdministrationPage.tsx` | `auditLogService` | audit_log, portal_members | audit_log found | supabase | ✅ allineato |
| Profile | `/profile` | `src/pages/ProfilePage.tsx` | `userProfileService` | user_profiles, user_preferences | Found | supabase | ✅ allineato |
| Social Overview | `/social/overview` | `src/pages/social/SocialOverview.tsx` | `SocialConnections`, `SocialAnalyticsDashboard` | social_connections, social_analytics_snapshots, social_posts | Found — BUT cross-portal leak | supabase | ❌ disallineato — no portal_id |
| Social Accounts | `/social/accounts` | `src/pages/social/SocialAccounts.tsx` | `SocialConnections` | social_connections | Found | supabase | ❌ disallineato — no portal_id |
| Social Analytics | `/social/analytics` | `src/pages/social/SocialAnalytics.tsx` | `SocialAnalyticsDashboard` | social_analytics_snapshots | Found | supabase | ❌ disallineato — no portal_id |
| Social Content | `/social/content` | `src/pages/social/SocialContent.tsx` | `socialPostsService` | social_posts | Found | supabase | ⚠️ parziale — update/publish optional portal_id |
| Social Audience | `/social/audience` | `src/pages/social/SocialAudience.tsx` | None found in scan | unknown | GAP | GAP | GAP |
| Social Competitors | `/social/competitors` | `src/pages/social/SocialCompetitors.tsx` | None found in scan | unknown | GAP | GAP | GAP |
| Settings — Finance | `/settings/finance/*` | Multiple pages in `src/pages/settings/finance/` | `useIncomeCategories`, `useExpenseCategories`, etc. | income_categories, expense_categories, subscription_categories, payment_methods, recurrence_rules, tax_rates, finance_transaction_categories, currency_settings | All found via usePortalData | supabase | ✅ allineato |
| Settings — General | `/settings/general/*` | `Appearance.tsx`, `PortalProfile.tsx` | `useAppearanceSettings`, `usePortalProfile` | appearance_settings, portal_profiles | Found | supabase | ✅ allineato |
| Settings — Notifications | `/settings/notifications/*` | `AlertRules.tsx`, `NotificationChannels.tsx` | `useAlertRules`, `useNotificationChannels` | alert_rules, notification_channels | Found | supabase | ✅ allineato |
| Settings — Projects | `/settings/projects/*` | Multiple | `useProjectStatuses`, `useTaskPriorities`, `useTaskLabels`, `useTaskTemplates` | project_statuses, task_priorities, task_labels, task_templates | Found | supabase | ✅ allineato |
| Settings — Social | `/settings/social/*` | Multiple | `useSocialConnections`, `useHashtagSets`, etc. | social_connections, hashtag_sets, content_categories, caption_templates, social_publishing_rules | social_connections FAILS portal isolation | supabase | ❌ disallineato |
| Settings — Team | `/settings/team/*` | `Departments.tsx`, `RolesPermissions.tsx` | `useDepartments`, `useRoles`, `useRolePermissions` | departments, roles, role_permissions | Found | supabase | ✅ allineato |
| Settings — Danger Zone | `/settings/danger-zone` | `DangerZone.tsx` | Direct supabase calls | portal tables | Uses raw supabase with portal_id + owner_id check | supabase | ✅ allineato |

---

## Section Summary Counts

| Status | Count |
|---|---|
| ✅ allineato | 11 |
| ⚠️ parziale | 11 |
| ❌ disallineato | 5 |
| GAP | 2 |
