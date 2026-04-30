# SOSA INC — Project Knowledge Base

> Documento di riferimento completo per Claude. Contiene architettura, convenzioni, ragionamenti tecnici e stato attuale del progetto.

---

## 1. Overview

**SOSA INC** è una web app multi-portale (SaaS-style) per la gestione di finanze personali, crypto, cloud storage, task, subscription e altro. Ogni "portale" è un workspace isolato con i propri dati.

**URL di sviluppo:** `http://localhost:8080`  
**Branch attivo:** `feat/sosa-design-system`  
**Supabase project:** `ndudzfaisulnmbpnvkwo`

---

## 2. Tech Stack

| Layer | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | TailwindCSS + CSS Variables (design system custom) |
| Backend/DB | Supabase (PostgreSQL + RLS + Realtime) |
| Charts | Recharts 2.15.4 |
| Animations | Framer Motion |
| Toast | Sonner |
| Icons | Lucide React |
| Router | React Router v6 |
| Form | Radix UI primitives |

**Nessuna dipendenza aggiuntiva permessa** — tutto deve usare ciò che è già in `package.json`.

---

## 3. Struttura Route

```
/                     → LoginPage
/hub                  → HubPage (portal selector)
/:portalId/*          → PortalLayout (protected, portal-scoped)
  /dashboard
  /budget
  /transactions
  /recap              ← NUOVO — dashboard finanziaria avanzata
  /goals
  /invoices
  /analytics
  /tasks
  /vault
  /cloud
  /crypto
  /gift-cards
  /subscriptions
  /settings/*         → AdminRoute → SettingsLayout
```

Tutte le pagine dentro `/:portalId/*` sono lazy-loaded via `React.lazy`.

---

## 4. Provider Tree (App.tsx, top-down)

```
QueryClientProvider
ThemeProvider
AccentProvider        ← accent color (localStorage + appearance_settings table)
NumberFormatProvider  ← EU/US number format
AuthProvider          ← Supabase auth session
PortalDBProvider      ← portal corrente dal DB, currentPortalId, isOwner, isAdmin
  PortalProvider      ← legacy, usare PortalDBProvider
    PeriodProvider
      PortalLayout / Routes
```

**REGOLA:** Usare sempre `usePortalDB()` da `@/lib/portalContextDB`, NON `usePortal()` (legacy).  
Eccezione: `Recap.tsx` usa ancora `usePortal()` per `portal.accent` — questo è un debito tecnico minore.

---

## 5. Pattern di Data Access

### Hook generico lista (usePortalData)
```ts
const { data, loading, error, create, update, remove } = usePortalData<T>("table_name", { orderBy: "sort_order" });
```
Auto-filtra per `portal_id`, re-fetcha quando il portale cambia.

### Hook singleton (una riga per portale)
```ts
const { data, loading, upsert } = useSingleton<T>("table_name");
// upsert su conflitto portal_id — safe senza check esistenza
```

### Due client Supabase — PROBLEMA NOTO
- `useFinanceSummary` → usa `import { supabase } from "@/lib/supabase"` (client globale)
- `useTransactions` → usa `import { dynamicSupabase } from "@/lib/portalDb"` (client portale-specifico)

**Conseguenza:** Se i due client puntano a progetti/credenziali diverse, i dati non si allineano. La `Recap` page gestisce questo con un fallback: se `allTransactions` (da `useTransactions`) è vuoto ma `summary` (da `useFinanceSummary`) ha dati, il trend chart mostra dati mensili invece di giornalieri.

---

## 6. Design System

### CSS Variables (mai hardcoded hex nei componenti)

```css
/* Testo */
--text-primary, --text-secondary, --text-tertiary

/* Accent */
--accent-primary, --accent-primary-soft, --accent-primary-glow

/* Glassmorphism */
--glass-bg, --glass-bg-elevated, --glass-border

/* Colori semantici */
--color-success, --color-error, --color-warning, --color-info

/* Tipografia */
--font-body, --font-mono, --font-display

/* Border radius */
--radius-md, --radius-lg, --radius-xl
```

### Estetica SOSA (brutalist terminal)
- Colore neon: `#d4ff00` (giallo SOSA)
- Font monospace pesante
- Zero border-radius sulle superfici primarie
- Niente box-shadow, niente gradienti (eccetto grain texture)
- Corner brackets `⌐ ¬` sugli angoli (solo login + hub)
- Emoji bandite nell'UI — usare `→ ↗ ◆ ● ✕`

### Classi CSS utility
```
glass-input, glass-segment, glass-segment-item
btn-primary, btn-glass-ds
```

### Accent color
Controllato da `data-color` attribute su `<html>`.  
Cambiare via `useAccent().setAccent(id)` — mai scrivere CSS variables direttamente.

