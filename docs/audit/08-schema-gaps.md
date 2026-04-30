# 08 — Schema Gaps

**Method:** Frontend type definitions vs inferred DB schema from service files.  
**DB live query:** NOT EXECUTED — all findings are inferred from TypeScript types in `src/types/`.

---

## A. The Dual Category System (Major Structural Gap)

The biggest schema gap is the existence of **THREE overlapping category systems**:

### System 1: `financeCategoryStore.ts` (localStorage)
- Type: `FinanceCategory { id, name, slug, icon, color, type: 'income'|'expense', sort_order, is_default, is_active }`
- Used by: `useFinanceSummary` (color maps), `useBudgetData` (expense lists), `Recap.tsx`
- Storage: localStorage under `finance_categories_{portalId}`
- No Supabase table of its own — hydrated from System 2 via `refreshFromSupabase()`

### System 2: `income_categories` + `expense_categories` (Supabase settings tables)
- Used by: `useIncomeCategories()`, `useExpenseCategories()` from `settings/index.ts`
- Managed via: Settings pages → ExpenseCategories.tsx, IncomeCategories.tsx
- Fields: has `monthly_budget` column (used by Recap for budget bars)
- **Does NOT include color field visible in System 1**

### System 3: `finance_transaction_categories` (Supabase, business-oriented)
- Type: `FinanceCategory { id, portal_id, name, slug, type: 'revenue'|'cogs'|'opex'|'other', color, icon, ... }`
- Used by: `useFinanceCategories()`, `Budget.tsx` (for business portals)
- Managed via: Settings → TransactionCategories.tsx
- Serves different purpose (P&L classification) from System 1/2

**Gap:** These three systems can diverge. A category added in System 2 (settings) is only visible in System 1 after `refreshFromSupabase()` is called. System 3 is entirely separate (different types). The frontend joins them client-side with fragile key-matching by category name string.

---

## B. personal_transactions — Frontend vs DB

**Frontend type** (`src/types/finance.ts` PersonalTransaction):
```ts
{
  id, user_id, type, amount, currency, category, subcategory?,
  description, date, payment_method?, is_recurring, recurring_interval?,
  tags?, receipt_url?, cost_classification?, category_id?,
  created_at, updated_at
}
```

**Expected DB columns** (from useTransactions toPersonal() mapping):
- All above fields are mapped — assumed to exist in DB

**Observed in code but possibly absent in DB:**
- `cost_classification` — validated as "cogs"|"opex" in `updateTransaction`, but no migration confirmed
- `category_id` (FK to finance_transaction_categories) — used in filters but FK constraint unknown
- `subcategory` — optional, may be NULL in DB without a category constraint
- `tags` — stored as text/array (type unclear in DB)

---

## C. financial_goals — Frontend vs DB

**Frontend type** (`DbFinancialGoal` from database.ts):
```ts
{
  id, portal_id, name, target, saved, is_achieved, deadline?,
  category?, color?, emoji?, created_at, updated_at
}
```

**Gap:** `saved` field is used as current progress toward `target`. No `current_value` computed from actual transactions — `saved` is manually updated. If a user expects this to auto-calculate from transactions, it will always be 0.

---

## D. investments — Frontend vs DB

**Frontend type** (`Investment` from investmentStore.ts):
```ts
{ id, name, ticker, type, units, avgBuyPrice, currentPrice, color, emoji }
```

**DB type** (`DbInvestment`):
```ts
{
  id, portal_id, user_id, name, ticker?, type, units, avg_buy_price,
  current_price?, currency, color?, emoji?, notes?, created_at, updated_at
}
```

**Gap:** `current_price` in DB is nullable but `currentPrice` in frontend defaults to `avg_buy_price` if null. The real-time price from CoinGecko is NOT stored back to `investments` table — only `crypto_holdings` are price-synced via `crypto_prices`.

---

## E. inventory_items — Key Field Inconsistency

**Frontend type** (`InventoryItem` in useInventory.ts):
```ts
{ id, portal_id, name, brand?, category?, size?, condition, purchase_price,
  listing_price?, sale_price?, sku?, status, platform?, platform_url?,
  platform_listing_id?, purchase_date?, sale_date?, notes?, image_url?,
  description?, amount, item_value, created_at, updated_at }
```

**Critical gap:** `useInventory` queries with `.eq("portal_id", portalId)` where `portalId` is the **slug** (e.g. "sosa").  
All other services use `toPortalUUID(portalId)` which converts slug to UUID.  
If `inventory_items.portal_id` stores UUIDs (consistent with other tables), this query will return 0 rows from Supabase every time. The fallback to localStorage would silently hide this bug.

---

## F. vault_files — Missing portal_id-based Ownership

`vaultFileService.fetchVaultFiles()`:
```ts
.from("vault_files").select("*").eq("portal_id", portalId)   // raw slug, not toPortalUUID
```
Same UUID vs slug inconsistency as inventory_items.

---

## G. social_connections — Missing portal_id Column

The `social_connections` table appears to NOT have a `portal_id` column. It is queried only by `user_id`.  
This is a schema-level gap: to enforce portal isolation, `portal_id` must be added to the table and backfilled.

**Type from database.ts** (inferred):
```ts
{
  id, user_id, platform, account_handle, account_name, is_active,
  connected_at, last_synced_at, ...
  // NO portal_id
}
```

---

## H. subscription_transactions — portal_id Format Mismatch

In `subscriptionProcessor.ts`:
```ts
portal_id: portalId,   // raw slug string
```

If the `subscription_transactions` table's `portal_id` column is UUID type (consistent with other tables), this insert will either:
a) Silently fail (caught by try/catch, ignored) — most likely
b) Insert an invalid UUID string, causing DB constraint violation

**Evidence:** The processor wraps the insert in try/catch with `console.warn` — designed to not crash. So the subscription transaction records are likely never reaching the DB.

---

## I. task_comments — fetchComments Has No portal_id Filter

```ts
export async function fetchComments(taskId: string): Promise<DbTaskComment[]> {
  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    // NO portal_id filter
```

If `task_comments` has a `portal_id` column (which the insert code suggests), the fetch is missing it.  
RLS must enforce this if the column exists.

---

## J. user_profiles — No portal Scoping (Expected)

`user_profiles` is correctly global (scoped by user_id only). But `user_preferences` IS portal-scoped (user_id + portal_id). This is the correct design — preferences can differ per portal.

---

## K. Dead Code / Unused Schema

Files in `src/pages/BusinessFinanceDashboard.tsx`, `BusinessPLPage.tsx`, `BusinessCOGSPage.tsx`, `BusinessOPEXPage.tsx` are not routed.  
If there are matching DB tables for these (e.g. `business_transactions`, `pl_accounts`), they may be orphaned schema with no frontend consumers.  
**Action:** Verify and potentially drop unused tables.

---

## Summary of Schema Gaps

| Gap | Severity | Impact |
|---|---|---|
| social_connections lacks portal_id | CRITICAL | Cross-portal data leak |
| inventory_items queried with slug not UUID | HIGH | Zero Supabase results, silent LS fallback |
| vault_files queried with slug not UUID | HIGH | Zero Supabase results |
| Dual/triple category system | HIGH | Diverging data between store + settings tables |
| subscription_transactions uses raw slug | MEDIUM | Records never reach DB |
| financial_goals saved not auto-calculated | MEDIUM | UX mismatch (manual vs auto) |
| task_comments fetched without portal_id | MEDIUM | Potential cross-portal read |
| crypto_holdings updateHolding no-portal fallback | MEDIUM | Cross-portal update possible |
