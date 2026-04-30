# SOSA INC — Audit Summary

**Audit date:** 2026-04-30  
**Branch:** `feat/sosa-design-system`  
**Supabase project:** `ndudzfaisulnmbpnvkwo`  
**Auditor:** Claude Sonnet 4.6 (read-only, no DB MCP access)

> NOTE: Supabase MCP tools (list_tables, execute_sql, get_advisors) were denied during this audit run.
> All DB schema findings are inferred from frontend type definitions, service files, and migration filenames.
> Phase 1.4 (live DB query) is marked GAP throughout — a second pass with MCP permissions enabled is required.

---

## Counts

| Category | Count |
|---|---|
| Frontend routes (/:portalId/*) | 28 routed paths + social sub-routes |
| DB tables referenced in code | 40+ (see 02-section-to-table-map.md) |
| Hooks (src/hooks/) | 16 |
| Service files (src/lib/services/) | 13 |
| Portal service files (src/portals/) | 7 |
| Files using usePortal() (legacy) | 32 |
| Files using usePortalDB() (canonical) | 6 |

---

## Top 5 Critical Problems

### CRITICAL-1: dynamicSupabase is NOT a separate client — it is the global client
**File:** `src/lib/portalDb.ts`  
The entire codebase distinction between `@/lib/supabase` (global) and `@/lib/portalDb` (dynamic) is **false**.
`dynamicSupabase` is simply `supabase as unknown as SupabaseClient<any>` — a TypeScript cast, not a separate connection.
This means `useTransactions` and `useFinanceSummary` use the **same underlying Supabase client** but the code,
comments, and documentation treat them as different clients. The documented "two client mismatch" problem is
a misunderstanding: the real problem is both hooks use the same global connection, but `useTransactions` uses
`toPortalUUID()` to convert portal slugs while `useFinanceSummary` also uses `toPortalUUID()`. The divergence
is in `portal.id` source: `usePortal()` vs `usePortalDB()` — not the client.

### CRITICAL-2: social_connections is NOT filtered by portal_id
**Files:** `src/components/social/SocialConnections.tsx`, `src/components/social/ConnectAccountModal.tsx`  
Both query `social_connections` filtered only by `user_id` — **no portal_id filter**.  
If a user belongs to multiple portals, their social connections appear in ALL portals. This is a cross-portal
data leak. INSERT also lacks portal_id, so connections are not portal-scoped at all.

### CRITICAL-3: social_analytics_snapshots has NO portal_id filter
**File:** `src/components/social/SocialAnalyticsDashboard.tsx` (line 168)  
Query filters by `connection_id` only. Since connections already leak cross-portal (see CRITICAL-2),
analytics snapshots also leak cross-portal. No portal_id column or filter used anywhere.

### CRITICAL-4: vault_files DELETE has no portal_id filter
**File:** `src/lib/services/vaultFileService.ts` (line 157)  
`deleteVaultFile()` deletes by `eq("id", id)` alone — any user knowing a vault file UUID can delete it
regardless of portal. This is a HIGH severity write leak. RLS may partially mitigate if policies exist,
but code-level defense is absent.

### CRITICAL-5: taskSync.ts queries tasks/projects without portal_id (conditional only)
**File:** `src/lib/taskSync.ts` (lines 119-143)  
`loadTasksFromSupabase(portalId?)` and `loadProjectsFromSupabase(portalId?)` accept an optional `portalId`.
If called without it (i.e. `portalId = undefined`), they return ALL tasks and ALL projects across ALL portals.
Call sites must always pass portalId — but the function signature makes this easy to forget.

---

## Index of Audit Files

| File | Content |
|---|---|
| `01-portal-isolation-matrix.md` | Per-table portal_id / RLS / index status |
| `02-section-to-table-map.md` | Frontend section → hook → table → client mapping |
| `03-orphans.md` | Tables with no frontend, pages with no DB, unused hooks |
| `04-portal-id-leaks.md` | All manual Supabase queries missing portal_id filter |
| `05-client-mismatch.md` | Supabase client usage per hook/service |
| `06-legacy-usage.md` | usePortal() vs usePortalDB() + localStorage debt |
| `07-rls-audit.md` | RLS policy analysis (GAP — needs MCP DB access) |
| `08-schema-gaps.md` | Frontend vs DB column mismatches |
| `09-action-plan.md` | Ordered action plan HIGH→LOW |