---

## 7. Pagina Recap — Architettura Completa

### Cosa è
Dashboard finanziaria avanzata con 9 widget, URL state, period selector, compare toggle, drill-down modali.

### File coinvolti
```
src/pages/Recap.tsx                                ← componente principale (~1200 righe)
src/components/finance/TransactionDrillDownModal.tsx ← modal drill-down con mini chart
src/components/finance/CalendarHeatmap.tsx           ← heatmap calendario spese
src/hooks/useDebounce.ts                             ← debounce generico
src/hooks/useFinanceSummary.ts                       ← aggregati finanziari + range helpers
src/hooks/useTransactions.ts                         ← lista transazioni paginata + allTransactions
docs/recap/                                          ← 10 file spec/planning (00 → 09)
```

### Period Selector (URL State)
9 preset + custom date range. Stato serializzato in `useSearchParams`:
```
?p=month                          → questo mese
?p=custom&from=2026-01-01&to=2026-03-31  → range custom
?p=month&cmp=1                    → con compare toggle ON
```

**Tipi period:**
```ts
type Period = "today" | "7days" | "30days" | "month" | "prevmonth" | "3months" | "year" | "prevyear" | "custom"
```

Custom date inputs usano `useDebounce(value, 400ms)` prima di triggerare il refetch.

### Hooks chiamati in Recap
```ts
useFinanceSummary(range)          // summary corrente
useFinanceSummary(prevRange)      // summary periodo precedente (solo se compareOn=true)
useTransactions({ dateFrom, dateTo })   // allTransactions per aggregazioni widget
useTransactions(tableFilters)     // transazioni paginate per la tabella
useExpenseCategories()            // categorie spesa con monthly_budget
```

### Memos critici
| Memo | Input | Output |
|---|---|---|
| `range` | period, customFrom/To debounced | DateRange |
| `prevRange` | range | DateRange precedente (stesso nr giorni) |
| `hasDailyData` | dailyData | bool — allTransactions ha dati |
| `dailyData` | allTransactions, range | zero-filled array giornaliero |
| `cashflowData` | dailyData | cumulative running sum |
| `heatmapData` | dailyData | `{date, amount}[]` solo spese |
| `trendData` | rangeDays, hasDailyData, dailyData, monthlyBreakdown | giornaliero (se allTx ha dati) oppure mensile (fallback) |
| `expensePieData` / `incomePieData` | categoryBreakdown / incomeBreakdown | top 6 + "Altro" aggregato |
| `top5Expense` / `top5Income` | categoryBreakdown, budgetMap | con delta % se compareOn |
| `kpiDelta` | summary, prevSummary | delta % per ogni KPI |
| `sortedTxs` | rawTableTxs, sort, activePeriodFilter | tabella ordinata/filtrata |

### 9 Widget

#### 1. KPI Cards (4)
- Totale Entrate, Totale Uscite, Saldo Netto, Risparmio %
- Click → `openDrill()` → TransactionDrillDownModal
- Savings rate: `(income - expenses) / income * 100`
- Colori: verde ≥ 20%, giallo 0-20%, rosso < 0%

#### 2. Donut Spese
- Dati da `summary.categoryBreakdown` (solo expense)
- Top 6 categorie + "Altro" aggregato per il resto
- Click slice → drill modal (filtra per categoria, gestisce "Altro")
- Anche filtra la tabella sotto (`activeCatFilter`)

#### 3. Donut Entrate
- Dati da `incomeBreakdown` (aggregato client-side da `allTransactions`)
- **NON** da `categoryBreakdown` che è solo expense
- Stessa logica top 6 + "Altro"

#### 4. Area Chart Trend (Entrate vs Uscite)
- Daily se rangeDays ≤ 31 **E** `hasDailyData=true`
- Monthly (fallback da `summary.monthlyBreakdown`) altrimenti
- Click → drill modal con transazioni del periodo/giorno
- `dateKey` embedded in ogni punto per il drill (YYYY-MM-DD o YYYY-MM)

#### 5. Cashflow Waveform
- Cumulative running sum: `running += income - expenses` per giorno
- Bicolor gradient: verde sopra baseline, rosso sotto
- `ReferenceLine y={0}` come baseline
- Click → drill modal con transazioni di quel giorno

#### 6. Top 5 Spese
- Con budget mensile: progress bar = % consumata del budget
- Senza budget: progress bar = % sul totale spese
- Colore progress: verde < 80%, giallo 80-99%, rosso ≥ 100%
- Con delta % se `compareOn=true`
- Click → drill modal

#### 7. Top 5 Entrate
- % sul totale entrate
- Delta non disponibile (richiederebbe un secondo useTransactions per prevRange)

