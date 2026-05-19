# Leaks — Settings Cross-Portale

Dati verificati via: Supabase MCP `pg_policies` + lettura source code.

---

## LEAK-01 — INSERT senza WITH CHECK su tutte le tabelle

**Severity:** HIGH  
**Tabelle coinvolte:** Tutte e 20 le tabelle settings (vedere `01-settings-inventory.md`)  
**File:** Database RLS policies  

**Problema:**  
Ogni tabella settings ha policy INSERT con `qual = null` — in PostgreSQL questo significa che la `WITH CHECK` clause è assente. Un utente autenticato può quindi fare una INSERT con qualsiasi `portal_id`, anche un portale di cui non è membro.

Esempio policy incriminata:
```sql
-- Attuale (INSICURO)
create policy "income_categories_portal_insert"
  on public.income_categories
  for insert to authenticated
  with check (true);  -- equivalente a null/mancante
```

**Impatto reale:**  
- Il frontend non lo fa intenzionalmente (i hook passano sempre `currentPortalId`)
- Un utente malintenzionato con un client Supabase diretto potrebbe iniettare dati in un portale altrui
- RLS SELECT impedisce di leggere i dati iniettati, ma non la scrittura

**Fix:**
```sql
-- Per ogni tabella: drop la policy esistente e ricreala con WITH CHECK
drop policy "income_categories_portal_insert" on public.income_categories;
create policy "income_categories_portal_insert"
  on public.income_categories
  for insert to authenticated
  with check (
    portal_id in (
      select portal_id from public.portal_members
      where user_id = auth.uid()
    )
  );
```

---

## LEAK-02 — social_connections RLS ignora portal_id

**Severity:** HIGH  
**Tabella:** `social_connections`  
**File:** `src/hooks/settings/index.ts:29`, `src/components/social/SocialConnections.tsx`  

**Problema:**  
La tabella `social_connections` ha la colonna `portal_id UUID` (confermato dal DB), ma le sue RLS policy usano solo `user_id = auth.uid()`:

```
Policy: sc_all         — USING(user_id = auth.uid())
Policy: users_select_* — USING(auth.uid() = user_id)
Policy: users_insert_* — no check
Policy: users_delete_* — USING(auth.uid() = user_id)
Policy: users_update_* — USING(auth.uid() = user_id)
```

**Impatto:**  
1. **Al livello DB**: un utente autenticato può leggere TUTTE le proprie social connections indipendentemente dal portale tramite query diretta
2. **Al livello app**: `usePortalData("social_connections")` aggiunge `.eq("portal_id", currentPortalId)` — quindi l'isolamento funziona nell'app, ma NON è garantito dal DB
3. **Conseguenza pratica**: se una social connection viene aggiunta su Portale A, non appare su Portale B (grazie al filtro app), ma il DB non lo impone — un API client diretto bypassa la protezione

**Fix:**
```sql
-- Drop tutte le policy user-only
drop policy if exists "sc_all" on public.social_connections;
drop policy if exists "users_delete_own_connections" on public.social_connections;
drop policy if exists "users_insert_own_connections" on public.social_connections;
drop policy if exists "users_select_own_connections" on public.social_connections;
drop policy if exists "users_update_own_connections" on public.social_connections;

-- Crea policy portal-scoped
create policy "social_connections_select" on public.social_connections
  for select to authenticated
  using (portal_id in (select portal_id from portal_members where user_id = auth.uid()));

create policy "social_connections_insert" on public.social_connections
  for insert to authenticated
  with check (portal_id in (select portal_id from portal_members where user_id = auth.uid()));

create policy "social_connections_update" on public.social_connections
  for update to authenticated
  using (portal_id in (select portal_id from portal_members where user_id = auth.uid() and role in ('owner','admin')));

create policy "social_connections_delete" on public.social_connections
  for delete to authenticated
  using (portal_id in (select portal_id from portal_members where user_id = auth.uid() and role in ('owner','admin')));
```

---

## LEAK-03 — useFinanceCategories usa usePortal() (legacy)

**Severity:** MEDIUM  
**File:** `src/hooks/useFinanceCategories.ts` (riga 1-20 circa)  

