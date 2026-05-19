# 04 — Data Sources

## Hook riusabili esistenti

### `useFinanceSummary(range: DateRange)`

**Usato da:** Widget 1 (KPI), Widget 2 (Expense Donut), Widget 4 (Trend), Widget 6 (Top Expense)

**Fornisce:**
- `totalIncome`, `totalExpenses`, `netBalance`, `transactionCount`
- `monthlyBreakdown[]` — aggregazione mensile
- `categoryBreakdown[]` — SOLO spese, ordinate per importo

**Query Supabase:**
```sql
SELECT type, amount, category, date
FROM personal_transactions
WHERE portal_id = $portalId
  AND date BETWEEN $from AND $to
ORDER BY date ASC
```

**Caching:** localStorage `swr_summary_${portalId}_${from}_${to}`

**Istanze in Recap:**
```typescript
const { summary, isLoading } = useFinanceSummary(range);      // periodo corrente
const { summary: prevSummary } = useFinanceSummary(prevRange); // periodo precedente (per delta)
```

---

### `useTransactions(filters: TransactionFilters)`

**Usato da:** Widget 3 (Income Donut), Widget 5 (Cashflow), Widget 8 (Heatmap), Widget 9 (Tabella)

**Limitazione critica:** il hook espone solo `transactions` (pagina corrente, PAGE_SIZE=20).
Per aggregazioni (heatmap, income breakdown, cashflow), serve l'array completo.

**Soluzione:** creare `useTransactionsAll(filters)` — wrapper di `useTransactions` che:
- Fetcha tutte le transazioni nel range senza paginazione (sfrutta il `limit=2000` già in place)
- Espone `allTransactions: PersonalTransaction[]` invece di `transactions` paginato
- Internamente usa lo stesso pattern di load() di `useTransactions`