#### 8. Calendar Heatmap
- Griglia settimane (colonne) × giorni settimana (righe)
- Intensità colore = importo spesa relativo al 95° percentile (non il max assoluto, evita outlier)
- Solo celle nel range hanno colore — fuori range = grigio neutro
- Click cella → drill modal con spese di quel giorno

#### 9. Transaction Table
- Filtri combinati: tipo (all/income/expense), categoria (da widget click), data (da widget click), search text
- Sort: data asc/desc, importo asc/desc
- Expand row: mostra tags, note, metodo pagamento
- Delete inline con confirm
- Edit → AddTransactionModal pre-popolato
- Paginazione 20 righe/pagina client-side
- Banner "Filtro attivo: X ×" quando widget ha filtrato la tabella

### TransactionDrillDownModal
**Props:**
```ts
{
  open: boolean
  onClose: () => void
  title: string
  totalAmount: number
  transactions: PersonalTransaction[]
  isLoading: boolean
  formatAmount: (n: number) => string
  range?: DateRange   // per il mini chart
}
```

**Contenuto:**
1. Header: titolo, totale, nr transazioni, pulsante X
2. **Mini timeline chart** (AreaChart Recharts, h=96px):
   - Daily aggregation delle transactions passate, zero-filled sul range
   - Peak day: dashed vertical ReferenceLine + label "picco DD mon — €X"
   - Colore: rosso se majority expense, verde se majority income
   - Nascosto se < 2 punti non-zero (es. singola transazione single-day)
3. Lista transazioni: ordinata per data desc, amount desc
   - Icon circolare verde/rosso per tipo
   - Nome, categoria, data, payment method
   - Importo colorato

**Centering fix (Framer Motion):**  
NON usare `top: 50%; left: 50%; transform: translate(-50%, -50%)` — Framer Motion's `y` animation sovrascrive il CSS transform. Invece: overlay `display: flex; align-items: center; justify-content: center`, panel è solo un block figlio.

### CalendarHeatmap
**Props:**
```ts
{
  data: { date: string; amount: number }[]
  range: DateRange
  formatAmount: (n: number) => string
  onDayClick: (date: string) => void
}
```

**Logica:**
- Parte dal lunedì della settimana che contiene `range.from`
- Finisce alla domenica della settimana che contiene `range.to`
- `dowIndex = (date.getDay() + 6) % 7` → 0=Lun, 6=Dom
- Intensità: `min(1, 0.15 + (amount / p95) * 0.85)` dove p95 = 95° percentile degli importi
- Hover: tooltip con data + importo
- Mobile: scroll orizzontale

---

## 8. Sistema Categorie (Dual System)

**Due sistemi distinti — non confondere:**

### 1. financeCategoryStore (localStorage)
```ts
import { getAllCategories } from "@/lib/financeCategoryStore";
// Restituisce: { name: string, color: string }[]
// Usato per: color map nelle visualizzazioni
```

### 2. Supabase tables (income_categories / expense_categories)
```ts
useExpenseCategories()   // con monthly_budget
useIncomeCategories()    // categorie entrate
// Usato per: budget mensile nelle top liste
```

In Recap, si joinano client-side:
```ts
const budgetMap = expenseCats.reduce((m, c) => ({ ...m, [c.name]: c.monthly_budget }), {});
const catColorMap = getAllCategories(portalId).reduce((m, c) => ({ ...m, [c.name]: c.color }), {});
```

---

## 9. Realtime & Reactivity

```ts
import { subscribeToFinanceUpdates, broadcastFinanceUpdate } from "@/lib/financeRealtime";

// Nei hook:
useEffect(() => {
  return subscribeToFinanceUpdates(() => setTick(t => t + 1));
}, []);

// Dopo mutazioni:
broadcastFinanceUpdate("transaction_added");
```

Ogni hook che modifica dati chiama `broadcastFinanceUpdate` → tutti i subscriber ricaricano → tutti i widget si aggiornano automaticamente.

---

## 10. SWR Pattern (Custom, no libreria)

```ts
// 1. Init state da localStorage cache
const [summary, setSummary] = useState(() => {
  const raw = localStorage.getItem(cacheKey);
  return raw ? JSON.parse(raw) : EMPTY;
});

// 2. Fetch async (Supabase o localStorage fallback)
const compute = useCallback(async () => { ... setSummary(result); localStorage.setItem(cacheKey, JSON.stringify(result)); }, [deps]);

// 3. Realtime invalidation via tick
useEffect(() => subscribeToFinanceUpdates(() => setTick(t => t+1)), []);
```

**Conseguenza:** Prima render mostra dati cached (stale), poi aggiorna con dati freschi. Nessun flash di "loading" se cache esiste.

---

## 11. Convenzioni Codice

