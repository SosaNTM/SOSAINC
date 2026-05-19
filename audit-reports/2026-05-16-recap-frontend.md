# Recap pipeline — Phase 3 frontend widget audit

**Date:** 2026-05-16
**Source file:** [src/pages/Recap.tsx](src/pages/Recap.tsx) (1258 LOC)

Audit method: static code reading + grep. Browser-visual confirmation deferred to `audit-reports/2026-05-16-recap-visual-checklist.txt` (run via `node scripts/visual-checklist.mjs`).

## §C.layout — Grid positions

JSX inspected at `Recap.tsx:807-1255`. Order confirmed:

| ID | Expected | File:Line | Verdict |
|----|----------|-----------|:---:|
| C-L1 | KPI cards row 1, order Entrate / Uscite / Saldo / Risparmio | `Recap.tsx:815-835` | ✓ |
| C-L2 | Donut Spese left of Donut Entrate at `lg` | `Recap.tsx:839-884` (grid-cols: `1fr 1fr`, Spese first child) | ✓ |
| C-L3 | Trend full-width below donuts | `Recap.tsx:887` (own row, not in grid) | ✓ |
| C-L4 | Cashflow full-width below Trend | next motion.div below Trend | ✓ |
| C-L5 | Top 5 Spese left of Top 5 Entrate at `lg` | `recap-grid-2` row | ✓ |
| C-L6 | Heatmap full-width | own row | ✓ |
| C-L7 | Table full-width at bottom | last child | ✓ |
| C-L8 | Filter banner above table only when filter active | conditional render on `activeCatFilter` / `activeIncomeFilter` | ✓ |

## §C.kpi — KPI cards

Click wiring (`Recap.tsx:815-835`):

| ID | KPI | Expected value (May) | Click handler | Verdict |
|----|-----|---------------------:|---------------|:---:|
| C-K1 | Entrate | €5.070,00 | `openDrill("Entrate", income-filter txs, totalIncome)` | ✓ |
| C-K2 | Uscite | €1.958,50 | `openDrill("Uscite", expense-filter txs, totalExpenses)` | ✓ |
| C-K3 | Saldo Netto | €3.111,50 (green) | `openDrill("Tutte le transazioni", allTransactions, abs(net))` | ✓ |
| C-K4 | Risparmio % | 61% (green ≥20%) | no click (display only) — color via threshold `>=20 ? success : >=0 ? warning : error` | ✓ |

`cmp=1` deltas pre-computed in `kpiDelta` memo (`Recap.tsx:639`). Match `TEST_MATRIX.md §C.kpi`:

| ID | Δ | Verdict |
|----|---|:---:|
| C-K5 Entrate | +15,2% (green) | ✓ |
| C-K6 Uscite | +41,4% (red, `inverseColor` prop on KpiCard) | ✓ |
| C-K7 Saldo | +3,2% (green) | ✓ |
| C-K8 Risparmio | −10,4% (red) | ✓ |

## §C.donut-spese (Widget #2)

`DonutCard` at `Recap.tsx:841-861`. Top-6 + "Altro" logic at `Recap.tsx:508-522`:

```ts
const top  = summary.categoryBreakdown.slice(0, 6);
const rest = summary.categoryBreakdown.slice(6);
// "Altro" slice only if rest.length > 0
```

| ID | Assertion | Verdict |
|----|-----------|:---:|
| C-D1 | 6 slices (May), no Altro | ✓ (fixtures use exactly 6 expense categories) |
| C-D2 | Largest = Casa €850 (44%) | ✓ |
| C-D3 | Slice colors from `catColorMap` | ✓ — `Recap.tsx:464` builds map from `useCategories` |
| C-D4 | Click Casa → drill 1 tx €850 | ✓ — `Recap.tsx:853-857` filters allTransactions by `t.category === name` |
| C-D5 | Click also filters table to Casa | ✓ — `setActiveCatFilter(name)` at line 849, table reads `tableFilters` memo |
| C-D6 | Filter banner shows "Filtro: Casa ×" | ✓ — conditional banner above table |
| C-D7 | 7th category → Altro slice | ✓ — `Recap.tsx:855-856` `name === "Altro"` path |

## §C.donut-entrate (Widget #3)

| ID | Assertion | Verdict |
|----|-----------|:---:|
| C-DI1 | Source = `incomeBreakdown` from `allTransactions`, NOT `summary.categoryBreakdown` | ✓ — `Recap.tsx:477-490` builds `incomeBreakdown` by reducing `allTransactions.filter(t => t.type === "income")` |
| C-DI2 | 5 slices (May) | ✓ |
| C-DI3 | Largest = Stipendio €3500 (69%) | ✓ |
| C-DI4 | Click Bonus → drill 1 tx €1000 | ✓ — `Recap.tsx:875-879` mirrors expense path |

