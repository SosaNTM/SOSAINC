# Schema Changes

Nessuna tabella deve essere creata ex novo — tutte esistono e hanno già `portal_id UUID`. Le modifiche richieste sono solo alle RLS policies.

---

## Situazione attuale (verificata via MCP)

| Tabella | portal_id | RLS abilitata | Problema |
|---|---|---|---|
| `portal_profiles` | ✅ UUID | ✅ | INSERT no WITH CHECK; policy duplicate |
| `appearance_settings` | ✅ UUID | ✅ | INSERT no WITH CHECK; policy duplicate |
| `income_categories` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `expense_categories` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `subscription_categories` | ✅ UUID | ✅ | INSERT no WITH CHECK; policy duplicate |
| `payment_methods` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `recurrence_rules` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `currency_settings` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `tax_rates` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `finance_transaction_categories` | ✅ UUID | ✅ | INSERT no WITH CHECK; policies su role `public` |
| `project_statuses` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `task_priorities` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `task_labels` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `task_templates` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `social_connections` | ✅ UUID | ✅ | RLS intera è user-only (portal_id ignorato) |
| `social_publishing_rules` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `hashtag_sets` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `caption_templates` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `content_categories` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `notification_channels` | ✅ UUID | ✅ | INSERT no WITH CHECK; policy duplicate |
| `alert_rules` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `departments` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `roles` | ✅ UUID | ✅ | INSERT no WITH CHECK |
| `role_permissions` | ✅ UUID | ✅ | INSERT no WITH CHECK |

---

## Migration 1 — Fix INSERT WITH CHECK su tutte le tabelle settings

**Nome:** `fix_settings_rls_insert_with_check`  
**Priorità:** HIGH  
**Rischio:** Basso — aggiunge restrizioni, non le rimuove. Non cambia comportamento dell'app legittima.

```sql
-- ── Template per ogni tabella ──────────────────────────────────────────────
-- Sostituire <TABLE> con il nome tabella, <ROLE> con 'authenticated' o 'public'

drop policy if exists "<TABLE>_portal_insert" on public.<TABLE>;
create policy "<TABLE>_portal_insert"
  on public.<TABLE>
  for insert to <ROLE>
  with check (
    portal_id in (
      select portal_id from public.portal_members
      where user_id = auth.uid()
    )
  );

-- ── Tabelle a cui applicare (authenticated role) ───────────────────────────

do $$ declare tables text[] := array[
  'portal_profiles', 'appearance_settings',
  'income_categories', 'expense_categories', 'subscription_categories',
  'payment_methods', 'recurrence_rules', 'currency_settings', 'tax_rates',
  'project_statuses', 'task_priorities', 'task_labels', 'task_templates',
  'social_publishing_rules', 'hashtag_sets', 'caption_templates', 'content_categories',
  'notification_channels', 'alert_rules',
  'departments', 'roles', 'role_permissions'
]; t text;
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%s_portal_insert" on public.%I', t, t);
    execute format($p$
      create policy "%s_portal_insert" on public.%I
        for insert to authenticated
        with check (
          portal_id in (
            select portal_id from public.portal_members
            where user_id = auth.uid()
          )
        )
    $p$, t, t);
  end loop;
end $$;

-- ── finance_transaction_categories (usa role 'public') ────────────────────
drop policy if exists "ftc_insert" on public.finance_transaction_categories;
create policy "ftc_insert"
  on public.finance_transaction_categories
  for insert to authenticated
  with check (
    portal_id in (
      select portal_id from public.portal_members
      where user_id = auth.uid()
    )
  );
```

**Strategia backfill:** Nessuna necessaria — le righe esistenti non vengono toccate.

---

## Migration 2 — Fix social_connections RLS (portal-scoped)

**Nome:** `fix_social_connections_rls_portal_scoped`  
**Priorità:** HIGH  
**Rischio:** Medio — cambia semantica RLS. Testare che le social connections esistenti abbiano `portal_id` valorizzato, altrimenti diventano invisibili.

