# 01 — Portal Isolation Matrix

**Method:** Inferred from frontend service files, type definitions, and hook code.  
**DB live query:** NOT EXECUTED (Supabase MCP tools denied). All RLS/index columns = GAP.

Legend:
- ✅ OK — portal_id present and filtered in all frontend code
- ⚠️ WARN — partial: some operations lack filter or portal_id optional
- ❌ FAIL — no portal_id filter or confirmed cross-portal leak
- GAP — could not verify via live DB query

---

## Portal-Scoped Data Tables

| Tabella | Ha portal_id? | Filtrata nel codice? | RLS attiva? | Indice su portal_id? | Verdetto |
|---|---|---|---|---|---|
| `personal_transactions` | ✅ yes | ✅ yes — useTransactions, useFinanceSummary, useDashboardTransactions | GAP | GAP | ⚠️ WARN — uses toPortalUUID() conversion but useFinanceSummary does not filter by user_id, allowing all portal members to see all tx |
| `financial_goals` | ✅ yes | ✅ yes — goalsService filters by toPortalUUID(portalId) | GAP | GAP | ✅ OK |
| `investments` | ✅ yes | ✅ yes — investmentService filters by toPortalUUID(portalId) | GAP | GAP | ✅ OK |
| `crypto_holdings` | ✅ yes | ✅ yes — cryptoService filters by toPortalUUID(portalId) | GAP | GAP | ⚠️ WARN — updateHolding() has fallback path that updates without portal_id: `.eq("id", id)` only (line 143) |
| `crypto_prices` | ❌ no portal_id | Queried without portal_id filter | GAP | GAP | ⚠️ WARN — shared table (expected), but not documented as intentionally global |
| `inventory_items` | ✅ yes | ✅ yes — useInventory filters by portal_id (raw slug, NOT toPortalUUID) | GAP | GAP | ⚠️ WARN — uses raw slug string, not UUID. Other tables use toPortalUUID(). Inconsistency. |
| `inventory_attachments` | ✅ yes | ⚠️ partial — fetchItemAttachments filters by both item_id+portal_id; delete: `.eq("id", att.id)` only | GAP | GAP | ❌ FAIL — delete has no portal_id filter (vaultFileService.ts line 282) |
| `vault_items` | ✅ yes | ✅ yes — vaultService uses toPortalUUID(portalId) on read/write; delete chains portal_id | GAP | GAP | ✅ OK |
| `vault_item_history` | ✅ yes | ✅ yes — logVaultAccess inserts with portal_id | GAP | GAP | ⚠️ WARN — recordVaultAccess update: `.eq("id", id)` only — no portal_id on the update (vaultService.ts line 111) |
| `vault_files` | ✅ yes | ⚠️ partial — fetch/upload use portal_id; delete: `.eq("id", vaultFile.id)` ONLY | GAP | GAP | ❌ FAIL — delete is unscoped (vaultFileService.ts line 157) |
| `cloud_folders` | ✅ yes | ⚠️ partial — fetch uses portal_id; renameFolder/softDeleteFolder have optional portal_id | GAP | GAP | ⚠️ WARN — rename/softDelete called without portal_id in some paths |
| `cloud_files` | ✅ yes | ⚠️ partial — fetch uses portal_id; softDeleteFile, restoreFile have NO portal_id filter | GAP | GAP | ❌ FAIL — softDeleteFile (line 124) and restoreFile (line 141) filter by id only |
| `tasks` | ✅ yes | ⚠️ partial — tasksService uses portal_id; taskSync.ts functions accept optional portalId | GAP | GAP | ⚠️ WARN — taskSync.deleteTask() has NO portal_id at all (line 159) |
| `projects` | ✅ yes | ⚠️ partial — same as tasks | GAP | GAP | ⚠️ WARN — taskSync.deleteProject() — optional (line 46 in tasksService) |
| `task_comments` | ✅ yes | ⚠️ partial — create uses portal_id; fetchComments by task_id only; deleteComment optional portal_id | GAP | GAP | ⚠️ WARN — fetchComments has no portal_id filter (line 110 tasksService) |
| `notes` | ✅ yes | ⚠️ partial — fetch/create use portal_id; updateNote/deleteNote have optional portal_id | GAP | GAP | ⚠️ WARN — update/delete without portal_id when caller omits it |
| `note_folders` | ✅ yes | ⚠️ partial — same pattern as notes | GAP | GAP | ⚠️ WARN |
| `social_posts` | ✅ yes | ⚠️ partial — fetch/create use portal_id; updatePost/deletePost/publishPost have optional portal_id | GAP | GAP | ⚠️ WARN |
| `social_connections` | ❌ NOT portal-scoped | Filtered by user_id only — no portal_id in insert or select | GAP | GAP | ❌ FAIL — cross-portal leak: user's social accounts appear in ALL portals |
| `social_analytics_snapshots` | ❓ unknown | Filtered by connection_id only | GAP | GAP | ❌ FAIL — inherits leak from social_connections |
| `income_categories` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `expense_categories` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `subscription_categories` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `payment_methods` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `recurrence_rules` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `tax_rates` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `project_statuses` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `task_priorities` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `task_labels` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `task_templates` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `hashtag_sets` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `content_categories` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `caption_templates` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `roles` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `departments` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `alert_rules` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `notification_channels` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `role_permissions` | ✅ yes | ✅ yes — via usePortalData auto-filter | GAP | GAP | ✅ OK |
| `portal_profiles` | ✅ yes | ✅ yes — via useSingleton | GAP | GAP | ✅ OK |
| `appearance_settings` | ✅ yes | ✅ yes — via useSingleton | GAP | GAP | ✅ OK |
| `currency_settings` | ✅ yes | ✅ yes — via useSingleton | GAP | GAP | ✅ OK |
| `social_publishing_rules` | ✅ yes | ✅ yes — via useSingleton | GAP | GAP | ✅ OK |
| `finance_transaction_categories` | ✅ yes | ✅ yes — useFinanceCategories uses toPortalUUID(); delete missing portal_id (line 193) | GAP | GAP | ⚠️ WARN — deleteCategory does `.delete().eq("id", id)` with no portal_id |
| `budget_limits` | ✅ yes | ✅ yes — budgetService uses toPortalUUID(); deleteBudgetLimit has optional portal_id | GAP | GAP | ⚠️ WARN |
| `subscription_transactions` | ✅ yes | ✅ yes — subscriptionProcessor inserts with portal_id | GAP | GAP | ⚠️ WARN — subscriptions.update in subscriptionProcessor (line 134) only filters by `.eq("id", current.id)` — no portal_id |
| `audit_log` | ✅ yes | ✅ yes — auditLogService uses toPortalUUID | GAP | GAP | ✅ OK |
| `portal_members` | ✅ yes | ✅ yes — used in audit pre-check | GAP | GAP | ✅ OK |
| `portals` | ✅ yes (owner_id) | ✅ yes — DangerZone deletes with owner_id check | GAP | GAP | ✅ OK |
| `user_profiles` | ❌ no portal_id | Global user table, filtered by user_id | GAP | GAP | ✅ OK (expected global) |
| `user_preferences` | ✅ yes | ✅ yes — userProfileService uses both user_id and portal_id | GAP | GAP | ✅ OK |
| `gift_cards` | ✅ yes | ✅ yes — giftCardService uses toPortalUUID(currentPortalId) | GAP | GAP | ⚠️ WARN — giftCardService uses module-level `currentPortalId` state variable — a singleton that must be explicitly set via setGiftCardPortal(). If caller forgets, it defaults to "sosa" |
| `gift_card_transactions` | ✅ yes | ✅ yes — similar pattern | GAP | GAP | ⚠️ WARN — same singleton state concern |
| `gift_card_brands` | ❌ no portal_id | Global reference table | GAP | GAP | ✅ OK (expected global) |

---

## Summary Counts

| Verdict | Count |
|---|---|
| ✅ OK | 22 |
| ⚠️ WARN | 18 |
| ❌ FAIL | 5 |
| GAP (RLS/index not verified) | 50 (all) |

---

## FAIL Details

1. **social_connections** — No portal_id on insert or select. User sees same connections in all portals.
2. **social_analytics_snapshots** — No portal_id filter. Filtered by connection_id only.
3. **vault_files** — DELETE does not filter by portal_id (line 157 vaultFileService.ts).
4. **inventory_attachments** — DELETE does not filter by portal_id (line 282 vaultFileService.ts).
5. **cloud_files** — softDeleteFile and restoreFile have no portal_id filter.
