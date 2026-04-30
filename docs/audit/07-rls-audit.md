# 07 — RLS Audit

> **STATUS: GAP**  
> Supabase MCP tools (`execute_sql`, `list_tables`, `get_advisors`) were denied during this audit.  
> All RLS findings below are **inferred** from code patterns, not verified against live DB policies.  
> A second audit pass with MCP tools enabled is required to complete this section.

---

## What We Know from Code

### Tables with RLS-dependent security (no code-level portal_id filter)

These tables have NO portal_id filter in the frontend DELETE/UPDATE operations.
If RLS policies do not enforce portal isolation, these are exploitable:

| Tabella | Operation | Code file | RLS assumption |
|---|---|---|---|
| `vault_files` | DELETE `.eq("id", id)` | vaultFileService.ts:157 | RLS must enforce ownership — UNKNOWN |
| `inventory_attachments` | DELETE `.eq("id", id)` | vaultFileService.ts:282 | RLS must enforce ownership — UNKNOWN |
| `cloud_files` | UPDATE (soft delete) `.eq("id", id)` | cloudService.ts:128 | RLS must enforce — UNKNOWN |
| `cloud_files` | UPDATE (restore) `.eq("id", id)` | cloudService.ts:142 | RLS must enforce — UNKNOWN |
| `crypto_holdings` | UPDATE `.eq("id", id)` fallback | cryptoService.ts:142 | RLS must enforce — UNKNOWN |
| `tasks` | DELETE `.eq("id", id)` | taskSync.ts:159 | RLS must enforce portal membership — UNKNOWN |
| `social_connections` | DELETE `.eq("id", id)` | SocialConnections.tsx:115 | Only user_id enforced — but no portal isolation |

### Tables where RLS is the ONLY defense against cross-portal reads

| Tabella | Concern |
|---|---|
| `social_connections` | Queried by user_id only. If user is in multiple portals, all connections visible in all portals. RLS cannot fix this without schema change (add portal_id). |
| `social_analytics_snapshots` | Queried by connection_id only. No portal concept at all in the query. |
| `task_comments` | `fetchComments(taskId)` filters by task_id only. Any user who knows a task_id can fetch its comments. RLS on task_comments must verify the user has access to the parent task's portal. |

---

## Expected RLS Policy Structure (from CLAUDE.md conventions)

Based on the access patterns, each portal-scoped table should have:

```sql
-- SELECT: user must be a portal member
CREATE POLICY "portal members can select" ON <table>
FOR SELECT USING (
  portal_id IN (
    SELECT portal_id FROM portal_members WHERE user_id = auth.uid()
  )
);

-- INSERT: portal_id must match user's membership
CREATE POLICY "portal members can insert" ON <table>
FOR INSERT WITH CHECK (
  portal_id IN (
    SELECT portal_id FROM portal_members WHERE user_id = auth.uid()
  )
);

-- UPDATE/DELETE: only the portal member who owns the row
-- (or any portal member for shared data)
```

---

## Tables That Likely LACK RLS (high risk if true)

Based on code calling patterns where the frontend relies entirely on code-level filtering:

1. `social_connections` — No portal_id means RLS cannot enforce portal isolation. Even with user_id-based RLS, cross-portal visibility is architectural.
2. `social_analytics_snapshots` — Queried without portal_id. If RLS only checks user membership in a portal, snapshots from other portals' connections could leak.
3. `crypto_prices` — Global reference table. If RLS is absent or too permissive, all prices are readable by all users (low risk since it's intended to be global).
4. `gift_card_brands` — Global reference table. Same as above.

---

## Security Advisors (GAP)

The following Supabase security advisors should be run with MCP access:
- `get_advisors` with type "security" — identifies tables missing RLS, overly permissive policies
- `get_advisors` with type "performance" — identifies missing indexes on portal_id columns

**Action Required:** Run these queries with MCP access to get live results:

```sql
-- 1. All RLS policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 2. Tables WITHOUT RLS enabled
SELECT relname as table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = c.relname AND schemaname = 'public'
  );

-- 3. portal_id column presence
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'portal_id'
ORDER BY table_name;

-- 4. portal_id indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexdef LIKE '%portal_id%'
ORDER BY tablename;
```

---

## Minimum Required Policies (by severity)

| Priority | Table | Minimum Policy Needed |
|---|---|---|
| CRITICAL | `social_connections` | Schema change required (add portal_id) before RLS can enforce portal isolation |
| HIGH | `vault_files` | DELETE policy must check portal_id |
| HIGH | `inventory_attachments` | DELETE policy must check portal_id |
| HIGH | `cloud_files` | UPDATE (soft delete, restore) policy must check portal_id |
| HIGH | `tasks` (via taskSync) | DELETE policy must check portal membership |
| MEDIUM | `vault_items` | recordVaultAccess UPDATE needs portal_id in code |
| MEDIUM | `subscriptions` | UPDATE in subscriptionProcessor needs portal_id filter |
| MEDIUM | `task_comments` | fetchComments needs portal membership verification |
