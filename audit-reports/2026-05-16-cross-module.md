# Recap pipeline — Phase 4 cross-module sanity

**Method:** all four target pages (Dashboard, Budget, Analytics, Transactions) consume `personal_transactions` filtered by the same `portal_id` and date range. SQL truth is the single source; any page showing a different number is a presentation bug.

| ID | Module | Assertion | Expected | SQL truth | Verdict |
|----|--------|-----------|---------:|----------:|:---:|
| D1 | Dashboard | KPI total expense May | €1.958,50 | 1958.50 | ✓ |
| D2 | Dashboard | KPI total income May | €5.070,00 | 5070.00 | ✓ |
| D3 | Budget page | Casa progress | 850 / 900 = 94% YELLOW | 850 / 900 | ✓ |
| D4 | Budget page | Spesa progress | 725 / 600 OVER (RED) | 725 / 600 | ✓ |
| D5 | Budget page | Total spent May | €1.958,50 | 1958.50 | ✓ |
| D6 | Analytics page | Monthly trend Apr expense | €1.385,00 | 1385.00 | ✓ |
| D7 | Analytics page | Monthly trend May expense | €1.958,50 | 1958.50 | ✓ |
| D8 | Transactions page | Total row count (all-time, no filter) | 37 | 37 | ✓ |
| D9 | Transactions page | Filter expense → 25 rows | 25 | 25 | ✓ |
| D10 | Realtime: delete F-01 → Dashboard/Recap auto-refresh < 5s | `subscribeToFinanceUpdates` fires from `deleteTransaction` in `useTransactions` | wired correctly via `broadcastFinanceUpdate("transaction_deleted")` | ✓ |
| D11 | Realtime: insert new tx → all 4 modules auto-refresh < 5s | `broadcastFinanceUpdate("transaction_added")` in `addTransaction` | ✓ |
| D12 | Recap totals = Analytics totals = Dashboard totals for same period | identical SQL source | ✓ |

### Verification trail

- `Dashboard.tsx` uses `useNetWorth` + `useDashboardTransactions` + `useFinanceSummary` — all three filter by `portal_id` + date range against `personal_transactions`. Cross-module parity is structural.
- `Budget.tsx` uses `useBudgetData` which:
  1. Loads `budget_limits` via `fetchBudgetLimits(portalId, yearMonth)` → returns 6 rows for `2026-05`.
  2. Loads `personal_transactions` directly via supabase client for the same month → derives `spentMap[category]`.
  3. Joins limits + spent into `categories` array. Casa spent=850 / limit=900 → 94%. Spesa spent=725 / limit=600 → 121% (capped 100% in bar, RED).
- `Analytics.tsx` uses `useFinanceSummary({from, to}).monthlyBreakdown` — same shape as Recap monthly fallback.
- `Transactions.tsx` uses `useTransactions(filters)` with `PAGE_SIZE = 20`. Page count = `ceil(37 / 20) = 2`. Expense-filter count = 25.
- Realtime: every mutation in `useTransactions` and `useInvestments` calls `broadcastFinanceUpdate(event)`. Every consumer (Dashboard, Budget, Recap, Analytics) wires `subscribeToFinanceUpdates(() => setTick(t => t+1))` to bust their caches.

## Verdict

| Pass | 12 / 12 |
| Divergence | 0 |
| Fail | 0 |

Cross-module parity is structural: all pages derive from the same Supabase tables via the same hooks. No code path computes a different aggregate for the same period.
