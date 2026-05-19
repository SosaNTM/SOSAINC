# SOSA INC — Audit Forense Completo

**Data audit:** 2026-05-19
**Branch:** `feat/sosa-design-system`
**Supabase project:** `ndudzfaisulnmbpnvkwo`
**Metodo:** Read-only. Accesso live DB via Supabase MCP. Nessuna modifica al codice.

> Questo audit sovrascrive il precedente (2026-04-30) che aveva accesso DB limitato.
> Tutti i dati DB sono verificati live (75 tabelle, security advisor, performance advisor).

---

## Valutazione complessiva: NON pronto per produzione

Base tecnica solida ma 4 problemi critici bloccanti (perdita dati, buchi di sicurezza).

---

## Problemi CRITICI (bloccanti per deploy)

### 🔴 C1 — Transazioni non persistite (perdita dati)
`NewTransactionModal` + `Transactions page` scrivono in uno store in-memory che si azzera ad ogni refresh.
Le transazioni aggiunte qui non appaiono mai in Recap, Budget o Dashboard.
**File:** `src/lib/transactionStore.ts`, `src/components/NewTransactionModal.tsx`

### 🔴 C2 — RLS USING(true) su 6 tabelle leadgen
Qualsiasi utente autenticato può leggere lead, pipeline e attività CRM di tutti i portali del sistema.
**Fix:** Migration SQL con policy `portal_id IN (SELECT portal_id FROM portal_members WHERE user_id = auth.uid())`

### 🔴 C3 — Funzioni DB eseguibili senza autenticazione
2+ funzioni SECURITY DEFINER callable da ruolo `anon`. Potenziale accesso dati privilegiato senza JWT.
**Fix:** `REVOKE EXECUTE ON FUNCTION ... FROM anon;`

### 🔴 C4 — Password vault/cloud hashate con SHA-256 (insicuro)
SHA-256 client-side senza salt — vulnerabile a rainbow table attacks.
**Fix:** Sostituire con bcrypt/argon2 server-side via Edge Function.

---

## Problemi MAGGIORI (prima degli utenti beta)

| ID | Descrizione | File |
|---|---|---|
| M1 | `PersonalTransaction` manca `portal_id` nel tipo TypeScript | `types/finance.ts:19` |
| M2 | Doppia interfaccia `FinanceCategory` con `type` incompatibile | `types/finance.ts:40` / `financeCategoryStore.ts:7` |
| M3 | Aggregazioni troncate silenziosamente a 2000 tx | `hooks/useTransactions.ts` |
| M4 | `compareOn=false` mostra "→ 0%" invece di "—" | `Recap.tsx:437` |
| M5 | Colori categorie custom DB non mostrati in Recap | `Recap.tsx:466-469` |

---

## Problemi MINORI (iterazione post-beta)

`isMobile` non reattivo · Timezone bug nel range "oggi" · `kpiDelta.net` sempre undefined ·
p95 heatmap errato per dataset < 21 · `CATEGORY_UPDATE_EVENT` hardcoded per "sosa" ·
`usePortal()` legacy in 32+ file · `lib/portalDb.ts` documentato ma non esiste ·
Doppio firing realtime DOM + Supabase · `isBusinessPortal` accoppiato al nome "sosa" ·
`prefers-reduced-motion` ignorato da Framer Motion · Indici FK mancanti

---

## Piano priorità

**Sprint 1 (critico):** Fix C1 (transazioni Supabase) → Fix C2 (RLS leadgen) → Fix C3 (anon revoke) → Fix C4 (bcrypt)
**Sprint 2 (beta):** M1 portal_id nel tipo → M2 unifica FinanceCategory → M3 RPC aggregation → M4-M5 Recap fixes
**Sprint 3 (qualità):** Tutti i minori + indici FK + prefers-reduced-motion

---

## Struttura file audit (versione corrente 2026-05-19)

| File | Contenuto |
|---|---|
| `01-supabase-schema.md` | 75 tabelle, security advisor, estensioni, performance advisor |
| `02-typescript-types.md` | Discrepanze tipi TypeScript vs schema DB |
| `03-data-flow.md` | Due sistemi transaction, portalDb fantasma, categorie |
| `04-math-formulas.md` | Tutte le formule con bug identificati |
| `05-portal-isolation.md` | RLS, portal_id, tabelle non isolate |
| `06-realtime.md` | Architettura broadcast, doppio firing, Postgres Changes |
| `07-edge-cases.md` | isMobile, timezone, heatmap, SHA-256 password |
| `08-performance.md` | Limite 2000tx, aggregazioni JS, FK indexes, fetch paralleli |
| `09-business-logic.md` | Due sistemi transaction, categorie duplicate, business vs personal |
| `10-auth-rbac.md` | Auth, RBAC, lock screen, anon functions |

*File precedenti (2026-04-30):* `01-portal-isolation-matrix.md`, `02-section-to-table-map.md`, `03-orphans.md`, `04-portal-id-leaks.md`, `05-client-mismatch.md`, `06-legacy-usage.md`, `07-rls-audit.md`, `08-schema-gaps.md`, `09-action-plan.md`
