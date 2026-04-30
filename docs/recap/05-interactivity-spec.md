# 05 — Interactivity Spec

## Selettore periodo

### Preset disponibili (9)

| Label | Value | Range |
|-------|-------|-------|
| Oggi | `today` | `{from: today, to: today}` |
| Ultimi 7 giorni | `7days` | `lastNDaysRange(7)` |
| Ultimi 30 giorni | `30days` | `lastNDaysRange(30)` |
| Questo mese | `month` | `currentMonthRange()` |
| Mese scorso | `prevmonth` | mese precedente intero |
| Ultimi 3 mesi | `3months` | `lastNMonthsRange(3)` |
| Anno corrente (YTD) | `year` | `thisYearRange()` |
| Anno scorso | `prevyear` | anno precedente intero |
| Personalizzato | `custom` | date picker |

**UI:** row di pill button, active = background accent, truncate su mobile (dropdown select < 480px).

### Range custom

- Quando `period === "custom"`: mostra due `<input type="date">` inline
- Debounce 400ms prima di aggiornare `searchParams` e refetchare
- Validazione: `from ≤ to`, entrambe date valide
- Se `from > to` → auto-swap o errore inline

---

## Comparazione periodi

- Toggle `compareEnabled: boolean` in header (default: OFF)
- Quando ON:
  - KPI cards mostrano delta vs periodo precedente
  - Trend chart mostra linee aggiuntive (tratteggiato) per il periodo precedente
  - Top liste mostrano colonna delta
- Quando OFF: nessun delta mostrato, `useFinanceSummary(prevRange)` non viene chiamato (risparmio query)
- `prevRange`: calcolato da `getPrevRange(period, range)` → range di uguale durata immediatamente precedente

---

## Click handlers — mappa completa

| Elemento cliccabile | Azione |
|--------------------|--------|
| KPI Card "Entrate" | Apre DrillDown modal con `{ type: "income" }` |
| KPI Card "Uscite" | Apre DrillDown modal con `{ type: "expense" }` |
| KPI Card "Saldo" | Apre DrillDown modal con tutte le transazioni |
| KPI Card "Risparmio" | Apre DrillDown modal con tutte le transazioni |
| Slice donut Spese | Seleziona categoria → aggiorna `activeCategory` → filtra tabella in-page |
| Slice donut Entrate | Seleziona fonte → aggiorna `activeIncomeCat` → filtra tabella |
| Barra trend / punto area | Seleziona mese/giorno → aggiorna `activePeriodFilter` → filtra tabella |
| Cella heatmap | Seleziona data → aggiorna `activeDateFilter` → filtra tabella |
| Item lista Top Expense | Apre DrillDown modal per quella categoria |
| Item lista Top Income | Apre DrillDown modal per quella fonte |
| Riga tabella transazioni | Espande dettagli (accordion inline) |
| Edit icon in tabella | Apre `AddTransactionModal` in edit mode |
| Delete icon in tabella | Confirm inline (sostituisce riga con confirm/cancel) |
| Banner filtro attivo "×" | Rimuove filtro → torna a "tutto" |

---

## Drill-down pattern

Scelta: **modal / drawer** (non nuova rotta), per coerenza con il resto dell'app (AddTransactionModal, SettingsModal).

- Desktop (≥ 768px): `Dialog` di Radix UI
- Mobile (< 768px): `Drawer` di Radix UI (bottom sheet)

### Props `TransactionDrillDownModal`

```typescript
interface TransactionDrillDownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;                    // es. "Spese — Shopping"
  totalAmount: number;              // importo aggregato
  transactions: PersonalTransaction[];
  isLoading: boolean;
}
```

### Contenuto modal

1. Header: icona categoria + titolo + badge con importo + n° transazioni
2. Lista scrollabile (max 400px height) delle transazioni:
   - Date | Titolo | Importo (colorato)
3. Footer: link "Visualizza nella tabella" → chiude modal + applica filtro alla tabella

---

## Filtri secondari (toolbar tabella)

Tutti i filtri sono client-state (non URL) eccetto `period`:

```typescript
// State locale
const [activeCatFilter, setActiveCatFilter] = useState<string | null>(null); // da click donut
const [activePeriodFilter, setActivePeriodFilter] = useState<string | null>(null); // da click trend
const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null); // da heatmap
const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
const [searchQuery, setSearchQuery] = useState("");
const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
```

**Merging filtri:** i filtri si sommano (AND logic):
```typescript
const activeFilters: TransactionFilters = useMemo(() => ({
  dateFrom: activeDateFilter ?? range.from,
  dateTo: activeDateFilter ?? range.to,
  type: typeFilter === "all" ? undefined : typeFilter,
  category: activeCatFilter ?? undefined,
  search: searchQuery || undefined,
  // payment_method non ancora in TransactionFilters — aggiungere se GAP 4 risolto
}), [activeCatFilter, activeDateFilter, typeFilter, searchQuery, range]);
```

**Banner filtro attivo:**
```
Filtro attivo: Shopping  ×    (se attivo da donut)
Filtro attivo: Mar 26    ×    (se attivo da trend)
Filtro attivo: 15 Apr    ×    (se attivo da heatmap)
```

---

## URL state

Parametri serializzati in `searchParams`:

| Param | Tipo | Esempio |
|-------|------|---------|
| `p` | Period value | `?p=month` `?p=3months` `?p=custom` |
| `from` | YYYY-MM-DD | `?from=2026-01-01` (solo se `p=custom`) |
| `to` | YYYY-MM-DD | `?to=2026-04-30` (solo se `p=custom`) |
| `cmp` | "1" | `?cmp=1` (comparazione ON) |

Filtri secondari (categoria, data drill-down) NON vanno in URL — sono volatili e cambiano frequentemente. Solo il periodo è condivisibile.

```typescript
// Inizializzazione da URL
const [searchParams, setSearchParams] = useSearchParams();
const initialPeriod = (searchParams.get("p") as Period) ?? "month";
const [period, setPeriod] = useState<Period>(initialPeriod);

// Aggiornamento URL al cambio periodo
function handlePeriodChange(p: Period) {
  setPeriod(p);
  const params: Record<string, string> = { p };
  if (p === "custom") { params.from = customFrom; params.to = customTo; }
  setSearchParams(params, { replace: true });
}
```

---

## Hover states e tooltip

### Tooltip glass standard

Tutti i tooltip Recharts usano lo stesso stile glass:

```typescript
function GlassTip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--glass-bg-elevated)",
      border: "1px solid var(--glass-border)",
      borderRadius: 10,
      padding: "8px 12px",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
    }}>
      {label && <p style={{ color: "var(--text-tertiary)", margin: "0 0 4px", fontSize: 11 }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, margin: "2px 0", fontWeight: 600 }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}
```

### Hover su item liste

- Background passa da `var(--glass-bg)` a `var(--glass-bg-elevated)` (transition 0.12s)
- Cursor: pointer
- Implementato via `onMouseEnter`/`onMouseLeave` inline (coerente con pattern Sidebar)
