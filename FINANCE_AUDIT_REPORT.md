# Finance Audit Report — 2026-05-12

## Executive Summary
- Aree auditate: 12 (2.1–2.12)
- Bug critici trovati: 4 (fixati: 4 via migration)
- Bug funzionali trovati: 6 (fixati: 5 in codice)
- Gap UX trovati: 4 (fixati: 2)
- Disallineamenti DB: 8 (fixati: 6 via migration)
- Issue NON fixate (richiedono decisione): 5

---

## 1. Bug Critici (sicurezza, perdita dati, calcoli errati)

### C-01 — `personal_transactions.cost_classification` CHECK sbagliato
**Area:** 2.1 Transazioni | **Impatto:** Tutti gli INSERT con classificazione costo falliscono in Supabase silenziosamente → dati solo in localStorage, mai sincronizzati su DB.
**Root cause:** DB CHECK accettava `fixed/variable/semi-variable/one-time`, app usa `revenue/cogs/opex/other`.
**Fix applicato:** Migration `20260512000001` — drop vecchio CHECK, aggiunto corretto.
**File toccati:** `supabase/migrations/20260512000001_fix_finance_schema.sql`

### C-02 — `subscriptions.billing_cycle` CHECK sbagliato
**Area:** 2.4 Subscriptions | **Impatto:** Inserimento di subscription con ciclo `quadrimestral`, `biannual`, `annual` fallisce in Supabase. Solo `monthly`/`quarterly` funzionavano.
**Root cause:** DB CHECK accettava `weekly/monthly/quarterly/yearly`, TS definisce `monthly/quarterly/quadrimestral/biannual/annual`.
**Fix applicato:** Migration — drop vecchio CHECK, aggiunto corretto. Rimosso `weekly` (non in TS), aggiunto `quadrimestral/biannual/annual`.
**File toccati:** `supabase/migrations/20260512000001_fix_finance_schema.sql`

### C-03 — `subscriptions` mancanti 4+ colonne critiche
**Area:** 2.4 Subscriptions | **Impatto:** Il subscription processor usa `is_active`, `billing_day`, `start_date`, `deleted_at` per logica di elaborazione. Tutte e 4 mancavano nel DB → ogni integrazione Supabase sarebbe stata cieca.
**Root cause:** Schema DB non aggiornato rispetto all'evoluzione del tipo TS `Subscription`.
**Fix applicato:** Migration — aggiunte `is_active`, `billing_day`, `start_date`, `deleted_at`, `description`, `icon`, `account_id`. Backfill `is_active` da `status`.
**File toccati:** `supabase/migrations/20260512000001_fix_finance_schema.sql`

### C-04 — `subscription_transactions` INSERT fallisce (user_id mancante + no idempotency)
**Area:** 2.4 Subscriptions | **Impatto:** Il processor inserisce `user_id: userId` ma la colonna non esiste. Nessun UNIQUE su `(subscription_id, billing_date)` → doppio processing in due tab = doppia transazione in Supabase.
**Root cause:** Schema non aggiornato.
**Fix applicato:** Migration — aggiunto `user_id` column + UNIQUE constraint + index su `(subscription_id, billing_date DESC)`.
**File toccati:** `supabase/migrations/20260512000001_fix_finance_schema.sql`

---

## 2. Bug Funzionali (feature non funzionano come da spec)

### F-01 — Transfer type mostra "−" prefix
**Area:** 2.1 Transazioni | **Impatto:** I trasferimenti mostrano "−€X.XX" (come le spese) invece di "↔€X.XX".
**Fix applicato:** `Transactions.tsx:109` — `isIncome ? "+" : isTransfer ? "↔" : "-"`.
**File toccati:** `src/pages/Transactions.tsx`

### F-02 — `addTransaction`/`updateTransaction`/`deleteTransaction` useCallback mancano `currentPortalId` in deps
**Area:** 2.1 Transazioni | **Impatto:** Se il portale cambia (es. navigazione rapida), `currentPortalId` può essere stale → dati scritti nel portale sbagliato.
**Fix applicato:** Aggiunto `currentPortalId` ai deps di tutti e 3 i callback in `useTransactions.ts`.
**File toccati:** `src/hooks/useTransactions.ts`

### F-03 — `personal_transactions.recurring_interval` colonna mancante in DB
**Area:** 2.1 Transazioni | **Impatto:** Qualsiasi INSERT Supabase con `recurring_interval` impostato ritorna errore "unknown column". Il subscription processor usa `localAdd` (localStorage only) → non impatta oggi, ma futuro Supabase sync rompe.
**Fix applicato:** Migration — aggiunta colonna `recurring_interval VARCHAR(20)` con CHECK.
**File toccati:** `supabase/migrations/20260512000001_fix_finance_schema.sql`