```sql
-- Verifica prima: quante rows hanno portal_id null?
-- select count(*) from social_connections where portal_id is null;

-- Drop tutte le policy user-only
drop policy if exists "sc_all" on public.social_connections;
drop policy if exists "users_delete_own_connections" on public.social_connections;
drop policy if exists "users_insert_own_connections" on public.social_connections;
drop policy if exists "users_select_own_connections" on public.social_connections;
drop policy if exists "users_update_own_connections" on public.social_connections;

-- Crea policy portal-scoped
create policy "social_connections_select"
  on public.social_connections for select to authenticated
  using (portal_id in (
    select portal_id from public.portal_members where user_id = auth.uid()
  ));

create policy "social_connections_insert"
  on public.social_connections for insert to authenticated
  with check (portal_id in (
    select portal_id from public.portal_members where user_id = auth.uid()
  ));

create policy "social_connections_update"
  on public.social_connections for update to authenticated
  using (portal_id in (
    select portal_id from public.portal_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ))
  with check (portal_id in (
    select portal_id from public.portal_members where user_id = auth.uid()
  ));

create policy "social_connections_delete"
  on public.social_connections for delete to authenticated
  using (portal_id in (
    select portal_id from public.portal_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));
```

**Strategia backfill:**
```sql
-- Se esistono rows con portal_id null, backfillarle al portale primario dell'utente:
update public.social_connections sc
set portal_id = (
  select pm.portal_id
  from public.portal_members pm
  where pm.user_id = sc.user_id
  order by pm.created_at asc
  limit 1
)
where sc.portal_id is null;
```

---

## Migration 3 — Rimuovi policy duplicate (4 tabelle)

**Nome:** `cleanup_duplicate_settings_rls_policies`  
**Priorità:** MEDIUM  
**Rischio:** Basso — i set nuovi (`*_portal_*`) sono corretti e più specifici. I vecchi usano funzioni helper che potrebbero essere rimosse in futuro.

```sql
-- appearance_settings
drop policy if exists "pa_manage_appearance" on public.appearance_settings;
drop policy if exists "pm_select_appearance" on public.appearance_settings;

-- notification_channels  
drop policy if exists "pa_manage_notif_channels" on public.notification_channels;
drop policy if exists "pm_select_notif_channels" on public.notification_channels;

-- portal_profiles
drop policy if exists "pa_manage_portal_profile" on public.portal_profiles;
drop policy if exists "pm_select_portal_profile" on public.portal_profiles;

-- subscription_categories
drop policy if exists "portal_admins_manage_sub_categories" on public.subscription_categories;
drop policy if exists "portal_members_select_sub_categories" on public.subscription_categories;
```

---

## Migration 4 — Reset Portale RPC

**Nome:** `create_reset_portal_rpc`  
**Priorità:** LOW (dopo implementazione frontend)  
**Vedere:** `06-reset-portal-spec.md` per specifica completa

```sql
create or replace function public.reset_portal_data(p_portal_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Verifica che il chiamante sia owner del portale
  if not exists (
    select 1 from portal_members
    where portal_id = p_portal_id
      and user_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Unauthorized: only portal owner can reset portal data';
  end if;

  -- Cancella dati in ordine (rispettando FK)
  delete from personal_transactions where portal_id = p_portal_id;
  delete from financial_goals where portal_id = p_portal_id;
  delete from inventory_items where portal_id = p_portal_id;
  delete from vault_files where portal_id = p_portal_id;
  delete from cloud_files where portal_id = p_portal_id;
  delete from crypto_holdings where portal_id = p_portal_id;
  delete from subscriptions where portal_id = p_portal_id;
  delete from gift_cards where portal_id = p_portal_id;
  delete from social_connections where portal_id = p_portal_id;
  -- NON cancella: portals, portal_members, portal_profiles, settings (non sono "dati")
end;
$$;

revoke execute on function public.reset_portal_data(uuid) from anon, public;
grant execute on function public.reset_portal_data(uuid) to authenticated;
```