In alternativa, **più pulita**: modificare `useTransactions` per esporre anche `all` (l'array completo non paginato). Questo è preferibile perché evita codice duplicato.

**Istanze in Recap:**
```typescript
// Per Widget 3 (income breakdown) e Widget 8 (heatmap) e Widget 5 (cashflow)
const { allTransactions, isLoading: txLoading } = useTransactionsAll({
  dateFrom: range.from,
  dateTo: range.to,
});

// Per Widget 9 (tabella filtrabile)
const { transactions, isLoading, page, hasMore, setPage, refetch } = useTransactions(activeFilters);
```

---

### `getAllCategories(portalId)`

**Usato da:** Widget 2 (color map), Widget 3 (color map), Widget 6, Widget 7

**Non è un hook React** — è una funzione sync che legge da localStorage.
Non richiede useEffect o loading state.

```typescript
const catColorMap = useMemo(() => {
  const cats = getAllCategories(portalId);
  return Object.fromEntries(cats.map(c => [c.name, c.color]));
}, [portalId]);
```

---

## Nuove query / hook da creare

### 1. `useTransactionsAll` — esposizione array completo

```typescript
// src/hooks/useTransactionsAll.ts (nuovo file o modifica useTransactions)
// Alternativa: aggiungere `allTransactions` come campo esposto in UseTransactionsResult

export function useTransactionsAll(filters: TransactionFilters): {
  allTransactions: PersonalTransaction[];
  isLoading: boolean;
}
```

Internamente riusa la stessa logica di `load()` in `useTransactions` ma senza slice paginazione.

**Perché non TanStack Query:** coerenza con il pattern esistente (SWR custom + realtime subscribe).

---

### 2. Aggregazione giornaliera per heatmap e trend granulare

Calcolata client-side da `allTransactions`:

```typescript
// Pseudocodice — all'interno di useMemo in Recap.tsx
const dailyExpenses = useMemo(() => {
  const map: Record<string, number> = {};
  allTransactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      map[t.date] = (map[t.date] ?? 0) + t.amount;
    });
  return map;
}, [allTransactions]);

// Per heatmap: generare tutte le date del range con zero-fill
const heatmapData = useMemo(() => {
  const result = [];
  const cur = new Date(range.from);
  const end = new Date(range.to);
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    result.push({ date: d, amount: dailyExpenses[d] ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}, [range, dailyExpenses]);
```

**Performance:** con range annuale (max 365 entries) e < 2000 transazioni, le operazioni JS sono < 1ms.

---

### 3. Cashflow cumulativo

```typescript
const cashflowData = useMemo(() => {
  let running = 0;
  return heatmapData.map(day => {
    const income = allTransactions
      .filter(t => t.type === "income" && t.date === day.date)
      .reduce((s, t) => s + t.amount, 0);
    const expense = dailyExpenses[day.date] ?? 0;
    running += income - expense;
    return { date: day.date, net: income - expense, cumulative: running };
  });
}, [heatmapData, allTransactions, dailyExpenses]);
```

---

### 4. Budget mensile per categoria (Widget 6 barra progresso)

**Query:** `useExpenseCategories()` da `src/hooks/settings/index.ts`

```typescript
const { data: expenseCats } = useExpenseCategories();
// expenseCats[i].monthly_budget → budget mensile (può essere null/0)
// expenseCats[i].name → per matchare categoryBreakdown[i].category
```

**Caching:** già gestito da `usePortalData` (SWR localStorage).

---

### 5. Trend granulare (giornaliero per periodo ≤ 31 giorni)

```typescript
const trendData = useMemo(() => {
  const rangedays = Math.round(
    (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000
  ) + 1;

  if (rangedays <= 31) {
    // Aggregazione giornaliera da allTransactions
    return heatmapData.map(d => ({
      name: new Date(d.date + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      income: allTransactions.filter(t => t.type === "income" && t.date === d.date).reduce((s, t) => s + t.amount, 0),
      expenses: d.amount,
    }));
  } else {
    // Aggregazione mensile (già da summary.monthlyBreakdown)
    return summary.monthlyBreakdown.map(m => ({
      name: m.label,
      income: m.income,
      expenses: m.expenses,
    }));
  }
}, [rangedays, heatmapData, allTransactions, summary.monthlyBreakdown]);
```

---

## Strategia caching

| Hook | Cache | Invalidazione |
|------|-------|---------------|
| `useFinanceSummary` | `localStorage` key per range | `subscribeToFinanceUpdates` → `setTick` |
| `useTransactions` | `localStorage` merge con Supabase | stesso pattern |
| `useTransactionsAll` | stesso di `useTransactions` | stesso pattern |
| `useExpenseCategories` | `usePortalData` SWR | custom event su settings update |
| `getAllCategories` | `localStorage` sync read | evento `finance-category-update-{portalId}` |

---

## ⚠️ GAP identificati

### GAP 1 — `useTransactions` espone solo pagina corrente

**Problema:** aggregazioni (heatmap, cashflow, income breakdown) richiedono tutte le transazioni del range, non solo le prime 20.

**Proposta A (raccomandata):** Aggiungere `allTransactions` come campo esposto da `useTransactions` (già esistente internamente come `all` state, basta esportarlo):
```typescript
// In UseTransactionsResult aggiungere:
allTransactions: PersonalTransaction[];
// In useTransactions return:
return { transactions, allTransactions: all, ... };
```
Cambiamento minimo, retrocompatibile.

**Proposta B:** Creare `useTransactionsAll.ts` come hook separato. Più codice duplicato.

### GAP 2 — Trend granulare (giornaliero) non disponibile da `useFinanceSummary`

**Problema:** `monthlyBreakdown` aggrega sempre per mese. Per periodo ≤ 1 mese, serve aggregazione giornaliera.

**Soluzione:** calcolata client-side da `allTransactions` (vedi sopra). Non serve modificare `useFinanceSummary`.

### GAP 3 — URL state non implementato in nessuna Finance page

**Problema:** il selettore periodo non è riflesso nella URL → refresh perde lo stato, link non condivisibile.

**Soluzione:** usare `useSearchParams` di React Router:
```typescript
const [searchParams, setSearchParams] = useSearchParams();
// period: searchParams.get("period") ?? "month"
// from: searchParams.get("from") ?? ""
// cat: searchParams.get("cat") ?? ""
```
Debounce 300ms su custom date range per evitare push ogni keystroke.

### GAP 4 — `payment_method` non filtrabile dalla UI (minore)

Il campo esiste in `TransactionFilters` ma la UI non lo usa. Per la tabella Recap può essere aggiunto come filtro opzionale.

### GAP 5 — Budget mensile categoria non usato nelle visualizzazioni

`expense_categories.monthly_budget` esiste nel DB ma non viene mai mostrato nelle Finance pages. Nel Widget 6 (Top Expense) possiamo usarlo per la barra progresso. Richiede join client-side tra `categoryBreakdown` e `expenseCats`.
