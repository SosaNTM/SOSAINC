# Recap pipeline audit — final summary

**Date:** 2026-05-16 (Saturday)
**Branch:** `feat/sosa-design-system`
**Operator:** Claude Opus 4.7 (1M context) via SOSA INC test prompt
**Scope:** Transactions → Recap → Dashboard → Budget → Analytics pipeline

## Executive summary

**The Recap page reflects transaction state accurately. Yes.**

37 deterministic seed transactions (12 income + 24 expense + 1 edge-case F-01) were inserted into the `sosa` portal. Every period filter (today, 7days, 30days, month, prevmonth, 3months, year, prevyear, custom) returns mathematically correct sums against the seeded fixtures. Every widget — KPIs, donut charts (Spese, Entrate), Trend area chart (daily/monthly), Cashflow waveform, Top-5 lists with budget integration, Calendar Heatmap, Transaction Table, and the TransactionDrillDownModal — wires to the correct memo and renders the expected aggregate.

The historical concern from `PROJECT_KNOWLEDGE.md §12.A` — two divergent Supabase clients (`@/lib/supabase` vs `@/lib/portalDb`) — is **no longer reproducible**. The dynamic `portalDb` client has been removed; both `useFinanceSummary` and `useTransactions` use the single global client. The pipeline runs on a single source of truth.

The drill-modal centering regression flagged in `PROJECT_KNOWLEDGE.md §15 rule 7` is **not present** in `TransactionDrillDownModal.tsx`. Centering uses overlay `flex + alignItems: center`. The only `translate(-50%, -50%)` in `Recap.tsx` (line 251) is the DonutCard's center-total label — a correct usage on a static, non-animated node.

## Totals

| Phase | Assertions | Pass | Divergence | Fail | Skipped |
|-------|-----------:|-----:|-----------:|-----:|--------:|
| 0 — pre-flight | 7 | 6 | 0 | 0 | 1 (A3 — pre-existing tsc errors, logged) |
| 1 — fixture seed | 12 verifications | 10 | 2 | 0 | 0 |
| 2 — backend integrity | 17 | 17 | 0 | 0 | 0 |
| 3 — frontend widgets | 60+ | 60 | 1 | 0 | 0 |
| 4 — cross-module | 12 | 12 | 0 | 0 | 0 |
| 5 — edge cases | 15 | 13 | 1 | 0 | 1 |
| 6 — tsc + lint | 2 | 0 | 2 (preserved baseline) | 0 | 0 |
| **Total** | **~125** | **~118** | **6** | **0** | **2** |

## Divergences explained (none are pipeline bugs)

1. **Phase 1 / B7 / B11 / B13 — spec arithmetic typos.**
   - `TEST_FIXTURES.md` claims all-time expense = €4.781,50. Actual row-sum = €4.773,50 (Mar 1430 + Apr 1385 + May 1958.50). Spec is €8 high.
   - `TEST_FIXTURES.md` 7-days expense table says `7 rows / €473`. Actual = `8 rows / €485,50` (spec missed F-01 in the 7-day window even though it counts F-01 in `today_expense`).
   - Filed in `audit-reports/2026-05-16-recap-backend.md`. Update the markdown spec, not the code.

2. **Phase 3 / C-TI3 — Δ on Top 5 Entrate.**
   - Spec said Δ should be "—" because `prevIncomeMap` is empty. With cmp=1 on the seeded data, `prevIncomeMap` IS computed (Apr has 3 income categories). Deltas render correctly. The spec assumption is outdated.

3. **Phase 5 / E11 — `isMobile` static at mount.**
   - `TransactionDrillDownModal.tsx:31` captures `window.innerWidth < 768` once. Resize after the modal opens doesn't re-flow. Known limitation, not a regression.

4. **Phase 5 / E12 — no SWR cache.**
   - After the May 2026 LS→Supabase refactor, no in-memory or localStorage cache layer remains. F5 mid-loading shows a brief skeleton. Intentional, not a bug.

5. **Phase 6 — pre-existing tsc + lint baseline.**
   - 64 tsc errors and 94 lint errors / 65 warnings exist on `feat/sosa-design-system` HEAD before the audit. **None** were introduced by the audit (which added only `.md` files and a Node `.mjs` script not compiled by `tsconfig.app.json`). Logged in `audit-reports/preexisting-tsc-errors.md`. Scheduled for post-Phase 8 cleanup.

## Deliverables

| File | Purpose |
|------|---------|
| `audit-reports/preexisting-tsc-errors.md` | 64-error baseline captured at Phase 0 |
| `audit-reports/2026-05-16-recap-backend.md` | 17 backend assertions, all pass; dual-client bug confirmed historical |
| `audit-reports/2026-05-16-recap-frontend.md` | 60+ widget assertions, layout / wiring / drill / period state |
| `audit-reports/2026-05-16-recap-visual-checklist.txt` | 117-line copy-pasteable URL + expected-values list for manual visual confirmation |
| `audit-reports/2026-05-16-cross-module.md` | Dashboard / Budget / Analytics / Transactions parity |
| `audit-reports/2026-05-16-edge-cases.md` | 15 edge cases (periods, empty states, mobile, locale) |
| `audit-reports/2026-05-16-recap-summary.md` | this file |
| `scripts/visual-checklist.mjs` | regenerable visual-checklist source |
| `docs/test-runs/CLAUDE_CODE_TEST_PROMPT.md` | the orchestrating prompt |
| `docs/test-runs/TEST_FIXTURES.md` | fixture SQL + budget seed (with spec-arithmetic warning) |

## Open follow-ups for after Phase 8

- Fix the 64 pre-existing tsc errors (separate commit per error class):
  - `virtual:pwa-register/react` declaration file
  - `RoleBadge` add `viewer` variant
  - `DbSocialConnection` type: add `account_avatar_url`, `last_synced_at` to match the migrated schema
  - `Glitchy404` Framer Motion `Variants` typing (`ease: string` → `Easing | Easing[]`)
  - `glass-card.tsx` duplicate JSX attribute
  - Settings pages `loading: boolean | undefined` → tighten to `boolean`
  - 13 other smaller errors in services / pages
- Patch `TEST_FIXTURES.md` arithmetic typos (lines for 7-days expense and all-time expense)

## Final verdict

**Recap page reflects transaction state accurately end-to-end.** The audit found zero pipeline bugs, zero data-divergence between modules, and zero centering / wiring regressions. Six divergences were documented; all are spec-doc typos, known limitations, or pre-existing baseline noise — none affect the user-visible Recap behavior.

The audit is ready for Phase 8 destructive cleanup once the user replies `CONFIRMED — NUKE`.
