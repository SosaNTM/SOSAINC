# 04 — Portal ID Leaks

All manual Supabase queries that do NOT chain `.eq("portal_id", ...)` on tables that contain portal-scoped data.

Severity:
- **HIGH** — reads or deletes data across portals (active cross-portal data access)
- **MEDIUM** — writes or updates without constraint (may corrupt cross-portal data)
- **LOW** — optional filter (function parameter makes it conditional, not guaranteed)

---

## HIGH Severity — Cross-Portal Data Access

### LEAK-01: social_connections — no portal_id on SELECT
**File:** `src/components/social/SocialConnections.tsx`  
**Lines:** 93–97  
```ts
const { data, error } = await supabase
  .from("social_connections")
  .select("*")
  .eq("user_id", user.id)        // only user_id filter
  .order("connected_at", { ascending: false });
```
**Problem:** A user's social connections are visible from every portal they belong to. If a user is a member of KEYLO and SOSA, both portals show the same social accounts.  
**Suggested fix:** Add `portal_id` column to `social_connections` and filter by `currentPortalId`. INSERT must also include portal_id.  
**Effort:** M

---

### LEAK-02: social_connections — no portal_id on INSERT
**File:** `src/components/social/ConnectAccountModal.tsx`  
**Lines:** 43–52  
```ts
const { data, error } = await supabase
  .from("social_connections")
  .insert({
    user_id: user.id,
    platform,
    account_handle: ...,
    account_name: ...,
    is_active: true,
    // NO portal_id
  })
```
**Problem:** Connected social accounts are not portal-scoped. Any portal this user visits will see these connections.  
**Suggested fix:** Pass `portal_id: currentPortalId` in the insert payload. Requires portal_id column in table.  
**Effort:** S (after LEAK-01 schema fix)

---

### LEAK-03: social_analytics_snapshots — no portal_id filter
**File:** `src/components/social/SocialAnalyticsDashboard.tsx`  
**Lines:** 166–174  
```ts
const { data, error } = await supabase
  .from("social_analytics_snapshots")
  .select("*")
  .eq("connection_id", conn.id)   // only connection_id
  .order("snapshot_date", { ascending: true });
```
**Problem:** Snapshots are scoped only to a connection. Since connections are not portal-scoped (LEAK-01), this query may return analytics data intended for a different portal's social context.  
**Suggested fix:** Add portal_id to snapshots table and filter by it. But fix LEAK-01 first.  
**Effort:** M (depends on LEAK-01)

---

### LEAK-04: vault_files DELETE — no portal_id
**File:** `src/lib/services/vaultFileService.ts`  
**Line:** 157  
```ts
await supabase.from("vault_files").delete().eq("id", vaultFile.id);
```
**Problem:** Any authenticated user who knows a vault file UUID can delete it — no portal ownership check in the query. RLS policies are the only guardrail (which we cannot verify without DB access).  
**Suggested fix:** Add `.eq("portal_id", portalId)` to the delete query. The `vaultFile.portal_id` field is already available on the object.  
**Effort:** S

---

### LEAK-05: inventory_attachments DELETE — no portal_id
**File:** `src/lib/services/vaultFileService.ts`  
**Line:** 282  
```ts
await supabase.from("inventory_attachments").delete().eq("id", att.id);
```
**Problem:** Same as LEAK-04 for inventory attachments.  
**Suggested fix:** Add `.eq("portal_id", att.portal_id)`.  
**Effort:** S

---

### LEAK-06: cloud_files softDeleteFile — no portal_id
**File:** `src/lib/services/cloudService.ts`  
**Lines:** 124–133  
```ts
export async function softDeleteFile(id: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("cloud_files")
    .update({ is_deleted: true, deleted_at: ..., deleted_by: userId, permanent_delete_at: ... })
    .eq("id", id);     // only id — no portal_id
```
**Problem:** Any user who knows a cloud file UUID can soft-delete it across portals.  
**Suggested fix:** Add `portalId` param and `.eq("portal_id", toPortalUUID(portalId))`.  
**Effort:** S

---

### LEAK-07: cloud_files restoreFile — no portal_id
**File:** `src/lib/services/cloudService.ts`  
**Lines:** 141–147  
```ts
export async function restoreFile(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("cloud_files")
    .update({ is_deleted: false, deleted_at: null, ... })
    .eq("id", id);     // no portal_id
```
**Suggested fix:** Same as LEAK-06.  
**Effort:** S

---

### LEAK-08: taskSync.deleteTask — no portal_id
**File:** `src/lib/taskSync.ts`  
**Lines:** 158–166  
```ts
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
```
**Problem:** Any authenticated user can delete any task by UUID.  
**Suggested fix:** Add `portalId` parameter and chain `.eq("portal_id", toPortalUUID(portalId))`.  
**Effort:** S

---

## MEDIUM Severity — Writes Without Portal Constraint

