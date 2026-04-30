# 06 — Reactivity Architecture

## Flusso dati: DB → componente

```
Supabase personal_transactions
         │
         ▼
  useTransactionsAll(filters)          useFinanceSummary(range)
         │                                      │
         │  (limit=2000, portal-scoped)          │  (select type,amount,category,date)
         │                                      │
         ▼                                      ▼
  allTransactions[]                    summary { totalIncome, totalExpenses,
         │                                      monthlyBreakdown[], categoryBreakdown[] }
         │                                      │
         ├──────────────────┬───────────────────┘
         │                  │
         ▼                  ▼
  incomeBreakdown      expensePieData / barData / top5Expense
  cashflowData         KPI values + deltas (con prevSummary)
  heatmapData
  dailyTrendData
         │
         ▼
  activeFilters (period + widget clicks)
         │
         ▼
  useTransactions(activeFilters)   ← per tabella paginata
         │
         ▼
  transactions[]  (pagina corrente)
```

---

## Gerarchia state

### Server state (remoto, cachato)

Gestito dai hook custom con pattern SWR + localStorage:

| State | Hook | Invalidazione |
|-------|------|---------------|
| Aggregazioni periodo corrente | `useFinanceSummary(range)` | `financeRealtime` event |
| Aggregazioni periodo precedente | `useFinanceSummary(prevRange)` | `financeRealtime` event |
| Tutte le transazioni del range | `useTransactionsAll({dateFrom, dateTo})` | `financeRealtime` event |
| Transazioni filtrate (tabella) | `useTransactions(activeFilters)` | `financeRealtime` event |
| Categorie spesa (budget) | `useExpenseCategories()` | `usePortalData` SWR |

### Client state (locale, in Recap.tsx)

```typescript
// Periodo
const [period, setPeriod] = useState<Period>(initialPeriod);  // da searchParams
const [customFrom, setCustomFrom] = useState<string>(...);
const [customTo, setCustomTo] = useState<string>(...);
const [compareEnabled, setCompareEnabled] = useState(false);

// Filtri interattivi (da click su widget)
const [activeCatFilter, setActiveCatFilter] = useState<string | null>(null);
const [activePeriodFilter, setActivePeriodFilter] = useState<string | null>(null); // "2026-03"
const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);    // "2026-03-15"

// Filtri toolbar tabella
const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
const [searchQuery, setSearchQuery] = useState("");

// UI state
const [drillDownOpen, setDrillDownOpen] = useState(false);
const [drillDownData, setDrillDownData] = useState<DrillDownPayload | null>(null);
const [tableSortField, setTableSortField] = useState<"date" | "amount">("date");
const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("desc");
const [tablePage, setTablePage] = useState(0);
```

---

## Strategia invalidazione / refetch

**Trigger:** `subscribeToFinanceUpdates(callback)` in `financeRealtime.ts`

Questo listener è già integrato in `useTransactions` e `useFinanceSummary`. Ogni mutazione (add/update/delete transaction) emette un broadcast → tutti i hook in ascolto incrementano `tick` → `load()` viene rieseguito.

**Flusso aggiornamento ottimistico quando utente aggiunge transazione da Recap:**

1. User clicca "+" → apre `AddTransactionModal`
2. User salva → `addTransaction()` in `useTransactions`
3. `broadcastFinanceUpdate("transaction_added")` emesso
4. `useTransactionsAll` e `useFinanceSummary` reagiscono al broadcast
5. Tutti i widget si aggiornano automaticamente (nessun reload)

Non è necessario implementare ottimistic update UI separato — il fetch è abbastanza veloce da localStorage (< 50ms) + la reindicizzazione Supabase è asincrona ma il localStorage fallback aggiorna immediatamente.

---

## Debouncing del range custom

```typescript
const debouncedCustomFrom = useDebounce(customFrom, 400);
const debouncedCustomTo   = useDebounce(customTo, 400);

const range = useMemo(() => getRange(period, debouncedCustomFrom, debouncedCustomTo), 
  [period, debouncedCustomFrom, debouncedCustomTo]);
```

`useDebounce` — hook custom semplice (3 righe) già potenzialmente presente o da creare inline:
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

---

## Performance: memoization

Tutte le derivazioni costose sono in `useMemo` con deps esplicite:

```typescript
// Costo O(n) su allTransactions — memoizzato
const incomeBreakdown = useMemo(() => { /* ... */ }, [allTransactions, summary.totalIncome, catColorMap]);
const cashflowData    = useMemo(() => { /* ... */ }, [heatmapData, allTransactions]);
const heatmapData     = useMemo(() => { /* ... */ }, [range, dailyExpenses]);
const trendData       = useMemo(() => { /* ... */ }, [rangedays, ...]);
const top5Expense     = useMemo(() => { /* ... */ }, [summary.categoryBreakdown, prevExpenseMap, expenseCats]);
const top5Income      = useMemo(() => { /* ... */ }, [incomeBreakdown, prevIncomeMap]);
const activeFilters   = useMemo(() => { /* ... */ }, [activeCatFilter, activeDateFilter, typeFilter, searchQuery, range]);
```

**Catena deps:** evitare oggetti inline come deps (causano re-render infiniti). Usare valori primitivi (stringhe, numeri, bool) o memo intermedi.

---

## Lazy loading chart pesanti

I chart Recharts sono rendering-pesanti. Strategia:

1. `useFinanceSummary` ha `isLoading` — durante loading mostrare skeleton, non il chart
2. Heatmap (Widget 8) è il più costoso graficamente — renderizzarlo in `React.memo` per evitare re-render inutili
3. I chart pesanti (AreaChart cashflow, heatmap) possono essere wrapped in `Suspense` con lazy import se necessario — ma con il pattern attuale (tutto eager) non è necessario

---

## Reattività cross-tab

`financeRealtime.ts` usa `BroadcastChannel` (o fallback custom event) — se l'utente aggiunge una transazione in un'altra tab, il Recap si aggiorna automaticamente entro il prossimo broadcast. Questo funziona già perché `subscribeToFinanceUpdates` è usato da entrambi i hook.

---

## Reset filtri al cambio periodo

Quando l'utente cambia periodo:

```typescript
function handlePeriodChange(p: Period) {
  setPeriod(p);
  // Reset tutti i filtri derivati dai widget
  setActiveCatFilter(null);
  setActivePeriodFilter(null);
  setActiveDateFilter(null);
  setTablePage(0);
  // Update URL
  setSearchParams({ p }, { replace: true });
}
```

Questo previene stati inconsistenti (es. heatmap click su "15 marzo" con periodo "anno scorso").
