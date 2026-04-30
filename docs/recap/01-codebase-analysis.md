# 01 — Analisi Codebase

## Struttura sezione Finance (file rilevanti)

```
src/
├── pages/
│   ├── Recap.tsx                    ← DA RISCRIVERE (scaffold esistente, non production-grade)
│   ├── Budget.tsx                   ← pattern: period nav, progress bar, pie chart
│   ├── Transactions.tsx             ← pattern: filtri, paginazione, edit/delete inline
│   ├── Analytics.tsx                ← pattern: multi-chart, export CSV, date aggregation
│   ├── Goals.tsx                    ← pattern: grid card, progress, edit modal
│   ├── Invoices.tsx
│   └── Subscriptions.tsx
├── hooks/
│   ├── useTransactions.ts           ← CRUD + filtri + paginazione (PAGE_SIZE=20, limit=2000 in query)
│   ├── useFinanceSummary.ts         ← aggregazioni: income/expenses totali + monthlyBreakdown + categoryBreakdown
│   ├── useFinanceCategories.ts      ← (da verificare: wrap di financeCategoryStore)
│   ├── useCategories.ts             ← getter unificato categorie con portal scoping
│   ├── useDashboardTransactions.ts  ← subset dati per widget dashboard
│   ├── usePortalData.ts             ← hook generico portal-scoped per tabelle Supabase
│   └── settings/index.ts            ← useIncomeCategories, useExpenseCategories (tabelle Supabase)
├── components/
│   ├── finance/
│   │   ├── AddTransactionModal.tsx  ← form completo add/edit
│   │   └── DashboardFinanceWidget.tsx
│   └── ui/
│       ├── liquid-glass-card.tsx    ← card principale glassmorphism
│       ├── dialog.tsx               ← Radix dialog (per modali drill-down)
│       ├── drawer.tsx               ← Radix drawer (per mobile drill-down)
│       ├── skeleton.tsx             ← loading state
│       └── ... (66 file ui totali)
├── lib/
│   ├── financeCategoryStore.ts      ← CRUD categorie localStorage + Supabase hydration
│   ├── personalTransactionStore.ts  ← localStorage fallback per transazioni
│   ├── financeRealtime.ts           ← Supabase realtime broadcast + subscribe
│   ├── portalContextDB.tsx          ← multi-tenant context (usePortalDB)
│   ├── portalContext.tsx            ← legacy context (usePortal) — usare ancora, hooks l'usano
│   ├── portalDb.ts                  ← dynamicSupabase (portal-scoped client)
│   ├── portalUUID.ts                ← toPortalUUID(portalId)
│   ├── numberFormat.tsx             ← formatCurrency, currency state
│   └── supabase.ts                  ← Supabase client base
└── types/
    ├── finance.ts                   ← PersonalTransaction, FinanceSummary, TransactionFilters
    └── settings.ts                  ← IncomeCategory, ExpenseCategory, PaymentMethod…
```

---

## Stack tecnico identificato

| Layer | Tecnologia |
|-------|-----------|
| Framework | React 18.3 + Vite + TypeScript strict |
| Routing | React Router v6 (`useSearchParams` disponibile per URL state) |
| UI components | Radix UI primitives + shadcn/ui + custom glass components |
| Charts | **Recharts 2.15.4** (già installato, usato in Budget, Analytics, Recap) |
| Animazioni | Framer Motion 12.35 |
| State management | React hooks custom + localStorage SWR pattern (no Redux, no Zustand) |
| Server state | TanStack Query **installato** (v5.83) ma **non usato** per finance — i custom hooks implementano il proprio SWR |
| DB client | Supabase JS 2.98 (`dynamicSupabase` per query portal-scoped) |
| Date handling | **date-fns 3.6** installato — usato raramente, per lo più date native JS |
| Forms | React Hook Form 7.61 + Zod 3.25 (disponibili) |
| Toast | Sonner 1.7 |
| Icons | Lucide React 0.462 |
| i18n | sistema custom `src/i18n` (non react-i18next) — UI label in italiano |
| CSS | Tailwind 3.4 + CSS variables globali (`var(--*)`) |

---

## Pattern routing

- Struttura: `/:portalId/recap` → rotta già aggiunta in `App.tsx` via `PortalRoutes()`
- Import eager (non lazy) — coerente con le altre Finance page
- Nessuna sub-rotta necessaria (drill-down via modal, non nuova rotta)
- URL state da gestire con `useSearchParams` di React Router

