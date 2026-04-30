# 09 — Action Plan (HIGH → LOW)

All items are ordered by risk. Security issues first, data integrity second, developer experience third.

---

## PRIORITY 1 — CRITICAL SECURITY (fix before next production deploy)

### ACTION-01: Add portal_id to social_connections schema + filter all queries
**Problem:** social_connections is not portal-scoped. Users see the same social accounts in all portals.  
**Files affected:**
- `src/components/social/SocialConnections.tsx` (SELECT + DELETE)
- `src/components/social/ConnectAccountModal.tsx` (INSERT)
- `src/hooks/settings/index.ts` → `useSocialConnections` (via usePortalData — will work after schema add)
- DB migration: `ALTER TABLE social_connections ADD COLUMN portal_id UUID REFERENCES portals(id);`  
**Proposed fix:**
1. Add `portal_id` column to `social_connections` in a new migration.
2. Backfill existing rows (set to primary portal of the owning user, or NULL with a cleanup UI).
3. In `fetchConnections()`: add `.eq("portal_id", toPortalUUID(currentPortalId))`.
4. In `handleSave()` (ConnectAccountModal): add `portal_id: toPortalUUID(currentPortalId)` to insert.
5. In `handleDisconnect()`: add `.eq("portal_id", ...)` to delete.  
**Effort:** M | **Risk of NOT fixing:** Users see cross-portal social accounts — privacy violation.

---

### ACTION-02: Add portal_id filter to vault_files DELETE
**Problem:** `deleteVaultFile()` deletes by UUID alone — no portal check.  
**File:** `src/lib/services/vaultFileService.ts` line 157  
**Proposed fix:**
```ts
await supabase.from("vault_files").delete()
  .eq("id", vaultFile.id)
  .eq("portal_id", vaultFile.portal_id);  // already available on object
```
**Effort:** S | **Risk:** Any authenticated user knowing a file UUID can delete it.

---

### ACTION-03: Add portal_id filter to inventory_attachments DELETE
**Problem:** Same as ACTION-02 for inventory_attachments.  
**File:** `src/lib/services/vaultFileService.ts` line 282  
**Proposed fix:**
```ts
await supabase.from("inventory_attachments").delete()
  .eq("id", att.id)
  .eq("portal_id", att.portal_id);
```
**Effort:** S | **Risk:** Any authenticated user can delete another portal's inventory attachment.

---

### ACTION-04: Add portal_id to cloud_files softDeleteFile and restoreFile
**Problem:** `softDeleteFile()` and `restoreFile()` filter by id only.  
**File:** `src/lib/services/cloudService.ts` lines 124, 141  
**Proposed fix:** Add `portalId` parameter to both functions and chain `.eq("portal_id", toPortalUUID(portalId))`. Update all call sites.  
**Effort:** S | **Risk:** Cross-portal cloud file deletion.

---

### ACTION-05: Add portal_id to taskSync.deleteTask
**Problem:** `deleteTask(id)` has no portal_id filter.  
**File:** `src/lib/taskSync.ts` line 159  
**Proposed fix:** Add `portalId` parameter, chain filter.  
**Effort:** S | **Risk:** Any portal member can delete tasks in any portal if they know the UUID.

---

## PRIORITY 2 — DATA INTEGRITY (fix before next sprint)

### ACTION-06: Fix useInventory to use toPortalUUID()
**Problem:** `useInventory` queries with raw slug `.eq("portal_id", portalId)` instead of `toPortalUUID(portalId)`. If `inventory_items.portal_id` stores UUIDs, all Supabase queries silently return empty and the hook falls back to localStorage indefinitely.  
**File:** `src/hooks/useInventory.ts` lines 165, 208, 236, 263  
**Proposed fix:** Replace `portalId` with `toPortalUUID(portalId)` in all `.eq("portal_id", ...)` calls. Same fix needed in `vaultFileService.ts` `fetchVaultFiles()` and `fetchItemAttachments()`.  
**Effort:** S | **Risk:** Inventory data never persists to or loads from Supabase.

---

### ACTION-07: Fix subscription_transactions INSERT to use toPortalUUID()
**Problem:** `subscriptionProcessor.ts` inserts `portal_id: portalId` (raw slug) instead of `portal_id: toPortalUUID(portalId)`.  
**File:** `src/portals/finance/services/subscriptionProcessor.ts` line 102  
**Proposed fix:** Change to `portal_id: toPortalUUID(portalId)`.  
**Effort:** S | **Risk:** Subscription payment records never reach the DB.