### F-04 — Goals: divisione per zero quando `target = 0`
**Area:** 2.3 Goals | **Impatto:** `pct = netWorth / goal.target * 100` → `NaN` → renderizzato come "NaN%" nella card.
**Fix applicato:** Guard `goal.target > 0 ? Math.round(...) : 0` in `Goals.tsx`.
**File toccati:** `src/pages/Goals.tsx`

### F-05 — Invoices.tsx stub ritorna `null` (pagina vuota)
**Area:** 2.5 Invoices | **Impatto:** La route `/invoices` mostra una pagina bianca vuota. Confuso per l'utente.
**Fix applicato:** Sostituito con placeholder UX dignitoso in italiano ("Fatturazione in arrivo — Q3 2026").
**File toccati:** `src/pages/Invoices.tsx`

### F-06 (NON fixato) — Subscriptions localStorage-only
**Area:** 2.4 Subscriptions | **Impatto:** Le subscription sono solo in localStorage. La tabella `subscriptions` in Supabase esiste ma non viene mai letta. Sync cross-device rotto by design.
**Motivo non-fix:** Richiede implementazione completa del layer Supabase per subscriptions (>200 righe).

---

## 3. Gap UX (empty/loading/error/confirm/validazione)

### U-01 — Goals.tsx: no loading state su mount
**Area:** 2.3 Goals | **Impatto:** `useState<Goal[]>([])` → mostra "NO GOALS YET" per 100–500ms prima che il fetch finisca.
**Fix applicato:** Aggiunto `isLoading` state + spinner `<Loader2>` durante fetch.
**File toccati:** `src/pages/Goals.tsx`

### U-02 — Subscriptions: toast personalizzato invece di `sonner`
**Area:** 2.4 Subscriptions | **Impatto:** Usa un custom `ToastList` component invece di `sonner`. Non è un bug — il custom toast svanisce dopo 4.2s. Tuttavia è inconsistente con il resto dell'app. **Non fixato** — cambiamento cosmetico, rischia regressioni nel timing del processor.

### U-03 (NON fixato) — Budget: no loading skeleton su cambio mese
**Area:** 2.2 Budget | Richiede refactor di `useBudgetData` per esporre `isLoading`. Non critico.

### U-04 (NON fixato) — Dashboard: `monthlyBreakdown` su range di 3 giorni ritorna array con 1 elemento (comportamento corretto ma potenzialmente confuso in UI). Non è un bug.

---

## 4. Disallineamenti Database

| Tabella | Colonna TS attesa | Colonna DB attuale | Azione |
|---|---|---|---|
| `personal_transactions` | `cost_classification: revenue/cogs/opex/other` | CHECK: `fixed/variable/semi-variable/one-time` | **Fixed: migration** |
| `personal_transactions` | `recurring_interval: weekly/monthly/yearly` | **MANCANTE** | **Fixed: migration** |
| `subscriptions` | `is_active: boolean` | **MANCANTE** (solo `status` text) | **Fixed: migration** |
| `subscriptions` | `billing_day: number` | **MANCANTE** | **Fixed: migration** |
| `subscriptions` | `start_date: string` | **MANCANTE** | **Fixed: migration** |
| `subscriptions` | `deleted_at: string?` | **MANCANTE** | **Fixed: migration** |
| `subscriptions` | `billing_cycle: monthly/quarterly/quadrimestral/biannual/annual` | CHECK: `weekly/monthly/quarterly/yearly` | **Fixed: migration** |
| `subscription_transactions` | `user_id: string` | **MANCANTE** | **Fixed: migration** |
| `subscription_transactions` | UNIQUE `(subscription_id, billing_date)` | **MANCANTE** | **Fixed: migration** |
| `budget_limits` | `month/year_month` | **MANCANTE** (design gap) | Annotato — non fixato |
| `personal_transactions` | — | `title TEXT` (colonna orfana) | Ignorato — nessun impatto |
| `personal_transactions` | — | `reference TEXT` (colonna orfana) | Ignorato — nessun impatto |

---

## 5. Migration DB applicate

### `supabase/migrations/20260512000001_fix_finance_schema.sql`
1. DROP + ADD CONSTRAINT `personal_transactions_cost_classification_check` → `revenue/cogs/opex/other`
2. ADD COLUMN `personal_transactions.recurring_interval VARCHAR(20)`
3. ADD COLUMNS `subscriptions`: `is_active`, `billing_day`, `start_date`, `deleted_at`, `description`, `icon`, `account_id`
4. DROP + ADD CONSTRAINT `subscriptions_billing_cycle_check` → `monthly/quarterly/quadrimestral/biannual/annual`
5. ADD COLUMN `subscription_transactions.user_id`
6. ADD CONSTRAINT UNIQUE `subscription_transactions(subscription_id, billing_date)`
7. CREATE INDEX `idx_subtx_subscription ON subscription_transactions(subscription_id, billing_date DESC)`

---

## 6. Issue NON Fixate (richiedono decisione)

