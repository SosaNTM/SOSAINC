# 03 — Features Spec

## Widget 1 — KPI Cards

**Scopo:** colpo d'occhio sui 4 numeri più importanti del periodo, con confronto vs periodo precedente.

**Dati richiesti:**
- `totalIncome`, `totalExpenses`, `netBalance` → da `useFinanceSummary(range)`
- Stessi 3 per il periodo precedente → da `useFinanceSummary(prevRange)`
- `transactionCount` → da summary corrente
- Savings rate = `(totalIncome - totalExpenses) / totalIncome * 100`

**Card layout (4 card in riga, wrap su mobile):**

| Card | Valore | Delta | Colore valore |
|------|--------|-------|---------------|
| Totale Entrate | `formatCurrency(totalIncome)` | `Δ% vs prev` | `--color-success` |
| Totale Uscite | `formatCurrency(totalExpenses)` | `Δ% vs prev` | `--color-error` |
| Saldo Netto | `formatCurrency(netBalance)` | `Δ% vs prev` | success se ≥0, error se <0 |
| Tasso Risparmio | `${savingsPct}%` | `Δpp vs prev` | success ≥20%, warning 0-20%, error <0% |

**Delta rendering:**
- `+12%` in verde se migliora (income: +, expense: -, saving: +)
- `-8%` in rosso se peggiora
- `—` se prev period ha 0 dati (no divisione per zero)
- Delta logic: per expense un aumento è negativo (rosso), al contrario di income

**Interazioni:**
- Click su ogni card → apre `TransactionDrillDownModal` con le transazioni del tipo corrispondente
  - Card Entrate → `filter: { type: "income" }`
  - Card Uscite → `filter: { type: "expense" }`
  - Card Saldo → tutte le transazioni
  - Card Risparmio → tutte le transazioni (con savings breakdown visibile nel modal)

**Stati:**
- Loading: 4 skeleton card (stessa dimensione)
- Empty: valori a zero, nessun delta (non nascondere le card)
- Error: bordo rosso + "Errore caricamento" sotto il valore

**Responsive:**
- Desktop (>1024px): 4 card in riga orizzontale
- Tablet (768-1024px): 2×2 grid
- Mobile (<768px): stack verticale 1 colonna (o 2×2 con font ridotto)

---

## Widget 2 — Spese per Categoria (Donut)

**Scopo:** mostra la distribuzione percentuale delle uscite tra categorie.

**Dati richiesti:**
- `categoryBreakdown[]` → da `useFinanceSummary(range)` (contiene già amount, percentage, color)
- Mostrare top 6, voce "Altro" aggregata se categorie > 6

**Chart:**
- `PieChart` con `innerRadius={55}` `outerRadius={90}` (donut)
- Centro del donut: importo totale uscite (testo sovrapposto via custom label o absolute position)
- Colori: da `categoryBreakdown[i].color` (risolti tramite `financeCategoryStore`)
- Legenda inline sotto il chart (dot + nome + %)

**Interazioni:**
- Hover su slice → tooltip glass con: nome categoria, importo, %, n° transazioni
- Click su slice → seleziona categoria → filtra tabella transazioni in fondo alla pagina (non modal)
- Slice selezionato: stroke bianco 2px + lieve scale-up (via `activeIndex` Recharts)
- Click fuori / click slice attivo → deseleziona (torna a "tutto")

**Stati:**
- Loading: skeleton circolare (div rotondo 180px con animazione pulse)
- Empty: icona + "Nessuna spesa nel periodo"

**Responsive:**
- Desktop: fianco a fianco con donut Entrate
- Mobile: full width, stacked

**Edge case:**
- Periodo senza spese → empty state
- Una sola categoria → donut pieno di un colore (ok, recharts lo gestisce)
- Categoria con nome molto lungo → truncate con ellipsis in legenda

---

## Widget 3 — Entrate per Fonte (Donut)

**Scopo:** distribuzione delle entrate tra fonti (categorie income).

**Dati richiesti:**
- `useTransactions({ type: "income", dateFrom, dateTo })` → aggregazione client-side per categoria
- Color map da `getAllCategories(portalId)` filtrate per type="income"

