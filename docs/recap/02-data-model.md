# 02 — Data Model

## Tabella principale: `personal_transactions`

```sql
personal_transactions (
  id                  uuid PRIMARY KEY,
  user_id             uuid NOT NULL,            -- auth.users.id
  portal_id           uuid NOT NULL,            -- portal scoping (via toPortalUUID)
  type                text NOT NULL,            -- 'income' | 'expense' | 'transfer'
  amount              numeric NOT NULL,         -- sempre positivo
  currency            text DEFAULT 'EUR',
  category            text NOT NULL,            -- nome categoria (es. "Salary", "Groceries")
  subcategory         text,                     -- usato come "titolo" nell'UI
  description         text,
  date                date NOT NULL,            -- YYYY-MM-DD
  payment_method      text,                     -- 'cash'|'card'|'bank_transfer'|'crypto'|'other'
  is_recurring        boolean DEFAULT false,
  recurring_interval  text,                     -- 'weekly'|'monthly'|'yearly'
  tags                text[],
  receipt_url         text,
  cost_classification text,                     -- 'revenue'|'cogs'|'opex'|'other'
  category_id         uuid,                     -- FK → income/expense_categories (non sempre popolato)
  created_at          timestamptz,
  updated_at          timestamptz
)
```

**Note critiche:**
- `amount` è sempre positivo. Il campo `type` determina la direzione (income = entrata, expense = uscita).
- `category` è una stringa libera, non un FK obbligatorio. La relazione con `category_id` è opzionale e non sempre popolata — le query di aggregazione devono usare `category` (stringa), non `category_id`.
- `transfer` type: non ha impatto su income/expense totals — ignorato nelle aggregazioni.
- `portal_id` è sempre un UUID (via `toPortalUUID(portalId)` che converte slug → UUID deterministico).

---

## Tabelle categorie (Settings)

### `income_categories`

```sql
income_categories (
  id              uuid PRIMARY KEY,
  portal_id       uuid NOT NULL,
  name            text NOT NULL,
  icon            text,          -- emoji
  color           text,          -- hex (#4ade80)
  description     text,
  is_active       boolean DEFAULT true,
  sort_order      int DEFAULT 0,
  created_at      timestamptz
)
```

### `expense_categories`

```sql
expense_categories (
  id              uuid PRIMARY KEY,
  portal_id       uuid NOT NULL,
  name            text NOT NULL,
  icon            text,          -- emoji
  color           text,          -- hex (#f97316)
  description     text,
  monthly_budget  numeric,       -- budget mensile opzionale
  alert_threshold int,           -- % soglia avviso (es. 80)
  is_active       boolean DEFAULT true,
  sort_order      int DEFAULT 0,
  created_at      timestamptz
)
```

**Nota:** queste sono le categorie gestite da Settings. Ma i `personal_transactions` usano il campo stringa `category` che può non matchare esattamente i nomi in queste tabelle. Il sistema ha due fonti di "categoria":
1. `financeCategoryStore` (localStorage) — fonte usata da `useFinanceSummary` per i colori
2. `income_categories` / `expense_categories` (Supabase via `useIncomeCategories`) — fonte usata da Settings e AddTransactionModal

**La color map** va sempre risolta tramite `getAllCategories(portalId)` da `financeCategoryStore` — è la singola fonte di verità per i colori nelle visualizzazioni.

---

## Fonti di dati esistenti per color mapping

```typescript
// financeCategoryStore.ts — fonte verità colori
getAllCategories(portalId: string): FinanceCategory[]
// → restituisce TUTTE le categorie (income + expense) con name, icon, color

// Pattern usato in Recap.tsx e Analytics.tsx:
const catColorMap = useMemo(() => {
  const cats = getAllCategories(portal?.id ?? "sosa");
  return Object.fromEntries(cats.map(c => [c.name, c.color]));
}, [portal?.id]);
```

---

## Relazioni tra entità

```
personal_transactions
    ├── portal_id ──── portals (multi-tenant scoping)
    ├── user_id ─────── auth.users
    ├── category_id ──┐
    │                 ├── income_categories (opzionale, non sempre popolato)
    │                 └── expense_categories (opzionale)
    └── category ─────── financeCategoryStore (stringa, fonte per color map)
```

---

## Campi disponibili per filtraggio