### Lingua
- **UI labels:** Italiano
- **Codice, variabili, commenti:** Inglese
- **Commit messages:** inglese, formato `type(scope): description`

### Commenti
Solo quando il WHY non è ovvio. Mai descrivere COSA fa il codice.

### Toast
```ts
import { toast } from "sonner";
toast.success("Messaggio");
toast.error(errorString);
```

### Multi-portale isolation
Ogni query Supabase manuale DEVE includere `.eq("portal_id", currentPortalId)`.  
`usePortalData` lo fa automaticamente. Per chiamate raw, aggiungere manualmente.

### Settings pages pattern
1. `useXxx()` hook → `{ data, loading, create, update, remove }`
2. `errors` state reset on modal open, validated before submit
3. `SettingsTable` + `SettingsModal` + `SettingsDeleteConfirm`
4. Types in `src/types/settings.ts`

---

## 12. Problemi Noti / Debiti Tecnici

### A. Due client Supabase disallineati
- `useFinanceSummary` → `@/lib/supabase` (globale)
- `useTransactions` → `@/lib/portalDb` (dinamico)
- **Sintomo:** Trend chart mostra "Nessun dato" anche quando summary ha valori
- **Fix attuale:** `trendData` fallback a `summary.monthlyBreakdown` quando `hasDailyData=false`
- **Fix definitivo:** Unificare i client Supabase

### B. prevIncomeMap vuoto
In Recap, `prevIncomeMap` è `{}` — il delta % sulle top entrate non funziona.  
Richiederebbe un terzo `useTransactions(prevRange)` call.

### C. usePortal() legacy in Recap
Recap usa `usePortal()` per `portal.accent`. Dovrebbe usare `usePortalDB()`.

### D. isMobile via window.innerWidth
`const isMobile = window.innerWidth < 768` — non reattivo al resize. Funziona per first render.

---

## 13. File Struttura Chiave

```
src/
  pages/
    Recap.tsx                      ← Dashboard finanziaria (1200+ righe)
    Budget.tsx
    Analytics.tsx
    Transactions.tsx
  components/
    finance/
      AddTransactionModal.tsx      ← modal aggiunta/modifica transazione
      TransactionDrillDownModal.tsx ← drill-down con mini chart timeline
      CalendarHeatmap.tsx          ← heatmap calendario spese
    ui/
      liquid-glass-card.tsx        ← card glassmorphism (usata ovunque)
    AppSidebar.tsx                 ← sidebar con nav items
  hooks/
    useFinanceSummary.ts           ← aggregati + range helpers
    useTransactions.ts             ← CRUD transazioni + allTransactions
    useDebounce.ts                 ← debounce generico
    useFinancialGoals.ts
    usePortalData.ts               ← hook generico lista
    settings/
      index.ts                     ← tutti gli hooks settings (useExpenseCategories, etc.)
  lib/
    supabase.ts                    ← client Supabase globale
    portalDb.ts                    ← dynamicSupabase portale-specifico
    portalContext.ts               ← usePortal() (legacy)
    portalContextDB.ts             ← usePortalDB() (usare questo)
    financeCategoryStore.ts        ← colori categorie (localStorage)
    financeRealtime.ts             ← broadcast/subscribe eventi finanziari
    personalTransactionStore.ts    ← CRUD localStorage transazioni
    portalUUID.ts                  ← toPortalUUID(portalId)
  types/
    finance.ts                     ← PersonalTransaction, FinanceSummary, etc.
    settings.ts                    ← tipi per settings pages
docs/
  recap/                           ← 10 file spec planning (00-09)
  PROJECT_KNOWLEDGE.md             ← questo file
```

---

## 14. Comandi

```bash
npm run dev        # dev server porta 8080
npm run build      # build produzione
npm run lint       # ESLint
npx tsc --noEmit   # type check (SEMPRE dopo modifiche)
```

---

## 15. Regole Assolute

1. **Mai hardcodare colori hex** nei componenti — usare CSS variables
2. **Mai aggiungere dipendenze** npm non già presenti
3. **Mai toccare** routes, logic, API, state, auth per refactor puramente visivo
4. **Sempre** `npx tsc --noEmit` dopo ogni modifica
5. **Sempre** `.eq("portal_id", ...)` nelle query Supabase manuali
6. **Commit solo su** `feat/sosa-design-system`, mai su `main` senza consenso esplicito
7. **Recharts centering bug:** non usare `transform: translate(-50%, -50%)` su elementi animati da Framer Motion — usare flex center sull'overlay
8. **allTransactions vs transactions:** `allTransactions` = array completo (fino a 2000), `transactions` = pagina corrente (20 item). I widget usano `allTransactions`, la tabella usa `transactions`