**Chart:** identico al Widget 2 con colori diversi (pallette income).

**Interazioni:** identiche al Widget 2 (click su slice → filtra tabella).

**Edge case:**
- Periodo senza entrate → empty state
- Categoria "income" non matchata in color map → fallback `#6b7280`

---

## Widget 4 — Trend Entrate vs Uscite (Area Chart)

**Scopo:** visualizzare l'andamento mensile/settimanale delle entrate e uscite nel periodo selezionato, con curve morbide.

**Dati richiesti:**
- `monthlyBreakdown[]` da `useFinanceSummary(range)`
- Se periodo ≤ 31 giorni: aggregazione giornaliera (da transactions) invece che mensile
- Se periodo > 31 giorni: aggregazione mensile (già disponibile)

**Chart:**
- `AreaChart` con `type="monotone"` per curve smooth
- Area Entrate: fill verde trasparente (20% opacity), stroke verde
- Area Uscite: fill rosso trasparente (20% opacity), stroke rosso
- Baseline a zero, asse Y con suffisso `€` o `k`
- Griglia orizzontale dashed, nessuna griglia verticale

**Interazioni:**
- Hover su qualsiasi punto → tooltip verticale (linea tratteggiata + tooltip glass) con:
  - Label periodo (es. "Mar 26" o "15 Apr")
  - Entrate: `€1.200`
  - Uscite: `€890`
  - Netto: `€310`
- Click su un punto / area mensile → filtra la tabella transazioni per quel mese/giorno

**Stati:**
- Loading: skeleton rettangolare
- Empty (0 o 1 solo mese): mostra il singolo punto o empty state
- 1 solo mese con dati: mostra barre invece di area (non ha senso la curva con 1 punto)

**Responsive:** full width in entrambi i breakpoint

---

## Widget 5 — Cashflow Waveform

**Scopo:** visualizzare il flusso di cassa cumulativo giorno per giorno. Mostra quando il saldo sale (entrate) e quando scende (uscite), con la baseline a zero.

**Dati richiesti:**
- Tutte le transazioni del periodo (non aggregate) ordinate per data
- Calcolo running balance: `Σ(income - expense)` cumulativo giorno per giorno

**Chart:**
- `AreaChart` con singola serie `netCumulative`
- Area sopra lo zero: fill verde (gradiente verticale da verde pieno a trasparente)
- Area sotto lo zero: fill rosso (gradiente verticale da rosso pieno a trasparente)
- Implementazione: due `Area` con clip path, oppure custom gradiente con `defs/linearGradient`
- `stroke` unico con colore che cambia (non triviale in Recharts) → alternativa: stroke verde sempre, fill bicolore
- Baseline `y=0` come `ReferenceLine`

**Interazioni:**
- Hover → tooltip con: data, cashflow giornaliero (delta), saldo cumulativo
- Click → filtra tabella per quella data

**Stati:**
- Loading: skeleton
- Empty: empty state
- Tutti positivi / tutti negativi: l'area è monocolore (ok)

**Responsive:** full width

---

## Widget 6 — Top Categorie di Spesa (Lista)

**Scopo:** ranking delle 5 categorie di spesa più rilevanti con barra di progresso e confronto periodo precedente.

**Dati richiesti:**
- `categoryBreakdown[]` da summary corrente (top 5)
- `categoryBreakdown[]` da `useFinanceSummary(prevRange)` per delta
- Budget mensile della categoria (da `expense_categories.monthly_budget`) — opzionale per barra progresso

**Layout per item:**
```
[rank] [color-dot] [nome categoria] [barra progresso] [importo] [% sul totale] [Δ%]
```

**Barra progresso:**
- Se categoria ha `monthly_budget`: mostra % di budget consumato (colorazione verde→giallo→rosso)
- Se no budget: mostra % sul totale spese del periodo (sempre verde)

**Interazioni:**
- Click su item → apre `TransactionDrillDownModal` filtrato per quella categoria
- Hover → highlight dell'item + tooltip con dettagli

**Delta coloring:**
- Δ positivo (spesa aumentata) → rosso con ↑
- Δ negativo (spesa diminuita) → verde con ↓
- No prev data → `—`

**Stati:** loading (5 skeleton), empty ("Nessuna spesa")

