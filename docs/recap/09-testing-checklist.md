# 09 — Testing Checklist

Tutti i test sono manuali (nessun test unitario richiesto). Eseguire nell'ordine elencato.

---

## 1. Selettore periodo

- [ ] Click su ogni preset (9 total) → tutti i widget si aggiornano
- [ ] "Personalizzato" → mostra date picker, altri preset nascosti
- [ ] Custom date range: `from` cambia → widget si aggiornano (dopo debounce 400ms)
- [ ] Custom date range: `to` cambia → idem
- [ ] Custom `from > to` → validazione blocca o auto-swap
- [ ] Refresh pagina con `?p=3months` in URL → periodo corretto preselezionato
- [ ] Refresh pagina con `?p=custom&from=2026-01-01&to=2026-03-31` → date corrette
- [ ] Back/Forward browser → periodo si ripristina
- [ ] Cambio periodo resetta filtri attivi (category, date, etc.)

---

## 2. Toggle comparazione

- [ ] Toggle OFF (default) → nessun delta mostrato, `useFinanceSummary(prevRange)` non chiamato
- [ ] Toggle ON → delta apparsi su KPI cards e Top liste
- [ ] Toggle OFF di nuovo → delta spariscono
- [ ] Delta Entrate: Δ positivo = verde, Δ negativo = rosso
- [ ] Delta Uscite: Δ positivo = rosso (peggio), Δ negativo = verde (meglio)
- [ ] Δ su periodo senza dati (prev empty) → mostra "—" non NaN/Infinity

---

## 3. KPI Cards

- [ ] 4 card visibili con valori corretti (verificare a mano con dati reali)
- [ ] Savings rate formula: `(income - expenses) / income * 100`
- [ ] Savings ≥ 20% → verde; 0-20% → giallo; <0% → rosso
- [ ] Saldo ≥ 0 → verde; < 0 → rosso
- [ ] Loading state → 4 skeleton card
- [ ] Click card "Entrate" → modal aperto con lista transazioni income
- [ ] Click card "Uscite" → modal con expense transactions
- [ ] Click card "Saldo" → modal con tutte le transazioni
- [ ] Modal mostra solo transazioni del periodo selezionato
- [ ] Modal mobile → bottom drawer (non modal centrato)

---

## 4. Donut Spese

- [ ] Donut visibile con colori corretti per ogni categoria
- [ ] Testo al centro mostra totale uscite
- [ ] Hover su slice → tooltip con nome, importo, %
- [ ] Click su slice → evidenzia slice + filtra tabella in fondo
- [ ] Banner "Filtro attivo: [categoria] ×" appare sulla tabella
- [ ] Click "×" del banner → rimuove filtro, tabella torna a tutto
- [ ] Click su stesso slice attivo → deseleziona
- [ ] Empty state se nessuna uscita nel periodo
- [ ] Categorie > 6 → top 6 + "Altro" aggregato
- [ ] Loading state → skeleton circolare

---

## 5. Donut Entrate

- [ ] Stessi test del Donut Spese
- [ ] Colori corrispondenti a categorie income (verde/teal, non rosso)
- [ ] Aggregazione da transazioni income (non da `categoryBreakdown` che è solo expense)

---

## 6. Area Chart Trend

- [ ] Periodo ≤ 31 giorni → asse X mostra giorni (15 Apr, 16 Apr...)
- [ ] Periodo > 31 giorni → asse X mostra mesi (Mar 26, Apr 26...)
- [ ] Due aree: income verde, expenses rosso, semitrasparenti
- [ ] Hover → tooltip verticale con income + expenses + netto per quel punto
- [ ] Click su punto/area → filtra tabella per quel mese/giorno
- [ ] Empty state se nessun dato nel periodo
- [ ] Loading state → skeleton rettangolare

---

## 7. Cashflow Waveform

- [ ] Parte da zero al giorno `range.from`
- [ ] Cresce con entrate, scende con uscite
- [ ] Area verde sopra baseline zero, rossa sotto
- [ ] Baseline `ReferenceLine y={0}` visibile
- [ ] Hover → tooltip con data, delta giornaliero, saldo cumulativo
- [ ] Click → filtra tabella per quella data
- [ ] Empty (periodo senza transazioni) → empty state
- [ ] Periodo solo expense → curva sempre sotto zero (solo area rossa)

---

## 8. Top Liste (Expense + Income)

- [ ] 5 item ordinati per importo decrescente
- [ ] Barra progresso corretta:
  - Con budget mensile: % consumata (es. €590/€800 = 73%)
  - Senza budget: % sul totale spese (es. 32%)
- [ ] Delta con freccia ↑↓ e colore corretto
- [ ] Click su item → modal con transazioni di quella categoria
- [ ] Modal mostra solo transazioni del tipo + categoria corretti
- [ ] Loading state → 5 skeleton item
- [ ] Empty state se nessun dato

---

## 9. Heatmap Calendario