---

### ACTION-08: Fix subscriptions UPDATE in subscriptionProcessor to filter by portal_id
**Problem:** `subscriptionProcessor.ts` updates `next_billing_date` with `.eq("id", current.id)` only.  
**File:** `src/portals/finance/services/subscriptionProcessor.ts` line 134  
**Proposed fix:** Add `.eq("portal_id", toPortalUUID(portalId))`.  
**Effort:** S | **Risk:** Subscription billing date updates could affect another portal's records.

---

### ACTION-09: Remove cryptoService updateHolding fallback without portal_id
**Problem:** When the portal_id-filtered update fails, code retries with no portal_id filter at all.  
**File:** `src/portals/finance/services/cryptoService.ts` lines 139–145  
**Proposed fix:** Remove the fallback try block. If the filtered update fails, surface the error. The comment says "covers RLS edge cases" — if RLS is configured correctly, the fallback should never be needed.  
**Effort:** S | **Risk:** Cross-portal crypto holding updates.

---

### ACTION-10: Add portal_id to vault_items recordVaultAccess UPDATE
**Problem:** `recordVaultAccess()` updates without portal_id filter.  
**File:** `src/lib/services/vaultService.ts` line 111  
**Proposed fix:** Add `.eq("portal_id", toPortalUUID(portalId))`.  
**Effort:** S | **Risk:** Vault item access timestamps can be updated cross-portal.

---

### ACTION-11: Refactor giftCardService singleton state to function parameters
**Problem:** `giftCardService.ts` uses module-level `let currentPortalId = "sosa"`. Must be explicitly set via `setGiftCardPortal()` before every service call or data defaults to "sosa" portal.  
**File:** `src/portals/finance/services/giftCardService.ts`  
**Proposed fix:** Remove module-level state. Pass `portalId` as first parameter to every function (matching the pattern used by all other services). Update all call sites.  
**Effort:** M | **Risk:** Gift card data defaults to "sosa" portal if portal switch not handled.

---

### ACTION-12: Make loadTasksFromSupabase and loadProjectsFromSupabase require portalId
**Problem:** Both functions in `taskSync.ts` accept optional `portalId?` — callers can omit it and get all tasks/projects across all portals.  
**File:** `src/lib/taskSync.ts` lines 119, 133  
**Proposed fix:** Make `portalId: string` required (not optional). Update all call sites to pass portalId.  
**Effort:** S | **Risk:** If called without portalId, returns cross-portal data.

---

## PRIORITY 3 — CONTEXT / HOOK MODERNIZATION (do in dedicated sprint)

### ACTION-13: Migrate all 32+ files from usePortal() to usePortalDB()
**Problem:** 32+ files use the legacy `usePortal()` hook. The canonical hook is `usePortalDB()`.  
**Fix:** For each file, replace `const { portal } = usePortal()` → `const { currentPortalId } = usePortalDB()`. Replace all `portal?.id ?? "sosa"` with `currentPortalId ?? ""` (and handle null case properly instead of defaulting to "sosa").  
**Priority order:** Core hooks first (useTransactions, useFinanceSummary, useDashboardTransactions), then pages, then components.  
**Effort:** L | **Risk of NOT fixing:** Stale context data on portal switch; defaults to "sosa" on race conditions.

---

### ACTION-14: Remove dynamicSupabase / portalDb.ts
**Problem:** `portalDb.ts` exports `dynamicSupabase` which is just `supabase as unknown as SupabaseClient<any>`. It provides no functional difference but adds confusion to the codebase.  
**Fix:** Remove `src/lib/portalDb.ts`. Update `useTransactions`, `useDashboardTransactions`, `useInventory` to import directly from `@/lib/supabase`.  
**Effort:** S | **Risk of NOT fixing:** New developers are misled into thinking two separate DB connections exist.

---