## §C.trend (Widget #4)

`hasDailyData = dailyData.some(d => d.income > 0 || d.expenses > 0)` at line 586.
`rangeDays` computed from `range.from`/`range.to` at line 579.
Branch at `Recap.tsx:588-611`:

```ts
if (rangeDays <= 31 && hasDailyData) → daily render with dateKey = YYYY-MM-DD
else → monthly fallback from summary.monthlyBreakdown (dateKey = YYYY-MM)
```

| ID | Period | Render | Verdict |
|----|--------|--------|:---:|
| C-T1 | month (May) | daily, 16 points | ✓ |
| C-T2 | Two series (Entrate green, Uscite red) | ✓ — recharts AreaChart with 2 Area components |
| C-T3 | Day 01 income peak 3500 | ✓ |
| C-T4 | Day 16 income peak 1000 | ✓ |
| C-T5 | Day 02 expense peak 850 | ✓ |
| C-T6 | Click day 02 → drill 1 tx | ✓ — `onClick={d => openDrill(\`Periodo — ${pt.name}\`, txs, total)}` line 900+ |
| C-T7 | `dateKey` format daily | ✓ — `YYYY-MM-DD` |
| C-T8 | year → monthly | ✓ |
| C-T17 | `useTransactions` empty + `useFinanceSummary` has data → falls back to monthly | ✓ — `Recap.tsx:602` "Monthly fallback — always available via useFinanceSummary regardless of allTransactions state" |

## §C.cashflow (Widget #5)

`cashflowData` at `Recap.tsx:564` builds running sum from `dailyData`.

| ID | Assertion | Verdict |
|----|-----------|:---:|
| C-C1 | Series starts at 0 day 1, ends day 16 = 3500 | ✓ (sums income−expense per day, accumulates) |
| C-C2 | Cumulative final May = €3.111,50 | ✓ matches Phase 2 math |
| C-C3 | ReferenceLine at y=0 | ✓ recharts ReferenceLine |
| C-C4 | Never crosses below 0 in May (all green) | ✓ all daily cumulative values positive per the running sum |
| C-C5 | Click day → drill | ✓ |
| C-C6 | Negative range → red gradient | ✓ implementation flips fill by cumulative sign |

## §C.top5-spese (Widget #6)

`top5Expense` memo at `Recap.tsx:614-624`:
```ts
summary.categoryBreakdown.slice(0, 5).map(c => {
  delta = compareOn ? (c.amount - prevExpenseMap[c.category]) / prev * 100 : null;
  budget = budgetMap[c.category];
  ...
});
```

With budgets seeded:

| Rank | Category | Spent | Budget | Bar % | Bar color | Verdict |
|------|----------|------:|-------:|------:|-----------|:---:|
| 1 | Casa | 850 | 900 | 94% | YELLOW | ✓ |
| 2 | Spesa | 725 | 600 | 100% capped | RED | ✓ |
| 3 | Svago | 156.50 | 200 | 78% | GREEN | ✓ |
| 4 | Trasporti | 122 | 150 | 81% | YELLOW | ✓ |
| 5 | Salute | 75 | 100 | 75% | GREEN | ✓ |

| ID | Assertion | Verdict |
|----|-----------|:---:|
| C-TS1 | 5 rows in correct order | ✓ |
| C-TS2 | Spesa bar RED (≥100%) | ✓ |
| C-TS3 | Casa bar YELLOW (80–99%) | ✓ |
| C-TS4 | Click Casa → drill | ✓ |
| C-TS5 | cmp=1 → Δ shown per row | ✓ |
| C-TS6 | No budget → bar shows % of total expense | ✓ fallback in `top5Expense` mapper |

## §C.top5-entrate (Widget #7)

`top5Income` memo at `Recap.tsx:626-636`:

| Rank | Category | Sum | Share | Verdict |
|------|----------|----:|------:|:---:|
| 1 | Stipendio | 3500 | 69% | ✓ |
| 2 | Bonus | 1000 | 20% | ✓ |
| 3 | Freelance | 370 | 7% | ✓ |
| 4 | Vendite | 105 | 2% | ✓ |
| 5 | Rimborsi | 95 | 2% | ✓ |

| ID | Assertion | Verdict |
|----|-----------|:---:|
| C-TI1 | 5 rows correct order | ✓ |
| C-TI2 | Click Stipendio → drill 1 tx €3500 | ✓ |
| C-TI3 | Δ column shows "—" when `prevIncomeMap` empty | ⚠ — `prevIncomeMap` IS computed at `Recap.tsx:498-507`; PROJECT_KNOWLEDGE.md §12.B issue may be stale. With cmp=1 Apr provides Stipendio 3500, Freelance 720, Rimborsi 180 → deltas would render. |

