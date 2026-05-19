# 03 — Orphans

## A. DB Tables with No Verified Frontend Reference

These tables are referenced in code but have no confirmed page/component consuming them, OR are expected
from the schema but never mentioned in any service file scanned.

| Tabella | Status | Note |
|---|---|---|
| `subscriptions` | Referenced only in `subscriptionProcessor.ts` for update, not for CRUD UI | No dedicated subscriptions CRUD page — the Channels page (`/channels`) shows subscription list via `useDashboardSubscriptions` but the full CRUD appears to be elsewhere or incomplete |
| `subscription_transactions` | INSERT only in `subscriptionProcessor.ts` — no read UI found | Used as audit trail; no admin page reads it |
| `social_analytics_snapshots` | Read by `SocialAnalyticsDashboard` — INSERT/UPDATE never seen in frontend code | Data presumably inserted by a backend job/edge function (not visible in frontend code) |
| `gift_card_brands` | Read by `giftCardService.fetchBrands()` — no admin page to manage brands | Falls back to LOCAL_BRANDS hardcoded list; no DB management UI |
| `vault_item_history` | INSERT in `logVaultAccess()`; no UI reads it | Audit log for vault; no history viewer page found |
| `crypto_prices` | Read by `cryptoService.fetchAllPrices()` — no INSERT from frontend (prices come from CoinGecko API) | DB table acts as price cache; write path not found in frontend |
| `portal_members` | Read in `auditLogService` pre-check and `portalContextDB` — no dedicated management UI | Portal member management is likely handled in AdministrationPage but not confirmed |

---

## B. Frontend Sections with No DB Table (localStorage only or mock)

| Sezione / Rotta | Pagina | Data Source | Reason |
|---|---|---|---|
| Cloud storage (metadata) | `src/pages/cloud/CloudPage.tsx` | `cloudStore.ts` uses empty `INITIAL_FOLDERS`, `INITIAL_FILES` arrays | `cloudStore.ts` is a **mock/type file only** — `INITIAL_FOLDERS = []`, `INITIAL_FILES = []`. Real data comes from `cloudService.ts` (Supabase). The mock is vestigial. |
| Finance categories (color map) | Multiple | `financeCategoryStore.ts` (localStorage) | Category COLORS live in localStorage only — NOT in Supabase `income_categories`/`expense_categories` (which have color field). There are TWO parallel category systems. See `08-schema-gaps.md`. |
| Budget limits (local cache) | `Budget.tsx` | `budgetStorage.ts` (localStorage) | Supabase `budget_limits` is the source of truth, but the hook reads localStorage first and only hydrates from Supabase in background. Stale local data can persist. |
| Audit log (local) | `AdministrationPage.tsx` | `adminStore.ts` (localStorage) | There is a local `addAuditEntry` in `src/lib/adminStore.ts` AND a Supabase `auditLogService.ts`. Both coexist — two separate audit stores. |
| Investment store (local) | `Dashboard/Investments` | `investmentStore.ts` (localStorage) | Supabase is primary via `investmentService`, but `investmentStore.ts` is a separate localStorage store used as cache AND as source during initial render. |

---

## C. Hook Files Defined but Suspect Usage

| Hook / File | Imported by | Note |
|---|---|---|
| `src/hooks/useCategories.ts` | Not found in any page scan | Likely legacy hook — `useFinanceCategories` and `useExpenseCategories`/`useIncomeCategories` from settings/index.ts serve the same purpose |
| `src/hooks/useMigration.ts` | Not found in any page scan | Migration hook — purpose unclear. May run once on app start or be unused. |
| `src/hooks/useNetWorth.ts` | Not found in any page scan | Net worth calculation hook — may be used in Dashboard but not found in explicit imports during this scan |
| `src/hooks/useDashboardSubscriptions.ts` | Dashboard.tsx (likely) | Uses `usePortal()` (legacy). Correct function but uses legacy context. |
| `src/hooks/useKeyboardShortcuts.ts` | Not found in any page scan | May be registered at App level but not confirmed |
| `src/portals/finance/hooks/useBusinessFinance.ts` | Not found in any page scan | Business finance hook — related to removed business finance sub-pages? |
| `src/portals/finance/hooks/useSubscriptionProcessor.ts` | Not confirmed | Wraps subscriptionProcessor — not confirmed as imported in Subscriptions page |
| `src/portals/finance/hooks/useGiftCardDetail.ts` | `GiftCardDetailPanel.tsx` likely | Not scanned |
| `src/portals/finance/hooks/useGiftCardsSummary.ts` | `GiftCardsPage.tsx` likely | Not scanned |
| `src/portals/finance/hooks/useCryptoPortfolio.ts` | `CryptoPage.tsx` likely | Not scanned |
| `src/portals/finance/hooks/useCryptoChart.ts` | `CryptoDetailPopup.tsx` likely | Not scanned |
| `src/portals/finance/hooks/useCoinSelector.ts` | Modal likely | Not scanned |

---

## D. Pages Found in Glob but Not in App.tsx Routes (Likely Dead Code)

| Pagina | File | Status |
|---|---|---|
| `BusinessFinanceDashboard.tsx` | `src/pages/BusinessFinanceDashboard.tsx` | Not in App.tsx routes — dead code, superseded |
| `BusinessPLPage.tsx` | `src/pages/BusinessPLPage.tsx` | Not in App.tsx routes — dead code |
| `BusinessCOGSPage.tsx` | `src/pages/BusinessCOGSPage.tsx` | Not in App.tsx routes — dead code |
| `BusinessOPEXPage.tsx` | `src/pages/BusinessOPEXPage.tsx` | Not in App.tsx routes — dead code |
| `Dashboard.tsx` (root pages/) | `src/pages/Dashboard.tsx` | Not in App.tsx — replaced by `src/pages/dashboard/Dashboard.tsx` |
| `Settings.tsx` (root pages/) | `src/pages/Settings.tsx` | Not in App.tsx — replaced by settings/* routes |
| `HomePage.tsx` | `src/pages/HomePage.tsx` | Not in App.tsx — dead code |
| `Investments.tsx` (root pages/) | `src/pages/Investments.tsx` | Not in App.tsx — superseded by dashboard widgets |
| `cloud/CloudPage.tsx` | `src/pages/cloud/CloudPage.tsx` | Not in App.tsx (App imports from `src/pages/CloudPage.tsx`, not `cloud/`) — possibly dead code or a different version |