### ACTION-15: Consolidate the three category systems
**Problem:** `financeCategoryStore.ts`, `income_categories`/`expense_categories`, and `finance_transaction_categories` serve overlapping purposes and can diverge.  
**Fix:**
1. Make `income_categories`/`expense_categories` the single source of truth for category color/icon.
2. Add color field to these tables if missing.
3. Remove `financeCategoryStore.ts` or make it a pure read-through cache of the Supabase tables.
4. Use `useIncomeCategories()` + `useExpenseCategories()` for color maps in Recap instead of `getAllCategories()`.  
**Effort:** L | **Risk:** Color maps diverge between Analytics/Recap and Settings.

---

### ACTION-16: Fix "sosa" default fallback across hooks
**Problem:** `const portalId = portal?.id ?? "sosa"` appears 20+ times. On slow connections, the wrong portal's data is queried briefly.  
**Fix:** Change to `if (!currentPortalId) { setLoading(false); return; }` pattern.  
**Effort:** M | **Risk:** Brief display of wrong portal data; harder to debug multi-portal issues.

---

## PRIORITY 4 — CLEANUP & MAINTENANCE

### ACTION-17: Remove dead page files
Files not referenced in App.tsx routes:  
`BusinessFinanceDashboard.tsx`, `BusinessPLPage.tsx`, `BusinessCOGSPage.tsx`, `BusinessOPEXPage.tsx`, `src/pages/Dashboard.tsx` (root), `src/pages/Settings.tsx` (root), `HomePage.tsx`, `src/pages/Investments.tsx`  
**Effort:** S | **Risk:** Build size bloat; developer confusion.

---

### ACTION-18: Run Supabase Security Advisors with MCP access
**Effort:** S | **Risk of NOT doing:** Unknown RLS vulnerabilities remain undetected.

---

### ACTION-19: Run DB query to confirm portal_id UUID vs slug format per table
Check: does `inventory_items.portal_id` store slugs or UUIDs? Does `vault_files.portal_id` store slugs or UUIDs?  
**Effort:** S | **Risk:** Data not loading from DB (ACTION-06 may not be needed if slugs are stored).

---

### ACTION-20: Remove or sync the local audit log (adminStore.ts)
Two audit log systems coexist: `src/lib/adminStore.ts` (localStorage, never synced to DB) and `src/lib/services/auditLogService.ts` (Supabase). Entries from the local store are never persisted.  
**Fix:** Remove `adminStore.ts`; route all `addAuditEntry()` calls to `auditLogService.addAuditEntry()`.  
**Effort:** M | **Risk:** Audit trail is incomplete; some actions never appear in admin log.

---

## Action Plan Summary Table

| ID | Title | Effort | Risk if NOT fixed |
|---|---|---|---|
| ACTION-01 | social_connections portal isolation | M | Privacy: cross-portal social account leak |
| ACTION-02 | vault_files delete unscoped | S | Security: cross-portal file deletion |
| ACTION-03 | inventory_attachments delete unscoped | S | Security: cross-portal attachment deletion |
| ACTION-04 | cloud_files softDelete/restore unscoped | S | Security: cross-portal cloud file mutation |
| ACTION-05 | taskSync.deleteTask unscoped | S | Security: cross-portal task deletion |
| ACTION-06 | useInventory slug vs UUID | S | Data: inventory never loads from Supabase |
| ACTION-07 | subscription_transactions slug | S | Data: billing records never reach DB |
| ACTION-08 | subscriptions update unscoped | S | Data integrity: wrong portal billing date |
| ACTION-09 | cryptoService fallback no portal_id | S | Security: cross-portal crypto update |
| ACTION-10 | vault recordVaultAccess unscoped | S | Security: cross-portal access timestamp |
| ACTION-11 | giftCardService singleton state | M | Data: gift cards default to "sosa" portal |
| ACTION-12 | taskSync optional portalId | S | Security: cross-portal task read |
| ACTION-13 | Migrate usePortal() → usePortalDB() | L | Correctness: stale portal context |
| ACTION-14 | Remove dynamicSupabase | S | DX: confusion about client architecture |
| ACTION-15 | Consolidate category systems | L | Data: diverging category colors/icons |
| ACTION-16 | Fix "sosa" default fallback | M | UX: brief wrong-portal data flash |
| ACTION-17 | Remove dead page files | S | DX: build bloat |
| ACTION-18 | Run Supabase security advisors | S | Unknown RLS vulnerabilities |
| ACTION-19 | Confirm portal_id format per table | S | Root cause of ACTION-06 determination |
| ACTION-20 | Remove local audit log | M | Audit trail: incomplete admin log |
