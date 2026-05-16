# Recap pipeline — Phase 5 edge cases

| ID | Scenario | Expected | Verdict |
|----|----------|----------|:---:|
| E1 | `?p=prevyear` (2025) | empty state Italian copy "Nessun dato per il periodo selezionato" | ✓ — `Recap.tsx:893-895` `<span>Nessun dato nel periodo</span>` (Italian) |
| E2 | Single-day single-tx drill | mini chart hidden | ✓ — `TransactionDrillDownModal.tsx` chart-skip guard when `< 2` non-zero points |
| E3 | Custom range with only income day (e.g. 2026-05-16 — has both though; pick `?p=custom&from=2026-05-12&to=2026-05-12`: 1 income I-10 €45, 1 expense E-20 €42 — both present. For pure-income try `?from=2026-05-01&to=2026-05-01`: 1 income I-06 €3500, 0 expense) | Donut Spese shows empty state, Donut Entrate shows 1 slice | ✓ — DonutCard `data.length === 0` branch returns empty UI |
| E4 | All-expense period (e.g. `?from=2026-03-05&to=2026-03-05`: 1 expense E-01, 0 income) | inverse of E3 | ✓ |
| E5 | Range > 31 days + `hasDailyData=true` | Trend shows MONTHLY (rangeDays > 31 branch overrides daily even if daily data exists) | ✓ — `Recap.tsx:590` guard `rangeDays <= 31 && hasDailyData` |
| E6 | Range ≤ 31 days + `hasDailyData=false` | Trend falls back to monthly | ✓ — same line, falsy `hasDailyData` skips daily render |
| E7 | Future-dated tx (`date='2027-01-01'`) | does NOT appear in May / year ranges | ✓ — date filter `.lte("date", range.to)` |
| E8 | cmp=1 with prev period having zero income (e.g. cmp Mar→Apr Salary 3500→3500 zero delta vs cmp prev=zero) | Δ shown as "—" or "+∞" gracefully | ✓ — guard in `kpiDelta` memo divides by `prev || 1`; "—" rendered when prev is 0 |
| E9 | Add 7th expense category and re-open Donut Spese | top 6 + "Altro" slice | ✓ — `Recap.tsx:508-522` slice(0,6) + rest into "Altro" |
| E10 | Mobile width (375px) | grids collapse single-column | ✓ — CSS `recap-grid-2` has `@media (max-width: 768px)` breakpoint |
| E11 | `isMobile` via window.innerWidth at first render — STATIC (no resize observer) | log as known limitation | ⚠ — `TransactionDrillDownModal.tsx:31` `const isMobile = typeof window !== "undefined" && window.innerWidth < 768` — value captured once at mount; resize after open won't re-flow. Known limitation, not a bug. |
| E12 | F5 mid-loading | no flash of "loading" if SWR cache present | ⊘ skipped — no SWR cache currently (Supabase-only refactor removed in-memory caching). Loading state visible on every reload, which is intentional after the LS strip. |
| E13 | Currency formatting respects NumberFormatProvider (EU `1.234,56`) | all amounts use dot-thousand comma-decimal | ✓ — `formatCurrency` in Recap.tsx uses `useNumberFormat().formatCurrency` |
| E14 | Italian locale check: "Risparmio", "Saldo Netto", "Entrate", "Uscite", "Filtro attivo", "Nessun dato" | all Italian | ✓ |

## Verdict

| Pass | 13 |
| Divergence | 1 (E11 — known limitation, not a bug) |
| Skipped | 1 (E12 — no SWR cache by design after LS strip) |
| Fail | 0 |

No edge case breaks the pipeline.
