# Implementation Plan — Settings Per-Portale

---

## Ordine di Esecuzione

```
Step 1 → Fix RLS INSERT WITH CHECK (tutte le tabelle)        [HIGH, basso rischio]
Step 2 → Fix social_connections RLS portal-scoped            [HIGH, rischio medio]
Step 3 → Rimuovi policy duplicate (4 tabelle)                [MEDIUM, basso rischio]
Step 4 → Migra useFinanceCategories a usePortalDB()          [MEDIUM, codice]
Step 5 → Implementa DangerZone / Reset Portale               [LOW, richiede OK]
Step 6 → QA cross-portale                                    [Verifica finale]
```

---

## Step 1 — Fix RLS INSERT WITH CHECK

**Tipo:** DB Migration  
**Files toccati:** Solo Supabase (MCP `apply_migration`)  
**Rischio:** Basso — aggiunge restrizioni, non le rimuove  
**Rollback:** Re-droppare la policy e ricrearla senza WITH CHECK  

**SQL:** Vedere `03-schema-changes.md` → Migration 1

**Come testare:**
1. Con client Supabase diretto (anon key + JWT valido), tentare INSERT su `income_categories` con `portal_id` di un portale di cui l'utente NON è membro
2. Deve ricevere errore `new row violates row-level security policy`
3. Con `portal_id` corretto, deve funzionare

**Commit:** `fix(db): add WITH CHECK to all settings table INSERT policies`

---

## Step 2 — Fix social_connections RLS

**Tipo:** DB Migration  
**Files toccati:** Solo Supabase  
**Rischio:** MEDIO — cambia comportamento RLS esistente  

**Pre-requisito:** Verificare che tutte le `social_connections` esistenti abbiano `portal_id` valorizzato:
```sql
select count(*) from social_connections where portal_id is null;
```
Se > 0, eseguire backfill (vedere `03-schema-changes.md` → Migration 2).

**SQL:** Vedere `03-schema-changes.md` → Migration 2

**Come testare:**
1. Creare una social connection nel Portale A
2. Switchiare al Portale B — NON deve apparire
3. Query diretta: `select * from social_connections where user_id = auth.uid()` — deve restituire solo connections del portale corrente (o errore RLS se non si ha accesso)

**Commit:** `fix(db): make social_connections portal-scoped via RLS`

---

## Step 3 — Rimuovi policy duplicate

**Tipo:** DB Migration  
**Files toccati:** Solo Supabase  
**Rischio:** Basso — i set nuovi sono corretti e completi  

**Pre-requisito:** Verificare che `get_my_admin_portal_ids()` e `get_my_portal_ids()` abbiano semantica uguale o più restrittiva del subquery su `portal_members`. Se più permissiva, i vecchi set potrebbero stare attualmente permettendo più accessi.

**SQL:** Vedere `03-schema-changes.md` → Migration 3

**Come testare:**
1. Leggere `appearance_settings` da un portale di cui si è membro → OK
2. Leggere `appearance_settings` da un portale di cui NON si è membro → errore

**Commit:** `fix(db): remove duplicate legacy RLS policies from 4 settings tables`

---

## Step 4 — Migra useFinanceCategories a usePortalDB()

**Tipo:** Codice TypeScript  
**File:** `src/hooks/useFinanceCategories.ts`  

**Modifica:**
```ts
// Rimuovere:
import { usePortal } from "@/lib/portalContext";
import { toPortalUUID } from "@/lib/portalUUID";
// ...
const { portal } = usePortal();
const portalId = portal?.id ?? "sosa";
// ...
.eq("portal_id", toPortalUUID(portalId))

// Aggiungere:
import { usePortalDB } from "@/lib/portalContextDB";
// ...
const { currentPortalId } = usePortalDB();
// ...
.eq("portal_id", currentPortalId)
```

**Gating:** Aggiungere `if (!currentPortalId) return;` prima di ogni query Supabase.

**Post-modifica:** `npx tsc --noEmit`

**Come testare:**
1. Aprire `Settings > Categorie Transazioni`
2. Verificare che le categorie del portale corrente appaiano
3. Switchiare portale → verificare che appaiano le categorie del nuovo portale

**Commit:** `refactor(hooks): migrate useFinanceCategories to usePortalDB()`

---

## Step 5 — Implementa DangerZone / Reset Portale

**Tipo:** Codice + DB Migration  
**Files toccati:**
- `src/pages/settings/DangerZone.tsx` (implementazione UI)
- Supabase: migration `create_reset_portal_rpc`

**Prerequisiti:**
- Step 1-4 completati
- OK esplicito dall'utente (operazione pericolosa)
- Vedere `06-reset-portal-spec.md` per specifica completa

**Commit:** `feat(settings): implement Reset Portale with double confirmation`

---

## Step 6 — QA Cross-Portale

Eseguire la matrice in `07-testing-matrix.md`. Requisito: zero leak su ogni voce.

---

## Rischi Globali

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| social_connections con portal_id null → dati invisibili dopo Migration 2 | Medio | Alto | Eseguire backfill prima di cambiare RLS |
| Policy duplicate in conflict → accesso inatteso rotto | Basso | Medio | Verificare semantica get_my_* prima di droppare |
| useFinanceCategories refactor → regression su TransactionCategories | Basso | Basso | Test manuale dopo refactor |
| Reset Portale cancella dati sbagliati | Alto se buggy | Critico | RPC server-side con owner check + double confirm |
