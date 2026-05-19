# 06 — Legacy Usage

## A. Files Using `usePortal()` Instead of `usePortalDB()`

`usePortal()` is the legacy context defined in `src/lib/portalContext.tsx`.  
`usePortalDB()` is the canonical context defined in `src/lib/portalContextDB.tsx`.

Per `CLAUDE.md` and `PROJECT_KNOWLEDGE.md`: **always use `usePortalDB()`**, not `usePortal()`.

The following files still use the legacy `usePortal()`:

| File | Usage | Migration Note |
|---|---|---|
| `src/hooks/useTransactions.ts` | `const { portal } = usePortal()` → `portalId = portal?.id` | Migrate to `usePortalDB().currentPortalId` |
| `src/hooks/useFinanceSummary.ts` | `const { portal } = usePortal()` → `portalId = portal?.id` | Migrate to `usePortalDB().currentPortalId` |
| `src/hooks/useDashboardTransactions.ts` | `const { portal } = usePortal()` | Same |
| `src/hooks/useFinancialGoals.ts` | `const { portal } = usePortal()` | Same |
| `src/hooks/useInventory.ts` | `const { portal } = usePortal()` | Same |
| `src/hooks/useInvestments.ts` | `const { portal } = usePortal()` | Same |
| `src/hooks/useFinanceCategories.ts` | `const { portal } = usePortal()` | Same |
| `src/hooks/useCategories.ts` | `const { portal } = usePortal()` | Same |
| `src/hooks/useDashboardSubscriptions.ts` | `const { portal } = usePortal()` | Same |
| `src/hooks/useMigration.ts` | `const { portal } = usePortal()` | Same |
| `src/pages/Recap.tsx` | `const { portal } = usePortal()` — specifically for `portal.accent` | Known debt (PROJECT_KNOWLEDGE.md §12.C) |
| `src/pages/Transactions.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/Goals.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/TasksPage.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/VaultPage.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/Subscriptions.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/InventoryPage.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/AdministrationPage.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/crypto/CryptoPage.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/crypto/CryptoDetailPopup.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/gift-cards/GiftCardsPage.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/social/OAuthCallback.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/dashboard/Dashboard.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/pages/dashboard/GoalsWidget.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/components/AppHeader.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/components/AppLayout.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/components/AppSidebar.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/components/NewTransactionModal.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/components/SidebarProfileWidget.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/components/profile/ProfileTasksCard.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/portals/finance/hooks/useBudgetData.tsx` | `const { portal } = usePortal()` | Migrate |
| `src/portals/finance/hooks/useBudgetCategoryTransactions.ts` | `const { portal } = usePortal()` | Migrate |
| `src/portals/finance/hooks/useGiftCards.ts` | `const { portal } = usePortal()` | Migrate |
| `src/portals/finance/hooks/useGiftCardDetail.ts` | likely `usePortal()` | Migrate |
| `src/portals/finance/hooks/useGiftCardsSummary.ts` | likely `usePortal()` | Migrate |
| `src/portals/finance/hooks/useCryptoPrices.ts` | `const { portal } = usePortal()` | Migrate |
| `src/portals/finance/hooks/useCryptoHoldings.ts` | `const { portal } = usePortal()` | Migrate |

**Count:** 32+ files using the legacy hook.  
**Files using usePortalDB() correctly:** ~6 (settings/index.ts, usePortalData.ts, HubPage.tsx, PortalLayout.tsx, ProfilePage.tsx, DangerZone.tsx, permissions.ts)

---

## B. localStorage Usage for Data That Should Be in DB

The following data is stored in localStorage when it should be portal-scoped in Supabase:

| Data | localStorage Key Pattern | Concern |
|---|---|---|
| Finance categories (color/icon) | `finance_categories_{portalId}` | `financeCategoryStore.ts` manages color+icon in localStorage. The Supabase tables (`income_categories`, `expense_categories`) also have color/icon columns. **DUAL SYSTEM.** Changes in one don't propagate to the other unless `refreshFromSupabase()` is called. |
| Budget limits (cache) | `finance_budget_limits_{portalId}` | SWR cache for `budget_limits` table. OK as cache, risky if stale data persists and overwrites DB on next upsert. |
| Personal transactions (fallback) | `personal_tx_{portalId}` | OK — intended offline fallback. Risk: local_* IDs never get synced unless explicitly merged (see `useTransactions.ts` merge logic). |
| Financial goals (fallback) | `finance_goals_{portalId}` | OK as offline fallback. But locally-created goals offline will have local UUIDs that may conflict on sync. |
| Investments (cache) | `finance_investments_{portalId}` | `investmentStore.ts` localStorage cache used by `useInvestments`. Data is also in Supabase `investments` table. Stale local data shown during cold start. |
| Inventory items (fallback) | `inventory_{portalId}` | OK as fallback. Uses raw slug not UUID in key. |
| Crypto holdings (fallback) | `crypto_holdings_{portalId}` | OK as fallback. |
| Gift cards (fallback) | `gift_cards_{portalId}` | OK as fallback. But giftCardService has module-level singleton state (currentPortalId) — risky. |
| Gift card transactions (fallback) | `gift_card_tx_{portalId}` | Same as above. |
| Vault items (cache) | `SOSA INC_vault_items_{portalId}` | OK as cache. |
| Vault files (cache) | `SOSA INC_vault_files_{portalId}` | OK as cache. |
| Notes (cache) | `SOSA INC_notes_{portalId}` | OK as cache. |
| Tasks (cache) | `SOSA INC_tasks_{portalId}` | OK as cache. |
| Projects (cache) | `SOSA INC_projects_{portalId}` | OK as cache. |
| Finance summary (SWR) | `swr_summary_{portalId}_{from}_{to}` | OK as SWR cache. Invalidated by realtime. |
| Portal table rows (SWR) | `swr_{table}_{portalId}` | OK as SWR cache via `usePortalData`. |
| Singleton settings (SWR) | `swr_single_{table}_{portalId}` | OK as SWR cache via `useSingleton`. |
| Audit log (local) | `audit_log_{portalId}` | `adminStore.ts` — a SECOND local-only audit log alongside Supabase `audit_log`. These diverge. Local entries are never synced. |
| Finance transaction categories | `finance_tx_cats_{portalId}` | `useFinanceCategories` persists to localStorage. Separate from the `financeCategoryStore.ts` categories. Third parallel system. |

---

## C. Deprecated Patterns Still in Use

### 1. `portalId ?? "sosa"` default fallback
In 20+ files: `const portalId = portal?.id ?? "sosa"`  
This means: if no portal is loaded yet, the code defaults to querying portal "sosa" data. On fast connections this is a brief flash; on slow connections it loads the wrong portal's data into state before the real portal context resolves.  
**Fix:** Return early (setLoading(true)) if `portal` is undefined instead of falling back to "sosa".

### 2. `as any` casts to bypass Supabase type safety
In 4+ hook files:
```ts
import { supabase as _supabase } from "@/lib/supabase";
const supabase = _supabase as any;
```
These casts are used to bypass TypeScript errors from Supabase's generated types not matching the actual query shape. This masks real type errors.  
**Fix:** Regenerate Supabase types (`npx supabase gen types`) or use proper `Database` type definitions.

### 3. Module-level singleton state in giftCardService
`giftCardService.ts` uses module-level `let currentPortalId = "sosa"` updated via `setGiftCardPortal()`.  
This is a singleton pattern that breaks in concurrent scenarios (e.g. React StrictMode double-render). If `setGiftCardPortal()` is not called before every service call, the wrong portal's data is accessed.  
**Fix:** Pass `portalId` as a parameter to every service function (as other services do).

### 4. `toPortalUUID()` called inconsistently
`useInventory` uses raw slug: `.eq("portal_id", portalId)` — not `toPortalUUID(portalId)`.  
All other hooks/services use `toPortalUUID()`. If `inventory_items.portal_id` stores UUIDs, the slug comparison will always fail and the Supabase query will return empty.  
**Risk:** HIGH — inventory data may never load from Supabase.

### 5. `financeCategoryStore.ts` vs `income_categories`/`expense_categories` tables
Two separate category systems with overlapping data. `financeCategoryStore` drives color maps in Recap/Analytics; `income_categories`/`expense_categories` drive budget limits. They can diverge silently.  
**Fix:** Migrate to a single source of truth (Supabase settings tables).
