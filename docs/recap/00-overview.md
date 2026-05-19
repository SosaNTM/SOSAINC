# 00 — Overview

## Obiettivo

Recap è la dashboard analitica centrale della sezione Finance: aggrega, visualizza e rende interattivi tutti i dati finanziari del portale selezionato in un dato periodo. L'utente deve poter rispondere in pochi secondi alle domande "quanto ho speso?", "dove vanno i soldi?", "sto migliorando rispetto al mese scorso?" senza aprire tabelle, esportare CSV o fare calcoli manuali. Tutti i widget leggono da fonti dati reali (Supabase + fallback localStorage), si aggiornano al cambio periodo, e supportano drill-down via modal inline.

---

## Indice documenti

| File | Contenuto |
|------|-----------|
| `01-codebase-analysis.md` | Struttura Finance esistente, stack tecnico, pattern routing/fetch/naming |
| `02-data-model.md` | Schema tabelle, campi disponibili, relazioni, query esistenti riusabili |
| `03-features-spec.md` | Specifica dettagliata di ogni widget (dati, stati, edge case, responsive) |
| `04-data-sources.md` | Query per ogni widget, strategia caching, GAP identificati |
| `05-interactivity-spec.md` | Selettore periodo, click handlers, drill-down, URL state, filtri |
| `06-reactivity-architecture.md` | Flusso dati DB→componente, state management, invalidazione, performance |
| `07-ui-ux-spec.md` | Layout ASCII, griglia responsive, palette, animazioni, accessibilità |
| `08-implementation-plan.md` | Roadmap step-by-step atomica, file toccati per step |
| `09-testing-checklist.md` | Scenari di test manuali, edge case, performance, mobile |

---

## Definizione di "Done" — Criteri di Accettazione

- [ ] Tutti i 9 widget implementati e visibili alla rotta `/:portalId/recap`
- [ ] Nav item "Recap" attivo nel Finance accordion della sidebar (già fatto)
- [ ] Selettore periodo: 9 preset + range custom con date picker
- [ ] Comparazione periodo precedente ON/OFF su tutti i widget che mostrano delta
- [ ] Ogni KPI card cliccabile → modal con lista transazioni filtrate
- [ ] Ogni slice del donut cliccabile → filtra tabella transazioni in-page
- [ ] Trend chart: click su barra/punto → filtra tabella per quel mese
- [ ] Heatmap calendario: hover mostra importo, click filtra tabella
- [ ] Tabella transazioni in fondo alla pagina: ordinabile, filtrabile, paginata
- [ ] URL query string riflette periodo + filtri attivi (condivisibile, back/forward funzionanti)
- [ ] Tutti i loading state mostrano skeleton (non spinner)
- [ ] Tutti gli empty state mostrano messaggio + CTA "Aggiungi transazione"
- [ ] Tutti gli error state mostrano messaggio + retry button
- [ ] Layout responsive: mobile stack singola colonna, tablet 2 col, desktop 3 col
- [ ] Aggiornamento reattivo: nuova transazione aggiunta → tutti i widget si aggiornano senza reload
- [ ] Nessuna nuova dipendenza non giustificata
- [ ] `npx tsc --noEmit` passa clean
- [ ] Tutti i label UI in italiano