### LEAK-09: crypto_holdings updateHolding fallback — no portal_id
**File:** `src/portals/finance/services/cryptoService.ts`  
**Lines:** 139–145  
```ts
// "Try without portal_id filter (covers RLS edge cases)"
const { error: err2 } = await supabase
  .from("crypto_holdings")
  .update({ ...updates, updated_at: now })
  .eq("id", id);    // no portal_id — intentional fallback but dangerous
```
**Problem:** The comment says this covers "RLS edge cases" but in practice it updates any holding with a matching UUID regardless of portal.  
**Suggested fix:** Remove this fallback. If the portal_id-filtered update fails, surface the error to the user rather than silently updating without constraint.  
**Effort:** S

---

### LEAK-10: subscriptions update in subscriptionProcessor — no portal_id
**File:** `src/portals/finance/services/subscriptionProcessor.ts`  
**Lines:** 134–140  
```ts
await supabase
  .from("subscriptions")
  .update({ next_billing_date: ..., updated_at: ... })
  .eq("id", current.id);   // no portal_id
```
**Problem:** The subscription's next_billing_date can be updated across any portal.  
**Suggested fix:** Filter by `.eq("portal_id", toPortalUUID(portalId))` — portalId is already a parameter.  
**Effort:** S

---

### LEAK-11: subscription_transactions INSERT — uses raw portalId string
**File:** `src/portals/finance/services/subscriptionProcessor.ts`  
**Line:** 102  
```ts
await supabase.from("subscription_transactions").insert({
  subscription_id: current.id,
  user_id: userId,
  portal_id: portalId,   // raw string, not toPortalUUID()
  ...
});
```
**Problem:** Other tables use `toPortalUUID(portalId)` to convert slug→UUID. This uses raw slug. If portal_id column expects UUID, inserts will fail silently (caught by try/catch).  
**Suggested fix:** Use `portal_id: toPortalUUID(portalId)`.  
**Effort:** S

---

### LEAK-12: vault_item_history UPDATE in recordVaultAccess — no portal_id
**File:** `src/lib/services/vaultService.ts`  
**Lines:** 107–117  
```ts
export async function recordVaultAccess(id: string, portalId: string): Promise<void> {
  const { error } = await supabase
    .from("vault_items")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", id);    // no portal_id despite portalId being available
```
**Problem:** Update touches vault_items without portal_id filter.  
**Suggested fix:** Chain `.eq("portal_id", toPortalUUID(portalId))`.  
**Effort:** S

---

## LOW Severity — Optional portal_id (Callers May Omit)

The following functions accept an **optional** `portalId?: string` parameter and only add the portal_id filter when provided. If any call site omits the parameter, the query is unscoped.

| Function | File | Line | Table | Risk |
|---|---|---|---|---|
| `deleteProject(id, portalId?)` | `tasksService.ts` | 44 | projects | LOW — callers in TasksPage appear to pass portalId |
| `deleteTask(id, portalId?)` | `tasksService.ts` | 97 | tasks | LOW — but taskSync.deleteTask never passes it |
| `deleteComment(id, portalId?)` | `tasksService.ts` | 141 | task_comments | LOW |
| `updateNoteFolder(id, updates, portalId?)` | `notesService.ts` | 44 | note_folders | LOW |
| `deleteNoteFolder(id, portalId?)` | `notesService.ts` | 63 | note_folders | LOW |
| `updateNote(id, updates, portalId?)` | `notesService.ts` | 131 | notes | LOW |
| `deleteNote(id, portalId?)` | `notesService.ts` | 150 | notes | LOW |
| `updatePost(id, updates, portalId?)` | `socialPostsService.ts` | 57 | social_posts | LOW |
| `deletePost(id, portalId?)` | `socialPostsService.ts` | 72 | social_posts | LOW |
| `publishPost(id, portalId?)` | `socialPostsService.ts` | 83 | social_posts | LOW |
| `deleteBudgetLimit(id, portalId?)` | `budgetService.ts` | 73 | budget_limits | LOW |
| `renameFolder(id, name, portalId?)` | `cloudService.ts` | 52 | cloud_folders | LOW |
| `softDeleteFolder(id, portalId?)` | `cloudService.ts` | 63 | cloud_folders | LOW |
| `updateCategory(id, updates, portalId?)` | `categoryService.ts` | 53 | finance_transaction_categories | LOW |
| `deleteCategory(id, portalId?)` | `categoryService.ts` | 69 | finance_transaction_categories | LOW |
| `loadTasksFromSupabase(portalId?)` | `taskSync.ts` | 119 | tasks | **MEDIUM** — called without portalId it reads ALL tasks |
| `loadProjectsFromSupabase(portalId?)` | `taskSync.ts` | 133 | projects | **MEDIUM** — same |

---

## Summary

| Severity | Count |
|---|---|
| HIGH | 8 |
| MEDIUM | 4 |
| LOW | 17 |
| **Total** | **29** |
