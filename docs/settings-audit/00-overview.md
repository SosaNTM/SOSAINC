# Settings Audit — Overview

**Branch:** `feat/sosa-design-system`  
**Date:** 2026-05-01  
**Supabase project:** `ndudzfaisulnmbpnvkwo`  
**Scope:** Full per-portal isolation audit of the Settings section.

---

## Obiettivo

Garantire che ogni portale (REDX, KEYLO, TRUST ME, SOSA) abbia i propri settings completamente isolati. Un utente del Portale A non deve mai leggere, modificare o cancellare dati del Portale B.

---

## Indice file

| File | Contenuto |
|---|---|
| `00-overview.md` | Questo file — scope, indice, criteri done |
| `01-settings-inventory.md` | Inventario completo ogni voce settings: hook, tabella, RLS, stato |
| `02-leaks.md` | Lista leak cross-portale trovati con severity e fix |
| `03-schema-changes.md` | Migration SQL per ogni tabella che necessita modifiche |
| `04-portal-profile-spec.md` | Spec completa del Profilo Portale (già implementato, documentato) |
| `05-implementation-plan.md` | Roadmap step-by-step committabile |
| `06-reset-portal-spec.md` | Spec completa "Reset Portale" (Zona Pericolosa) |
| `07-testing-matrix.md` | Checklist QA cross-portale per ogni voce settings |

---

## Criteri di Done

- [ ] Ogni tabella settings ha `portal_id uuid not null` con FK su `portals(id)`
- [ ] RLS SELECT filtra `portal_id IN (portal_members WHERE user_id = auth.uid())`
- [ ] RLS INSERT ha `WITH CHECK (portal_id IN (portal_members WHERE user_id = auth.uid()))`
- [ ] RLS UPDATE/DELETE ristretti a owner/admin dove appropriato
- [ ] Nessun hook legge da Supabase senza `.eq("portal_id", currentPortalId)`
- [ ] `usePortal()` (legacy) non usato in nessun hook settings — solo `usePortalDB()`
- [ ] Switch rapido portale → UI riflette settings corretti (nessun leak da cache LS)
- [ ] Reset Portale cancella solo i dati del portale corrente, non gli altri
- [ ] `npx tsc --noEmit` passa senza errori dopo ogni modifica

---

## Summary Findings

| Severity | Count | Items |
|---|---|---|
| HIGH | 2 | INSERT senza WITH CHECK (tutte le tabelle); social_connections RLS user-only |
| MEDIUM | 3 | Duplicate policies (4 tabelle); useFinanceCategories usa usePortal() legacy; UPDATE non verifica portal_id immutable |
| LOW | 1 | Cache LS singleton non invalidata esplicitamente su switch portale |
| INFO | 1 | DangerZone non ancora implementata |