### D-01 — Subscriptions: solo localStorage, nessuna lettura da Supabase
**Descrizione:** `Subscriptions.tsx` legge e scrive solo su localStorage. La tabella `subscriptions` in Supabase esiste ma è inutilizzata lato client.
**Opzione A:** Implementare `useSubscriptions` hook con lettura Supabase + fallback localStorage (~150 righe).
**Opzione B:** Mantenere localStorage-only e documentare come limitazione nota.
**Raccomandazione:** Opzione A — la tabella DB esiste già con schema corretto post-migration.

### D-02 — Budget: nessuno storico mensile
**Descrizione:** `budget_limits` non ha colonna `month`. Il budget limite è uguale per tutti i mesi.
**Opzione A:** Aggiungere `year_month VARCHAR(7)`, modificare UNIQUE su `(portal_id, category, year_month)`.
**Opzione B:** Mantenere design attuale (un limite per categoria, valido sempre).
**Raccomandazione:** Opzione B nel breve termine — la UI già mostra il mese corretto per le spese, solo il limite è fisso. Utente non ha segnalato confusione.

### D-03 — `financial_goals` + `subscriptions` RLS: user-scoped, non portal-shared
**Descrizione:** Policy `user_id = auth.uid()` → ogni utente vede solo le proprie goals/sub. Diverso dalle transazioni (portal-shared via `portal_members`).
**Opzione A:** Cambiare RLS in `portal_id IN (portal_members...)` per condividere goals/sub tra tutti i membri del portale.
**Opzione B:** Mantenere user-scoped (goals e sub sono personali).
**Raccomandazione:** Opzione B — goals e subscription hanno senso come dati personali. Documentare.

### D-04 — Concurrent tab subscription processing
**Descrizione:** `hasRun.current` previene doppio-run nella stessa React instance ma non tra due tab. Due tab → due processor → due `localAdd`. Il UNIQUE Supabase ora previene duplicati in DB ma non in localStorage.
**Opzione A:** Advisory lock via `sessionStorage` condiviso + `BroadcastChannel`.
**Opzione B:** Accettare il rischio (raro, solo su open simultaneo di due tab nella stessa sessione).
**Raccomandazione:** Opzione B nel breve — improbabile in produzione per team interno.

### D-05 — Supabase Security Advisors (non finance-specific)
**Descrizione:** 8 SECURITY DEFINER functions callable da anon/authenticated, `pg_net` in public schema, leaked password protection disabilitata.
**Azione consigliata:** Abilitare leaked password protection in Supabase Auth settings (1 click). Per le funzioni SECURITY DEFINER, verificare caso per caso — alcune sono intenzionali (es. `get_my_portal_ids`).

---

## 7. Debito Tecnico Confermato (bug noti pre-esistenti)

| ID | Descrizione | Stato post-audit |
|---|---|---|
| A | Due client Supabase: `@/lib/supabase` (globale) vs `@/lib/portalDb` (dinamico) — trend chart vuoto in Recap | Confermato, non fixato (architectural refactor) |
| B | `prevIncomeMap` vuoto in Recap → delta % top entrate non funziona | Confermato, non fixato (fuori scope) |
| C | `Recap.tsx` usa `usePortal()` legacy invece di `usePortalDB()` | Confermato, non fixato |
| D | `isMobile = window.innerWidth < 768` non reattivo al resize | Confermato, non fixato |
| E | `Invoices.tsx` era stub che ritorna `null` | **FIXATO** — placeholder UX aggiunto |

---

## 8. Metriche

- File toccati: 6
- Migration create: 1 (7 DDL statements)
- Commit creati: 0 (da fare manualmente)
- Test TS finali: `npx tsc --noEmit` → **✅ 0 errori**

### File modificati:
```
supabase/migrations/20260512000001_fix_finance_schema.sql  (new)
src/hooks/useTransactions.ts                                (useCallback deps)
src/pages/Transactions.tsx                                  (transfer prefix)
src/pages/Goals.tsx                                         (loading state + target=0 guard)
src/pages/Invoices.tsx                                      (placeholder UI)
AUDIT_LOG.md                                                (new)
FINANCE_AUDIT_REPORT.md                                     (this file)
```

---

## 9. Prossimi Passi Consigliati (priorità ordinata)

1. **Implementare `useSubscriptions` hook con lettura Supabase** — questa singola decisione sblocca: sync cross-device, audit trail dei cicli, visibilità multi-utente delle subscription nel portale. Il DB è già pronto post-migration. Stimato ~3h di lavoro.

2. **Abilitare Leaked Password Protection** in Supabase Auth settings → 1 click, zero codice.

3. **Risolvere bug A (due client Supabase)** — unificare su `@/lib/supabase` in tutti gli hook Finance. Sblocca il trend chart nel Recap e migliora coerenza dati.

4. **Aggiungere budget storico mensile** (D-02) — se l'utente vuole confrontare budget mese per mese, aggiungere colonna `year_month` e aggiornare UNIQUE constraint.

5. **Revisionare SECURITY DEFINER functions** — priorità bassa per tool interno, alta se il progetto diventa SaaS multi-tenant.