| Campo | Tipo | Filtro supportato |
|-------|------|------------------|
| `date` | date | range (dateFrom, dateTo) — già in `TransactionFilters` |
| `type` | enum | eq — già in `TransactionFilters` |
| `category` | string | eq / ilike — già in `TransactionFilters` |
| `amount` | numeric | gte/lte — già in `TransactionFilters` |
| `description` | string | ilike — già in `TransactionFilters` |
| `cost_classification` | enum | eq — già in `TransactionFilters` |
| `payment_method` | enum | eq — **non ancora in `TransactionFilters`** (GAP minore) |
| `tags` | array | contains — **non ancora in `TransactionFilters`** (GAP minore) |
| `is_recurring` | bool | eq — **non ancora in `TransactionFilters`** (GAP minore) |
| `category_id` | uuid | eq — già in `TransactionFilters` |

---

## Query esistenti riusabili

### 1. Aggregazione mensile (useFinanceSummary)

```typescript
// Già implementata — restituisce: totalIncome, totalExpenses, netBalance,
// transactionCount, monthlyBreakdown[], categoryBreakdown[]
useFinanceSummary(dateRange: DateRange)
```

**Limitazione**: `categoryBreakdown` contiene SOLO le spese (expense). Le entrate per fonte
devono essere calcolate separatamente dai `transactions`.

### 2. Lista transazioni filtrata (useTransactions)

```typescript
// Già implementata — paginazione PAGE_SIZE=20, limit=2000 su Supabase
useTransactions(filters: TransactionFilters): {
  transactions: PersonalTransaction[], // pagina corrente
  isLoading, error, page, hasMore,
  addTransaction, updateTransaction, deleteTransaction,
  setPage, refetch
}
```

**Limitazione per Recap**: la paginazione PAGE_SIZE=20 è pensata per la lista Transactions.
Per aggregazioni (heatmap, income breakdown), serve accedere all'array completo (`all`).
Il hook attualmente espone solo la pagina corrente. **Serve un pattern per accedere a tutti i record.**

---

## Query nuove necessarie (pseudocodice)

### Daily spending per heatmap calendario

```sql
SELECT date, SUM(amount) as total
FROM personal_transactions
WHERE portal_id = $portalId
  AND type = 'expense'
  AND date BETWEEN $from AND $to
GROUP BY date
ORDER BY date
```

Questa è fattibile come aggregazione client-side su `all` transactions (già fetchate con limit=2000).
Non serve nuova query Supabase se il range non supera ~6 mesi.

### Income breakdown per fonte

```typescript
// Client-side da transactions già fetchate:
const incomeMap = transactions
  .filter(t => t.type === 'income')
  .reduce((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
```

Pattern già usato in `Recap.tsx` esistente.

---

## Indici DB mancanti / performance

Per le query più pesanti (heatmap su range annuale con molte transazioni):

```sql
-- Indice composito raccomandato (potrebbe già esistere via Supabase)
CREATE INDEX IF NOT EXISTS idx_personal_transactions_portal_date
ON personal_transactions (portal_id, date);

-- Indice per type filtering
CREATE INDEX IF NOT EXISTS idx_personal_transactions_portal_type_date
ON personal_transactions (portal_id, type, date);
```

Con il limit=2000 attuale e range massimo YTD, le aggregazioni client-side su array JS sono accettabili per dataset realistici (< 500 transazioni/anno per uso personale).

---

## Schema TypeScript esistente (rilevante per Recap)

```typescript
// src/types/finance.ts

interface PersonalTransaction {
  id: string;
  user_id: string;
  type: "income" | "expense" | "transfer";
  amount: number;          // sempre positivo
  currency: string;
  category: string;
  subcategory?: string;    // usato come titolo transazione
  description: string;
  date: string;            // YYYY-MM-DD
  payment_method?: "cash" | "card" | "bank_transfer" | "crypto" | "other";
  is_recurring: boolean;
  tags?: string[];
  cost_classification?: CostClassification;
  category_id?: string;
  created_at: string;
  updated_at: string;
}

interface TransactionFilters {
  type?: "income" | "expense" | "transfer";
  category?: string;
  costClassification?: CostClassification;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  monthlyBreakdown: MonthlyBreakdown[];
  categoryBreakdown: CategoryBreakdown[];  // SOLO spese
}

interface MonthlyBreakdown {
  month: string;   // "2026-03"
  label: string;   // "Mar 26"
  income: number;
  expenses: number;
  net: number;
  count: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}
```