---

## Pattern fetching dati

Tutti i Finance hooks seguono questo pattern:

```typescript
// 1. Init state da localStorage SWR cache (zero flash)
const [data, setData] = useState(() => { try { return JSON.parse(localStorage.getItem(cacheKey)) } catch { return EMPTY } });
const [isLoading, setIsLoading] = useState(!localStorage.getItem(cacheKey));
const [tick, setTick] = useState(0);  // forza refetch

// 2. load() async: prova Supabase → fallback localStorage
const load = useCallback(async () => { ... }, [deps, tick]);

// 3. useEffect(() => { load() }, [load]);

// 4. Sottoscrizione realtime per invalidazione automatica
useEffect(() => subscribeToFinanceUpdates(() => setTick(t => t + 1)), []);
```

**Non usare TanStack Query** per i nuovi hook — romperebbe la consistenza con il pattern esistente e il sistema SWR/realtime custom già funzionante.

---

## Convenzioni naming e organizzazione componenti

- **Hook names**: `use[Domain][Feature]` → `useFinanceSummary`, `useTransactions`
- **Component names**: PascalCase, file = component name
- **Tipi**: definiti in `src/types/` (finance.ts, settings.ts), non inline
- **Nuovi hook Recap**: se piccoli e specifici, possono stare in `src/hooks/useRecap.ts`
- **Sub-componenti**: definiti nello stesso file se usati solo lì, estratti in `src/components/finance/` se riusabili
- **Modale drill-down**: creare `src/components/finance/TransactionDrillDownModal.tsx`
- **Nessun comment sui "cosa fa"** — solo commenti sul "perché" quando non ovvio

---

## Design system

### CSS Variables principali

```css
/* Testo */
var(--text-primary)       /* bianco/quasi-bianco */
var(--text-secondary)     /* grigio chiaro */
var(--text-tertiary)      /* grigio medio */
var(--text-quaternary)    /* grigio scuro */

/* Superfici */
var(--glass-bg)           /* sfondo card glass */
var(--glass-bg-elevated)  /* sfondo modal/overlay */
var(--glass-bg-subtle)    /* sfondo sidebar */
var(--glass-border)       /* bordo glass */

/* Accent */
var(--accent-primary)     /* alias di var(--accent-color) — segue AccentProvider */
var(--accent-primary-soft)/* versione trasparente */
var(--accent-primary-glow)/* versione glow */

/* Semantici */
var(--color-success)      /* verde */
var(--color-error)        /* rosso */
var(--color-warning)      /* giallo/arancio */
var(--color-info)         /* blu */

/* Tipografia */
var(--font-body)          /* testo normale */
var(--font-mono)          /* monospace — usato per numeri, label, date */
var(--font-display)       /* titoli */

/* Radii */
var(--radius-sm)  var(--radius-md)  var(--radius-lg)  var(--radius-xl)

/* SOSA design tokens */
var(--sosa-yellow)        /* #d4ff00 — accent portale */
var(--sosa-bg)            /* sfondo principale */
var(--sosa-border)        /* bordo principale */
```

### Componenti riusabili chiave per Recap

| Componente | Uso |
|-----------|-----|
| `LiquidGlassCard` | wrapper card per tutti i widget |
| `LiquidGlassFilter` | SVG filter — render UNA VOLTA per pagina |
| `Skeleton` (shadcn) | loading states |
| `Dialog` (Radix) | modale drill-down desktop |
| `Drawer` (Radix) | bottom sheet drill-down mobile |
| `AddTransactionModal` | già esiste, riusabile da empty states |

### Pattern chart Recharts esistente

```tsx
<ResponsiveContainer width="100%" height={220}>
  <BarChart data={data} barCategoryGap="30%" barGap={4}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} />
    <Tooltip content={<CustomTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
    <Bar dataKey="value" fill="var(--color-success)" radius={[4,4,0,0]} />
  </BarChart>
</ResponsiveContainer>
```

Tooltip sempre custom (glass-style), non quello di default Recharts.

### SOSA vs glassmorphism

Il progetto usa due sistemi visuali sovrapposti:
- **SOSA brutalist**: sidebar, hub, login (sfondo nero, font mono, bordi netti)
- **Glassmorphism**: pagine interne Finance/Settings (LiquidGlassCard, blur, var(--glass-*))

La pagina Recap è all'interno di Finance → usa glassmorphism.