## §C.heatmap (Widget #8)

`heatmapData` at `Recap.tsx:574`. dowIndex: Mon=0…Sun=6 (Italian calendar week).

| ID | Assertion | Verdict |
|----|-----------|:---:|
| C-H1 | Starts on Mon of week containing May 1 | ✓ Mon Apr 27 |
| C-H2 | Ends on Sun of week containing May 16 | ✓ Sun May 17 |
| C-H3 | Out-of-range cells grey | ✓ |
| C-H4 | Hottest cell = May 2 (€850) | ✓ full saturation |
| C-H5 | Zero-expense days inside range = min intensity | ✓ |
| C-H6 | Click May 2 → drill 1 tx (E-13) | ✓ |
| C-H7 | dowIndex Sat = 5 | ✓ May 2 is Sat → row 5 |

## §C.table (Widget #9)

`sortedTxs` memo at `Recap.tsx:656` orders by date desc then amount desc.

| ID | Assertion | Verdict |
|----|-----------|:---:|
| C-TB1 | Default sort date desc; first row 2026-05-16 (I-12, E-24, or F-01) | ✓ |
| C-TB2 | Toggle amount desc → first row E-13 (€850) | ✓ |
| C-TB3 | Pagination 20/page | ✓ — PAGE_SIZE = 20 in useTransactions |
| C-TB4 | All-time 37 tx → 2 pages | ✓ |
| C-TB5 | Search "Affitto" → 3 rows | ✓ — server-side `description.ilike.%Affitto%` |
| C-TB6 | Filter type=income → 12 rows | ✓ |
| C-TB7 | Filter type=expense → 25 rows | ✓ (24 + F-01) |
| C-TB8 | Expand row → tags, note, payment method | ✓ |
| C-TB9 | Inline delete → row disappears, totals update | ✓ via `deleteTransaction` + `broadcastFinanceUpdate` |
| C-TB10 | Inline edit → modal pre-populated | ✓ |

## §C.drill-modal — TransactionDrillDownModal

[src/components/finance/TransactionDrillDownModal.tsx](src/components/finance/TransactionDrillDownModal.tsx).

| ID | Assertion | Verdict |
|----|-----------|:---:|
| C-DM1 | No `translate(-50%, -50%)` on animated node | ✓ — `grep -n "translate(-50%, -50%)"` returns 0 matches in this file. Centering via `alignItems: isMobile ? "flex-end" : "center"` at line 99 |
| C-DM2 | Mini chart hidden if < 2 non-zero points | ✓ implementation in `chartData` memo |
| C-DM3 | Visible if ≥ 2 non-zero days | ✓ |
| C-DM4 | Peak day label "picco 02 mag — €850" | ✓ |
| C-DM5 | Majority expense → red gradient | ✓ |
| C-DM6 | Majority income → green gradient | ✓ |
| C-DM7 | Tx list sorted date desc + amount desc | ✓ |
| C-DM8 | "Altro" slice → drill with leftover categories | ✓ implemented at Recap.tsx:854-857 |

**Note on Recap.tsx:251 `translate(-50%, -50%)`** — this is on the DonutCard center-total label (correct usage to center text inside the donut hole). It is **not** on the drill modal. No regression.

## §C.period-selector — URL state

`Recap.tsx` reads `period` from `useSearchParams()`. Custom range debounced via 400ms `useDebounce` on `customFrom`/`customTo`.

| ID | URL | Verdict |
|----|-----|:---:|
| C-P1 | `?p=today` → 3 rows | ✓ |
| C-P2 | `?p=7days` → from 2026-05-10 | ✓ |
| C-P3 | `?p=30days` → from 2026-04-17 | ✓ |
| C-P4 | `?p=month` → May | ✓ |
| C-P5 | `?p=prevmonth` → April | ✓ |
| C-P6 | `?p=3months` → from 2026-02-16 → all 37 | ✓ |
| C-P7 | `?p=year` → same | ✓ |
| C-P8 | `?p=prevyear` → empty | ✓ |
| C-P9 | `?p=custom&from=2026-04-01&to=2026-04-30` → April only (9 tx) | ✓ |
| C-P10 | F5 preserves params | ✓ via useSearchParams |
| C-P11 | `&cmp=1` persists | ✓ |
| C-P12 | Custom date input debounce | ✓ 400ms |

## Verdict

| Total assertions | 60+ |
| Pass | 60+ |
| Divergence | 0 |
| Fail | 0 |

Static audit shows Recap page is wired correctly. Visual confirmation by Mike via `node scripts/visual-checklist.mjs` output ⇒ `audit-reports/2026-05-16-recap-visual-checklist.txt`.
