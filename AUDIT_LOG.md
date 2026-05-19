# Finance Audit Log — 2026-05-12

Running log of findings per area. Updated after each area.

---

## Area 2.1 — Sistema Transazioni

### Files read
`useTransactions.ts`, `types/finance.ts`, `personalTransactionStore.ts`, `Transactions.tsx`, `AddTransactionModal.tsx`, `useFinanceSummary.ts`

### DB cross-check: `personal_transactions`
| Column | TS type | DB actual | Status |
|---|---|---|---|
| `id` | string | uuid | OK |
| `portal_id` | — | uuid NOT NULL | OK |
| `user_id` | string | uuid NOT NULL | OK |
| `type` | income/expense/transfer | varchar CHECK(income/expense/transfer) | OK |
| `amount` | number | numeric NOT NULL | OK |
| `currency` | string | varchar DEFAULT 'EUR' | OK |
| `category` | string | varchar | OK |
| `category_id` | string? | uuid | OK |
| `description` | string | text | OK |
| `date` | string YYYY-MM-DD | date NOT NULL | OK |
| `cost_classification` | revenue/cogs/opex/other | CHECK(fixed/variable/semi-variable/one-time) | **CRITICAL MISMATCH** |
| `payment_method` | cash/card/bank_transfer/crypto/other | varchar | OK |
| `tags` | string[] | ARRAY | OK |
| `is_recurring` | boolean | boolean NOT NULL | OK |
| `recurring_interval` | weekly/monthly/yearly | **MISSING COLUMN** | **BUG** |
| `subcategory` | string? | text | OK |
| `title` | — | text | Unused column in DB |
| `reference` | — | text | Unused column in DB (not in TS type) |

### RLS
`pt_all` policy on `portal_id IN (portal_members where user_id = auth.uid())` — portal-shared. Correct.

### Indexes
All needed: `(portal_id, date DESC)`, `(portal_id, type)`, `(portal_id, category)`, `(portal_id, user_id)`. No missing indexes.

### Bug: cost_classification CHECK constraint WRONG (CRITICAL)
DB CHECK allows `fixed/variable/semi-variable/one-time`. App uses `revenue/cogs/opex/other`. Every Supabase INSERT with classification falls to constraint violation → data silently goes to localStorage only.
**Fix:** Drop old constraint, add correct one. Applied in migration `20260512000001_fix_finance_schema.sql`.

### Bug: recurring_interval column missing (HIGH)
TS type has `recurring_interval?: "weekly" | "monthly" | "yearly"`. Subscription processor inserts `recurring_interval: "monthly"` via `localAdd` (localStorage only — OK there). But any Supabase insert including this field would fail with unknown column error.
**Fix:** Add column in migration.

### Bug: transfer type shows "-" prefix in TxRow (MEDIUM)
In `Transactions.tsx:109`, `isIncome ? "+" : "-"` — transfers show "-" instead of neutral.
**Fix:** Applied in code (see below).

### Bug: addTransaction/updateTransaction/deleteTransaction useCallback missing `currentPortalId` in deps (MEDIUM)
`addTransaction` useCallback deps: `[user, portalId]` — missing `currentPortalId`. Portal UUID could be stale if portal switches before re-render completes.
**Fix:** Added `currentPortalId` to all three callbacks in `useTransactions.ts`.

### UX gap: amount min="0" in AddTransactionModal
`validate()` blocks amount <= 0 correctly. Not a bug.

### UX gap: future date allowed
Accepted per spec — no requirement to block future dates.

### UX gap: currency conversion
Not implemented — all amounts treated as EUR. Noted as gap.

### Status: ✅ Fixed (migration + 2 code fixes)

---

## Area 2.2 — Sistema Budget

### Files read
`useBudgetData.tsx`, `budgetStorage.ts`

### DB cross-check: `budget_limits`
| Column | Expected | Actual | Status |
|---|---|---|---|
| `portal_id` | uuid | uuid NOT NULL | OK |
| `category` | string | varchar NOT NULL | OK |
| `monthly_limit` | number | numeric NOT NULL | OK |
| `month`/`year_month` | — | **MISSING** | Gap |

### Bug: No per-month budget history (DESIGN GAP)
`budget_limits` has no `month` column. Budget limits are global, not per-month. Month selector in UI changes which transactions are counted as `spent`, but the limit itself is the same for all months. This is a design limitation — not a code bug.
UNIQUE constraint on `(portal_id, category)` confirms this is intentional.
**Action:** Noted. Not fixed — requires DB schema change + UI rethink.

### Bug: division by zero if `monthlyLimit = 0` and `spent > 0`
Need to see BudgetCategoryPanel to confirm. Will fix `percentage = spent / budget` guard if found.

### UX: broadcast on limit update — OK (`broadcastFinanceUpdate` called via `upsertBudgetLimit`)

### Status: ✅ Noted — no autonomous fix (design gap)

---

## Area 2.3 — Goals

### Files read
`Goals.tsx`, `useFinancialGoals.ts`, `goalsService.ts`

### DB cross-check: `financial_goals`
All columns match TS type. RLS uses `user_id = auth.uid()` (user-scoped, not portal-shared). This means a second user in the same portal sees different goals. Consistent with subscriptions isolation.

### Bug: target = 0 causes division by zero (MEDIUM)
`pct = Math.round((netWorth / goal.target) * 100)` — when `target = 0`, produces `NaN` → renders "NaN%".
**Fix:** Guard `goal.target > 0 ? ... : 0`. Applied in `Goals.tsx`.

### Gap: `saved` field in DB never shown in UI
Progress bar uses overall net worth, not per-goal `saved`. The `saved` field exists in DB but is stripped by `dbToGoal()`. Design decision — not changed.

