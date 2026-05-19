# Reset Portale — Spec Completa

---

## Scopo

Consentire al solo **owner** del portale di cancellare tutti i dati operativi del portale mantenendo intatta la struttura (account, membership, settings di configurazione). Utile per reset post-test o onboarding.

---

## Cosa cancella vs cosa preserva

### CANCELLA (dati operativi)

| Tabella | Motivo |
|---|---|
| `personal_transactions` | Transazioni finanziarie |
| `financial_goals` | Obiettivi finanziari |
| `subscriptions` | Abbonamenti tracciati |
| `inventory_items` | Inventario |
| `inventory_attachments` | Allegati inventario |
| `vault_files` | File vault |
| `cloud_files` | File cloud storage |
| `cloud_folders` | Cartelle cloud |
| `crypto_holdings` | Portafoglio crypto |
| `gift_cards` | Gift card |
| `gift_card_transactions` | Transazioni gift card |
| `social_connections` | Account social collegati |
| `social_analytics_snapshots` | Snapshot analytics |
| `audit_log` | Log audit (solo di questo portale) |

### PRESERVA (configurazione e struttura)

| Tabella | Motivo |
|---|---|
| `portals` | Il portale stesso |
| `portal_members` | Membership e ruoli |
| `portal_profiles` | Profilo legale del portale |
| `appearance_settings` | Tema e colori |
| `currency_settings` | Valuta e tasse |
| `income_categories` | Categorie entrate |
| `expense_categories` | Categorie uscite |
| `subscription_categories` | Categorie abbonamenti |
| `payment_methods` | Metodi pagamento |
| `recurrence_rules` | Regole ricorrenza |
| `finance_transaction_categories` | Categorie transazioni |
| `project_statuses` | Stati progetto |
| `task_priorities` | Priorità task |
| `task_labels` | Label task |
| `task_templates` | Template task |
| `social_publishing_rules` | Regole pubblicazione |
| `hashtag_sets` | Set hashtag |
| `caption_templates` | Template caption |
| `content_categories` | Categorie contenuti |
| `notification_channels` | Canali notifica |
| `alert_rules` | Regole avviso |
| `departments` | Reparti |
| `roles` / `role_permissions` | Ruoli e permessi |

---

## Flusso UI

```
1. User clicca "Reset Portale" in Zona Pericolosa
2. Modale di prima conferma:
   "Questa azione è irreversibile. Verranno cancellati tutti i dati operativi 
   del portale [NOME]. La configurazione (categorie, settings) verrà preservata."
   [Annulla] [Continua →]

3. Seconda conferma — digitare nome portale:
   "Digita il nome del portale per confermare:"
   [input text]
   [Annulla] [Elimina tutti i dati]  ← rosso, abilitato solo se nome corretto

4. Loading state: "Eliminazione in corso..."

5. Success: toast "Portale resettato. Tutti i dati operativi eliminati."
   + Redirect a /dashboard (che mostrerà stato vuoto)

6. Error: toast "Errore durante il reset. Nessun dato eliminato." 
   (la RPC è transazionale — o tutto o niente)
```

---

## Implementazione Backend

**RPC Supabase** (vedere `03-schema-changes.md` → Migration 4):

```sql
create or replace function public.reset_portal_data(p_portal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_counts jsonb := '{}';
  n int;
begin
  -- Auth check: solo owner
  if not exists (
    select 1 from portal_members
    where portal_id = p_portal_id
      and user_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Unauthorized: solo il proprietario del portale può eseguire il reset';
  end if;

  -- Cancella in ordine FK-safe
  delete from gift_card_transactions    where gift_card_id in (select id from gift_cards where portal_id = p_portal_id);
  delete from gift_cards                where portal_id = p_portal_id; get diagnostics n = row_count; deleted_counts := deleted_counts || jsonb_build_object('gift_cards', n);
  delete from inventory_attachments     where inventory_item_id in (select id from inventory_items where portal_id = p_portal_id);
  delete from inventory_items           where portal_id = p_portal_id; get diagnostics n = row_count; deleted_counts := deleted_counts || jsonb_build_object('inventory_items', n);
  delete from personal_transactions     where portal_id = p_portal_id; get diagnostics n = row_count; deleted_counts := deleted_counts || jsonb_build_object('personal_transactions', n);
  delete from financial_goals           where portal_id = p_portal_id;
  delete from subscriptions             where portal_id = p_portal_id;
  delete from cloud_files               where portal_id = p_portal_id;
  delete from cloud_folders             where portal_id = p_portal_id;
  delete from crypto_holdings           where portal_id = p_portal_id;
  delete from vault_files               where portal_id = p_portal_id;
  delete from social_analytics_snapshots where portal_id = p_portal_id;
  delete from social_connections        where portal_id = p_portal_id;
  delete from audit_log                 where portal_id = p_portal_id;

  return jsonb_build_object('success', true, 'deleted', deleted_counts);
end;
$$;
```

**Chiamata dal frontend:**
```ts
const { data, error } = await supabase.rpc("reset_portal_data", {
  p_portal_id: currentPortalId
});
if (error) throw error;
```

---

## Implementazione Frontend

**File:** `src/pages/settings/DangerZone.tsx`

**Hook necessari:**
```ts
const { currentPortalId, isOwner } = usePortalDB();
const { portal } = usePortalDB(); // per nome portale nella confirm
```

**Guards:**
- Componente non renderizzato se `!isOwner`
- Bottone "Reset Portale" disabled se `!currentPortalId`
- Seconda conferma: bottone abilitato solo se `inputValue === portal.name`

**Post-reset:**
1. Invalidare cache localStorage per questo portale
2. `toast.success(...)`
3. `navigate(\`/${portal.slug}/dashboard\`)` — dashboard vuota

---

## Audit Log

Prima di eseguire il reset, registrare in audit_log:
```ts
addAuditEntry({
  userId: user.id,
  action: `Reset completo dati portale ${portal.name}`,
  category: "danger",
  details: `Eliminati: transazioni, inventario, vault, crypto, gift cards, social`,
  icon: "⚠",
  portalId: currentPortalId,
});
```
Nota: l'audit entry verrà poi cancellata dal reset stesso se `audit_log` è nella lista delle tabelle da resettare. Considerare di scrivere prima su un log esterno o di escludere audit_log dal reset.
