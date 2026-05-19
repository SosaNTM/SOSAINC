# 08 — Implementation Plan

Ogni step è committabile da solo. Gli step 1-3 sono prerequisiti bloccanti. Dal 4 in poi gli step possono essere eseguiti ma dipendono sempre dal 3.

---

## Step 1 — Modifica `useTransactions` per esporre `allTransactions`

**File toccato:** `src/hooks/useTransactions.ts`

**Cosa fare:**
1. Aggiungere `allTransactions: PersonalTransaction[]` a `UseTransactionsResult`
2. Nel return, aggiungere `allTransactions: all` (l'array già esistente nello state)
3. Aggiornare tipo `UseTransactionsResult` di conseguenza

**Perché questo step è il primo:** tutti i widget di aggregazione (cashflow, heatmap, income breakdown) dipendono da `allTransactions`. Senza questo, non si può procedere.

**Test:** verificare che Transactions.tsx e altri consumer non si rompano (field aggiuntivo, non breaking).

---

## Step 2 — `useDebounce` hook + helper funzioni periodo

**File toccati:** `src/hooks/useDebounce.ts` (nuovo), `src/pages/Recap.tsx`

**Cosa fare:**
1. Creare `src/hooks/useDebounce.ts`:
   ```typescript
   export function useDebounce<T>(value: T, delay: number): T { ... }
   ```
2. Aggiungere helper di range mancanti in `src/hooks/useFinanceSummary.ts`:
   - `lastNDaysRange(n: number): DateRange`
   - `lastMonthRange(): DateRange`
   - `lastYearRange(): DateRange`

**Test:** verificare che i range prodotti siano corretti per ogni preset.

---

## Step 3 — Riscrittura scaffold Recap.tsx + URL state + periodo selector

**File toccato:** `src/pages/Recap.tsx` (riscrittura completa)

**Cosa fare:**
1. Rimuovere il Recap.tsx attuale (scaffold limitato)
2. Nuovo Recap.tsx con:
   - Import `useSearchParams`, `useDebounce`
   - Tutti i 9 preset periodo + range custom debounced
   - Toggle comparazione `compareEnabled`
   - `getRange()`, `getPrevRange()` aggiornati con nuovi preset
   - Tutti gli state client (filtri, drill-down, sorting, pagination)
   - `activeFilters` memo
   - Hook calls: `useFinanceSummary(range)`, `useFinanceSummary(prevRange)` (solo se compareEnabled), `useTransactions(activeFilters)`, `allTransactions` via modifica step 1
   - Tutti i `useMemo` per derivazioni (incomeBreakdown, cashflowData, heatmapData, trendData, top5, pieData)
   - Layout base con placeholder per ogni widget (div grigio con label)
   - LiquidGlassFilter + header + period selector + compare toggle

**Non implementare ancora:** i singoli widget, solo la struttura e il data layer.

**Test:** verificare che il cambio periodo triggeri refetch, URL si aggiorni, reset filtri funzioni.

---

## Step 4 — KPI Cards (Widget 1)

**File toccato:** `src/pages/Recap.tsx` (aggiunta componente `KpiCards`)

**Cosa fare:**
1. Sostituire il placeholder KPI con componente `KpiCards`
2. `KpiCards` riceve: `summary`, `prevSummary`, `compareEnabled`, `isLoading`, `onCardClick`
3. Rendering: 4 card con valore, delta, skeleton loading
4. Delta logic: calcolo Δ% con gestione divisione per zero
5. `onCardClick(type)` → setta `drillDownData` e apre modal

**Test:** valori corretti, delta corretto, click apre modal (anche se modal è ancora vuoto).

---

## Step 5 — `TransactionDrillDownModal`

**File creato:** `src/components/finance/TransactionDrillDownModal.tsx`

**Cosa fare:**
1. Props: `{ open, onClose, title, totalAmount, transactions, isLoading }`
2. Desktop: `Dialog` Radix con lista scrollabile
3. Mobile: `Drawer` Radix con bottom sheet
4. Lista: data, emoji categoria, titolo, importo colorato
5. Footer: "Vedi tutte nella tabella" → `onClose()` + `setActiveCatFilter(title)`

**Test:** aprire da KPI card, verificare lista corretta, testare mobile bottom sheet.

---

## Step 6 — Donut Spese + Donut Entrate (Widget 2 & 3)

**File toccato:** `src/pages/Recap.tsx` (sostituisce placeholder)

**Cosa fare:**
1. Componente `DonutCard` riusabile: riceve `data[]`, `title`, `total`, `isLoading`, `onSliceClick`
2. `PieChart` con `activeIndex` state, `outerRadius={90}`, `innerRadius={55}`
3. Testo al centro del donut (absolute positioned, z=10)
4. Legenda inline sotto
5. `onSliceClick(categoryName)` → setta `activeCatFilter`

**Test:** click su slice filtra tabella (tabella non ancora fatta ma lo state si aggiorna), tooltip corretto.

---

## Step 7 — Area Chart Trend (Widget 4)

**File toccato:** `src/pages/Recap.tsx`

**Cosa fare:**
1. `AreaChart` con `type="monotone"`, due `Area` (income + expenses)
2. `defs/linearGradient` per fill area semitrasparente
3. Logica granularità: giornaliero (≤31g) vs mensile (>31g) da `trendData` memo
4. Click su barra/area → setta `activePeriodFilter`

**Test:** cambiare tra "questo mese" (giornaliero) e "3 mesi" (mensile), verificare switch corretto.

---

## Step 8 — Cashflow Waveform (Widget 5)

**File toccato:** `src/pages/Recap.tsx`

**Cosa fare:**
1. `AreaChart` con singola `Area` per `cumulative`
2. `defs/linearGradient` bicolore: verde se sopra 0, rosso se sotto
3. `ReferenceLine y={0}` come baseline
4. `cashflowData` memo da `allTransactions`
5. Click → setta `activeDateFilter`

**Test:** verificare che il cumulative parta da 0 e si aggiorni giorno per giorno.

---

## Step 9 — Top Liste (Widget 6 & 7)

**File toccato:** `src/pages/Recap.tsx`

**Cosa fare:**
1. Componente `TopList` (refactor da quello esistente in Recap.tsx)
2. Aggiungere: barra di progresso (con budget mensile se disponibile)
3. Delta con ↑↓ arrow invece di solo testo
4. Click su item → setta `drillDownData` + apre modal
5. Connettere `useExpenseCategories()` per monthly_budget

**Test:** click su item apre modal con le transazioni corrette di quella categoria.

---

## Step 10 — Heatmap Calendario (Widget 8)

**File creato:** `src/components/finance/CalendarHeatmap.tsx`

**Cosa fare:**
1. Estratto in componente separato (è il più complesso visivamente)
2. Props: `{ data: {date: string, amount: number}[], range: DateRange, onDayClick }`
3. Griglia 7 colonne × n settimane, generata dinamicamente
4. Colore cella: interpolazione tra `var(--glass-bg)` e `var(--color-error)` proporzionale a importo
5. Max amount per normalizzazione colore
6. Tooltip on hover: data, importo, n° transazioni
7. Click → `onDayClick(date)` → setta `activeDateFilter`
8. Mobile: scroll orizzontale con `overflow-x: auto`

**Test:** hover su cella, click filtra tabella, empty days grigie.

---

## Step 11 — Tabella transazioni (Widget 9)

**File toccato:** `src/pages/Recap.tsx`

**Cosa fare:**
1. Toolbar: type filter, category filter (dinamico), search input, clear button
2. Banner "filtro attivo" se `activeCatFilter || activePeriodFilter || activeDateFilter`
3. Tabella con header cliccabili per sort (client-side su `transactions`)
4. Riga espandibile (click su riga): mostra tags, note, metodo dettagliato
5. Edit icon → `AddTransactionModal` in edit mode
6. Delete icon → confirm inline
7. Paginazione con `page`/`hasMore`/`setPage`
8. Mobile: colonne ridotte

**Test:** tutti i filtri funzionano, sort funziona, edit/delete funzionano, paginazione corretta.

---

## Step 12 — Polish + responsive + test

**File toccato:** `src/pages/Recap.tsx`, `src/components/finance/TransactionDrillDownModal.tsx`, `src/components/finance/CalendarHeatmap.tsx`

**Cosa fare:**
1. Responsive breakpoints per tutti i widget
2. Period selector → dropdown select su mobile (< 480px)
3. Verificare animazioni stagger corrette
4. Verificare accessibilità (aria-label chart, aria-pressed period buttons)
5. Verificare empty states per ogni widget
6. Verificare error states
7. `npx tsc --noEmit` clean
8. Test su mobile viewport

---

## Riepilogo file per step

| Step | File creati | File modificati |
|------|------------|-----------------|
| 1 | — | `src/hooks/useTransactions.ts` |
| 2 | `src/hooks/useDebounce.ts` | `src/hooks/useFinanceSummary.ts` |
| 3 | — | `src/pages/Recap.tsx` (riscrittura) |
| 4 | — | `src/pages/Recap.tsx` |
| 5 | `src/components/finance/TransactionDrillDownModal.tsx` | `src/pages/Recap.tsx` |
| 6 | — | `src/pages/Recap.tsx` |
| 7 | — | `src/pages/Recap.tsx` |
| 8 | — | `src/pages/Recap.tsx` |
| 9 | — | `src/pages/Recap.tsx` |
| 10 | `src/components/finance/CalendarHeatmap.tsx` | `src/pages/Recap.tsx` |
| 11 | — | `src/pages/Recap.tsx` |
| 12 | — | tutti |

**Totale file nuovi:** 3  
**Totale file modificati:** 4