- [ ] Cella vuota (0 spese) → colore neutro
- [ ] Intensità cella proporzionale all'importo (più scuro = più speso)
- [ ] Hover su cella → tooltip con data, importo, n° transazioni
- [ ] Click su cella → filtra tabella per quella data
- [ ] Giorni fuori dal range → visivamente distinti (opacity 0.2)
- [ ] Etichetta mese sopra le settimane corretta
- [ ] Mobile: scroll orizzontale funzionante
- [ ] Anno: 52 settimane visualizzate correttamente
- [ ] Empty (nessuna spesa in tutto il range) → tutte le celle neutre

---

## 10. Tabella Transazioni

- [ ] Mostra transazioni del periodo selezionato
- [ ] Filtri toolbar funzionano (tipo, categoria, metodo, cerca)
- [ ] Filtri da widget superiori (donut, trend, heatmap) si riflettono nella tabella
- [ ] Banner filtro attivo visibile con × per rimuoverlo
- [ ] Ordinamento per data (asc/desc) funziona
- [ ] Ordinamento per importo (asc/desc) funziona
- [ ] Click su riga → espande dettagli (tags, note, metodo)
- [ ] Edit icon → apre AddTransactionModal in edit mode con dati corretti precompilati
- [ ] Delete icon → mostra confirm inline → conferma elimina → transazione sparisce
- [ ] Paginazione 20 per pagina funzionante
- [ ] Empty con filtro attivo → "Nessuna transazione per [filtro]" + link pulisci filtri
- [ ] Empty senza filtri → "Nessuna transazione" + "Aggiungi transazione" button
- [ ] Mobile: colonne ridotte (nasconde Metodo, non nasconde Importo/Data/Azioni)

---

## 11. TransactionDrillDownModal

- [ ] Titolo corretto (es. "Spese — Shopping")
- [ ] Importo totale nell'header corretto
- [ ] N° transazioni corretto
- [ ] Lista scorrevole se > 10 item
- [ ] "Vedi tutte nella tabella" → chiude modal + applica filtro categoria alla tabella
- [ ] Escape key chiude modal
- [ ] Click fuori modal (overlay) chiude modal
- [ ] Mobile: drawer bottom sheet invece di modal centrato
- [ ] Loading state nel modal (mentre fetch)

---

## 12. Reattività

- [ ] Aggiungere nuova transazione (via + nel header o da tabella) → tutti i widget si aggiornano
- [ ] Modificare transazione → widget aggiornati
- [ ] Eliminare transazione → widget aggiornati
- [ ] Cambio portale → tutti i dati cambiano (nessun leak cross-portal)

---

## 13. Edge cases

- [ ] Periodo senza alcuna transazione → tutti empty state (non crash)
- [ ] 1 solo tipo di transazione (solo expense) → donut income empty, cashflow sempre negativo
- [ ] Importo molto grande (€100.000+) → formattazione corretta (€100.000,00 o €100k)
- [ ] Categoria con nome molto lungo (30+ char) → truncate, no overflow
- [ ] Molte categorie (>10) → donut mostra top 6 + Altro aggregato
- [ ] Periodo YTD senza dati nei mesi futuri → mesi futuri non mostrati nel trend (non zero-fill)
- [ ] Transazione "transfer" → non conta in income né in expense
- [ ] Amount = 0 → non dovrebbe apparire (ma non crashare)
- [ ] Portal senza Supabase configurato → localStorage fallback, funziona uguale
- [ ] Offline → localStorage cache mostrata, nessun errore

---

## 14. Performance

Dataset di test realistico: **~200 transazioni** nel range (anno intero).

- [ ] Caricamento pagina Recap: < 1 secondo (prima render utile)
- [ ] Cambio periodo preset: < 500ms (SWR cache hit)
- [ ] Cambio periodo custom (prima volta): < 2 secondi (Supabase query)
- [ ] Click su slice/barra → filtro tabella applica in < 100ms (client-side)
- [ ] Scroll tabella 200 righe (page 1-10): nessun jank
- [ ] Heatmap 365 giorni renderizzato: < 200ms
- [ ] Animazioni entry: nessun frame drop (60fps)

---

## 15. Mobile (< 768px)

- [ ] Period selector → dropdown select al posto di pill row
- [ ] KPI cards → 2×2 layout, font ridotto
- [ ] Donut → full width, altezza 160px
- [ ] Trend/Cashflow → full width, altezza 160px
- [ ] Top liste → full width, stacked
- [ ] Heatmap → scroll orizzontale con scroll indicator visibile
- [ ] Tabella → colonne ridotte (Metodo nascosto), touch-friendly row height (minH 44px)
- [ ] Modal → bottom drawer, 80vh max height, scroll interno

---

## 16. TypeScript

- [ ] `npx tsc --noEmit` passa senza errori dopo ogni step
- [ ] Nessun `any` non giustificato introdotto
- [ ] Tutti i props dei nuovi componenti hanno interface tipata
