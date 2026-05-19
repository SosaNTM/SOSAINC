# Testing Matrix — QA Cross-Portale Settings

Eseguire dopo ogni step di implementazione. Setup: due portali distinti (es. REDX e SOSA) con due utenti distinti (A = owner REDX, B = owner SOSA).

---

## Setup Pre-Test

```
1. Utente A: login → Portale REDX
2. Utente B: login → Portale SOSA  
3. Ogni test indica quale utente e quale portale usare
```

---

## Test Generali Cross-Portale

| ID | Scenario | Utente | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|---|
| T00 | Switch portale | A | REDX → SOSA | Cliccare "Back to Hub" → selezionare SOSA | Tutti i settings cambiano ai dati di SOSA | ⬜ |
| T01 | Isolamento base | A | REDX | Creare categoria entrate "Freelance REDX" | Visibile in REDX | ⬜ |
| T02 | Isolamento base | A | SOSA | Aprire categorie entrate | "Freelance REDX" NON visibile | ⬜ |
| T03 | Switch rapido | A | REDX → SOSA → REDX | Switchiare 3x in 5 secondi | UI sempre mostra dati del portale corrente, nessun mix | ⬜ |

---

## Profilo Portale

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T10 | Salva | REDX | Compilare "Ragione Sociale: REDX Ltd" → Salva | Toast success | ⬜ |
| T11 | Isolamento | SOSA | Aprire Profilo Portale | "Ragione Sociale" vuota o con valore SOSA (NON "REDX Ltd") | ⬜ |
| T12 | Persistenza | REDX | Ricaricare pagina | "REDX Ltd" ancora presente | ⬜ |
| T13 | Annulla | REDX | Modificare campo → Annulla | Campo ritorna al valore salvato | ⬜ |

---

## Finanza — Categorie Entrate

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T20 | Crea | REDX | Aggiungere categoria "Consulenze" | Visibile in REDX | ⬜ |
| T21 | Isolamento | SOSA | Aprire categorie entrate | "Consulenze" NON visibile | ⬜ |
| T22 | Modifica | REDX | Rinominare "Consulenze" → "Consulenze IT" | Aggiornato solo in REDX | ⬜ |
| T23 | Cancella | REDX | Eliminare "Consulenze IT" | Rimossa da REDX, SOSA invariato | ⬜ |

---

## Finanza — Categorie Uscite

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T30 | Crea | REDX | Aggiungere "Affitto Ufficio" | Visibile in REDX | ⬜ |
| T31 | Isolamento | SOSA | Aprire categorie uscite | "Affitto Ufficio" NON visibile | ⬜ |

---

## Finanza — Categorie Abbonamenti

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T40 | Crea + Isolamento | REDX | Crea "SaaS Tools", switcha SOSA | NON visibile in SOSA | ⬜ |

---

## Finanza — Metodi di Pagamento

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T50 | Crea + Isolamento | REDX | Crea "Revolut Business", switcha SOSA | NON visibile in SOSA | ⬜ |

---

## Finanza — Regole Ricorrenza

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T60 | Crea + Isolamento | REDX | Crea regola mensile, switcha SOSA | NON visibile in SOSA | ⬜ |

---

## Finanza — Categorie Transazioni

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T70 | Crea + Isolamento | REDX | Crea "Marketing Digitale", switcha SOSA | NON visibile in SOSA | ⬜ |
| T71 | Hook context | REDX | Aprire TransactionCategories | Dati caricati correttamente (verifica usePortalDB fix) | ⬜ |

---

## Progetti — Stati Progetto

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T80 | Crea + Isolamento | REDX | Crea stato "In Review", switcha SOSA | NON visibile in SOSA | ⬜ |

---

## Progetti — Priorità e Label

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T90 | Crea + Isolamento | REDX | Crea priorità "Critico", switcha SOSA | NON visibile in SOSA | ⬜ |

---

## Progetti — Template Attività

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T100 | Crea + Isolamento | REDX | Crea template "Sprint Setup", switcha SOSA | NON visibile in SOSA | ⬜ |

---

## Social Media — Account Social

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T110 | Crea | REDX | Connettere account Instagram REDX | Visibile in REDX | ⬜ |
| T111 | Isolamento | SOSA | Aprire Account Social | Instagram REDX NON visibile | ⬜ |
| T112 | RLS DB | REDX | Query diretta Supabase JS: `from("social_connections").select("*")` | Ritorna solo connections del portale corrente | ⬜ |

---

## Social Media — Regole Pubblicazione

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T120 | Modifica + Isolamento | REDX | Impostare frequenza "3 volte/settimana", switcha SOSA | Frequenza SOSA invariata | ⬜ |

---

## Notifiche — Canali

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T130 | Modifica + Isolamento | REDX | Abilitare canale Email, switcha SOSA | Stato canale Email di SOSA invariato | ⬜ |

---

## Notifiche — Regole Avviso

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T140 | Crea + Isolamento | REDX | Crea avviso "Budget > 80%", switcha SOSA | NON visibile in SOSA | ⬜ |

---

## Zona Pericolosa — Reset Portale

| ID | Scenario | Portale | Azione | Risultato Atteso | Status |
|---|---|---|---|---|---|
| T200 | Auth check | REDX (non-owner) | Aprire Zona Pericolosa | Bottone reset non visibile / disabled | ⬜ |
| T201 | Prima confirm | REDX (owner) | Cliccare "Reset Portale" | Modale prima conferma appare | ⬜ |
| T202 | Seconda confirm | REDX (owner) | Digitare nome sbagliato | Bottone "Elimina" disabled | ⬜ |
| T203 | Seconda confirm | REDX (owner) | Digitare nome corretto | Bottone "Elimina" abilitato | ⬜ |
| T204 | Esecuzione | REDX (owner) | Confermare reset | Loading → toast success → redirect dashboard | ⬜ |
| T205 | Isolamento post-reset | REDX | Aprire Transazioni | Lista vuota | ⬜ |
| T206 | Portale B intatto | SOSA | Aprire Transazioni dopo reset REDX | Dati SOSA intatti | ⬜ |
| T207 | Settings preservati | REDX | Aprire Categorie Entrate dopo reset | Le categorie pre-reset sono ancora presenti | ⬜ |
| T208 | Membership preservata | REDX | Controllare membri portale | Tutti i membri ancora presenti | ⬜ |

---

## Checklist Finale

- [ ] Zero voci con stato ❌ in `01-settings-inventory.md`
- [ ] Tutti i test T00-T208 passati
- [ ] `npx tsc --noEmit` senza errori
- [ ] Nessun `console.error` nel browser durante i test
- [ ] Supabase logs: nessuna query senza `portal_id` filter sulle tabelle settings