**Problema:**  
`useFinanceCategories.ts` usa `usePortal()` da `@/lib/portalContext` (legacy) invece di `usePortalDB()` da `@/lib/portalContextDB`. Converte poi il portal slug in UUID con `toPortalUUID(portalId)`.

`usePortal()` e `usePortalDB()` DOVREBBERO essere sincronizzati, ma sono due context separati. Se per qualsiasi motivo divergessero (race condition al mount, bug futuro), questo hook leggerebbe dal portale sbagliato.

**Fix:**
Migrare `useFinanceCategories.ts` a `usePortalDB()`:
```ts
// Prima:
const { portal } = usePortal();
const portalId = portal?.id ?? "sosa";
// ... .eq("portal_id", toPortalUUID(portalId))

// Dopo:
const { currentPortalId } = usePortalDB();
// ... .eq("portal_id", currentPortalId)
```

---

## LEAK-04 — Policy duplicate su 4 tabelle (confusione semantica)

**Severity:** MEDIUM  
**Tabelle:** `appearance_settings`, `notification_channels`, `portal_profiles`, `subscription_categories`  

**Problema:**  
Queste tabelle hanno due set di policy PERMISSIVE contemporaneamente:

1. **Set nuovo** (`*_portal_*`): usa `portal_id IN (SELECT FROM portal_members WHERE user_id = auth.uid())`
2. **Set vecchio** (`pa_manage_*` / `pm_select_*`): usa funzioni helper `get_my_admin_portal_ids()` / `get_my_portal_ids()`

Essendo tutte PERMISSIVE, in Postgres il risultato di una query è `OR` di tutte le policy applicabili. Questo significa che se una policy è più permissiva (es. lascia passare più righe), quella vince.

**Rischio concreto:**  
Se `get_my_portal_ids()` o `get_my_admin_portal_ids()` hanno una definizione più larga del subquery su `portal_members`, potrebbero permettere accesso cross-portale su quelle 4 tabelle.

**Fix:** Verificare le funzioni helper, poi droppare il set vecchio.

---

## LEAK-05 — UPDATE non verifica immutabilità di portal_id

**Severity:** MEDIUM  
**Tabelle:** Tutte le tabelle settings  

**Problema:**  
Le policy UPDATE verificano `portal_id` nella `USING` clause (quale righe si possono aggiornare), ma non nella `WITH CHECK` clause (a quale valore). Un UPDATE che cambia il `portal_id` di una riga non verrebbe bloccato a livello DB (solo a livello app, che non espone mai questa possibilità).

**Fix:**
```sql
-- Aggiungere WITH CHECK a ogni UPDATE policy
create policy "income_categories_portal_update"
  on public.income_categories for update to authenticated
  using (portal_id in (select portal_id from portal_members where user_id = auth.uid() and role in ('owner','admin')))
  with check (portal_id in (select portal_id from portal_members where user_id = auth.uid()));
```

---

## LEAK-06 — Cache localStorage singleton: nessuna invalidazione esplicita su switch portale

**Severity:** LOW  
**File:** `src/hooks/settings/index.ts` (`useSingleton`, riga 41-100)  

**Problema:**  
I singleton usano chiave `swr_single_${table}_${currentPortalId}`. Questo è corretto — portalId diversi → chiavi diverse → nessun leak di dati.

**Issue minore:** La cache di un portale visitato in precedenza rimane in localStorage indefinitamente. Non causa leak (la chiave è scoped), ma accumula storage nel browser dell'utente.

**Fix (bassa priorità):** Aggiungere TTL alle entry singleton o pulire le chiavi di portali non visitati di recente.

---

## LEAK-07 — DangerZone.tsx non implementato

**Severity:** INFO  
**File:** `src/pages/settings/DangerZone.tsx`  

**Problema:**  
La voce "Zona Pericolosa" / "Reset Portale" è presente nella sidebar settings (vedi screenshot) ma il componente `DangerZone.tsx` non implementa ancora la logica di reset. Senza una RPC atomica lato server, un'implementazione naïve potrebbe cancellare dati parzialmente o, peggio, dati del portale sbagliato.

**Fix:** Implementare secondo `06-reset-portal-spec.md`.