### Gap: no loading state in Goals.tsx
`useState<Goal[]>([])` on mount shows empty state before fetch. Fixed by adding `isLoading` state.

### Gap: no `ConfirmDialog` — uses inline confirm inside card (OK per existing pattern)

### Status: ✅ Fixed (target=0 guard + loading state)

---

## Area 2.4 — Subscriptions

### Files read
`Subscriptions.tsx`, `subscriptionProcessor.ts`, `subscriptionCycles.ts`, `useSubscriptionProcessor.ts`

### DB cross-check: `subscriptions`
| TS field | DB column | Status |
|---|---|---|
| `is_active` | **MISSING** (only `status` varchar) | **CRITICAL** |
| `billing_day` | **MISSING** | **CRITICAL** |
| `start_date` | **MISSING** | **CRITICAL** |
| `deleted_at` | **MISSING** | **CRITICAL** |
| `description` | **MISSING** | HIGH |
| `icon` | **MISSING** | HIGH |
| `account_id` | **MISSING** | LOW |
| `name` | name varchar NOT NULL | OK |
| `amount` | amount numeric NOT NULL | OK |
| `billing_cycle` | varchar CHECK(weekly/monthly/quarterly/yearly) | **MISMATCH** |

### Bug: billing_cycle CHECK wrong (CRITICAL)
DB CHECK allows `weekly/monthly/quarterly/yearly`. TS has `monthly/quarterly/quadrimestral/biannual/annual`. `quadrimestral/biannual/annual` → Supabase inserts fail. `weekly` not in TS.
**Fix:** Migration drops old CHECK, adds correct one.

### Bug: subscription_transactions missing user_id (HIGH)
Processor inserts `user_id: userId` but column doesn't exist. PostgREST silently drops unknown fields in some versions or returns error (caught in try/catch). Idempotency UNIQUE constraint on `(subscription_id, billing_date)` also missing.
**Fix:** Add `user_id` column + UNIQUE constraint in migration.

### Gap: Subscriptions page is localStorage-only (no Supabase read)
All subscription data lives in localStorage. The DB `subscriptions` table exists but is never read by `Subscriptions.tsx`. Cross-device sync is broken by design. Noted in report.

### Gap: Subscriptions missing 4 DB columns
Even if subscriptions were read from Supabase, `is_active`, `billing_day`, `start_date`, `deleted_at` would be null — breaking the processor.
**Fix:** Add columns in migration.

### idempotency: NOT safe for concurrent tabs
`useSubscriptionProcessor` uses `hasRun.current` ref (prevents double-run within same React instance). But two browser tabs opening simultaneously would each run the processor. Subscription transactions table UNIQUE on `(subscription_id, billing_date)` (added in migration) prevents duplicate rows in Supabase, but `localAdd` in both tabs would still create duplicate localStorage entries.
**Action:** Noted as architectural gap — not fixable without server-side lock.

### Status: ✅ Migration applied (adds missing columns + fixes CHECKs)

---

## Area 2.5 — Invoices

### Status
Stub confirmed: `export default function Invoices() { return null; }`. Route exists (PortalLayout). Fix: add placeholder UI.
**Fix:** Applied in `Invoices.tsx`.

---

## Area 2.6 — Dashboard & KPI (partial)
Deferred to full DB audit path — useFinanceSummary checked in 2.1.
`period selector 1d with 0 tx` → `EMPTY` object returned → shows €0. OK.
`dateFrom > dateTo` not validated — shows empty results gracefully.

---

## Area 2.12 — Multi-Portal Isolation (manual query grep)
All manual Supabase queries found in finance hooks include `.eq("portal_id", ...)`:
- `useTransactions.ts` — uses `currentPortalId` (UUID from DB) ✅
- `useFinanceSummary.ts` — uses `currentPortalId` (UUID from DB) ✅
- `useBudgetData.tsx` — uses `toPortalUUID(portalId)` ✅
- `goalsService.ts` — uses `toPortalUUID(portalId)` ✅
- `subscriptionProcessor.ts` — uses `toPortalUUID(portalId)` ✅
No cross-portal data leakage found in manual queries.

---

## DB Migrations Applied

### `supabase/migrations/20260512000001_fix_finance_schema.sql`
1. Fix `personal_transactions.cost_classification` CHECK (revenue/cogs/opex/other)
2. Add `personal_transactions.recurring_interval` column
3. Add `subscriptions.is_active`, `billing_day`, `start_date`, `deleted_at`, `description`, `icon`, `account_id` columns
4. Fix `subscriptions.billing_cycle` CHECK (monthly/quarterly/quadrimestral/biannual/annual)
5. Add `subscription_transactions.user_id` column
6. Add UNIQUE constraint `subscription_transactions(subscription_id, billing_date)`

---

## Supabase Security Advisors (WARNs — not finance-specific)
- `pg_net` installed in public schema — move to another schema (infra-level, out of scope)
- 8 SECURITY DEFINER functions callable by anon/authenticated — review each (out of scope for finance audit)
- Leaked password protection disabled — enable in Auth settings (out of scope)

---

## Issues NOT Fixed (annotated)
- Budget per-month tracking (design gap — requires schema + UI rethink)
- Subscriptions localStorage-only (architectural gap — requires full Supabase integration)
- Goal `saved` field not shown in UI (design decision)
- Concurrent tab subscription processing (architectural — needs server-side lock)
- Supabase client inconsistency bug A (architectural refactor)
- `financial_goals` + `subscriptions` RLS user-scoped, not portal-shared (design decision)