---

## Widget 7 — Top Fonti di Entrata (Lista)

**Scopo:** identico al Widget 6 ma per le entrate.

**Dati richiesti:** income breakdown da transactions (stesso di Widget 3).

**Delta coloring (inverso):**
- Δ positivo (entrata aumentata) → verde con ↑
- Δ negativo (entrata diminuita) → rosso con ↓

---

## Widget 8 — Heatmap Calendario (Opzionale)

**Scopo:** intensità di spesa giorno per giorno nel periodo, come una github contribution graph.

**Dati richiesti:**
- Transazioni giornaliere aggregate per data (`date`, `SUM(amount)` dove type=expense)
- Calcolato client-side dall'array completo di transactions

**Rendering:**
- Griglia di celle (7 colonne = giorni settimana, righe = settimane del periodo)
- Cella vuota (nessuna transazione) → colore neutro `var(--glass-bg)`
- Cella con spesa → gradiente da colore light a `var(--color-error)` proporzionale all'importo
- Giorni fuori dal range → opacity 0.2
- Mesi con etichetta sopra le colonne

**Interazioni:**
- Hover su cella → tooltip con data + importo totale uscite + n° transazioni
- Click su cella → filtra tabella per quella data

**Responsive:**
- Desktop: griglia piena
- Mobile: versione ridotta (14 giorni o scrollabile orizzontalmente)

**Edge case:**
- Nessuna spesa in alcuni giorni → cella grigia neutra
- Range lungo (1 anno): 52+ colonne — su mobile: scroll orizzontale

---

## Widget 9 — Tabella Transazioni Filtrabili

**Scopo:** elenco completo delle transazioni del periodo, ordinabili e filtrabili. Viene filtrata automaticamente quando l'utente clicca su widget superiori.

**Dati richiesti:**
- `useTransactions(activeFilters)` — rispetta sempre i filtri derivati dai widget

**Colonne:**
| Colonna | Dati |
|---------|------|
| Data | `tx.date` formattato (GG/MM/YYYY) |
| Tipo | badge income/expense |
| Categoria | emoji + nome |
| Titolo/Desc | `tx.subcategory ?? tx.description` (truncate 40 char) |
| Importo | `formatCurrency(tx.amount)`, verde se income, rosso se expense |
| Metodo | icona + label payment method |
| Tag | pill per ogni tag |
| Azioni | edit (pencil) + delete (trash) icon |

**Ordinamento:** click su header colonna → asc/desc (client-side sull'array)

**Filtri secondari (toolbar sopra tabella):**
- Tipo: All / Entrate / Uscite
- Categoria: select dropdown (dinamico con categorie presenti nel periodo)
- Metodo pagamento: select
- Cerca: input text (description + category)
- Pulisci filtri: "×" button

**Paginazione:**
- 20 righe per pagina (riusa `page`/`hasMore` di `useTransactions`)
- Se filtro attivo da widget superiore: mostra banner "Filtro attivo: [categoria/mese]" con × per rimuoverlo

**Interazioni:**
- Edit icona → apre `AddTransactionModal` in modalità edit
- Delete icona → conferma inline (swap del row con confirm/cancel)
- Click su riga → espande dettagli (tags, note, metodo)

**States:**
- Loading: skeleton righe
- Empty con filtri attivi: "Nessuna transazione per [filtro]. [Pulisci filtri]"
- Empty senza filtri: "Nessuna transazione nel periodo. [+ Aggiungi transazione]"

---

## Widget drill-down: TransactionDrillDownModal

**Scopo:** modale riusabile aperto da KPI cards e Top Liste, mostra le transazioni che compongono un valore aggregato.

**Contenuto:**
- Header: nome categoria/tipo + importo totale + n° transazioni
- Lista transazioni (stessa struttura della tabella, senza colonne azioni)
- Footer: "Vedi tutte in tabella" → chiude modal e applica filtro alla tabella

**Implementazione:**
- `Dialog` di Radix su desktop
- `Drawer` di Radix su mobile (bottom sheet)
- Componente: `src/components/finance/TransactionDrillDownModal.tsx`
- Props: `{ open, onClose, title, transactions, isLoading }`
