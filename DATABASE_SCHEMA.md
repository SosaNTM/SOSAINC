# ICONOFF Database Schema

## Architecture

Multi-portal Supabase PostgreSQL with Row Level Security (RLS).  
4 portals: **sosa**, **keylo**, **redx**, **trustme** — each isolated by `portal_id UUID`.

### Portal UUID Map

| Slug | UUID |
|------|------|
| sosa | `00000000-0000-0000-0000-000000000001` |
| keylo | `00000000-0000-0000-0000-000000000002` |
| redx | `00000000-0000-0000-0000-000000000003` |
| trustme | `00000000-0000-0000-0000-000000000004` |

Use `toPortalUUID(slug)` from `src/lib/portalUUID.ts` when querying.

---

## Tables

### Finance

| Table | Purpose | RLS |
|-------|---------|-----|
| `personal_transactions` | Income/expense/transfer entries | portal_id |
| `finance_transaction_categories` | Custom income/expense/cogs/opex categories | portal_id |
| `budget_limits` | Monthly per-category budget caps | portal_id |
| `financial_goals` | Savings goals with progress | portal_id |
| `investments` | Portfolio positions (stock/ETF/crypto/bonds/RE) | portal_id |
| `crypto_holdings` | Crypto coin holdings | portal_id |
| `crypto_transactions` | Buy/sell/transfer crypto history | portal_id |
| `subscriptions` | Recurring SaaS subscriptions | portal_id |
| `gift_cards` | Gift card inventory | portal_id |
| `gift_card_transactions` | Usage history for gift cards | gift_card_id |

### Productivity

| Table | Purpose | RLS |
|-------|---------|-----|
| `projects` | Project containers for tasks | portal_id |
| `tasks` | Issues/tasks with status/priority | portal_id |
| `task_comments` | Comments on tasks | portal_id |
| `notes` | Rich text notes | portal_id |
| `note_folders` | Folder hierarchy for notes | portal_id |

### Cloud Storage

| Table | Purpose | RLS |
|-------|---------|-----|
| `cloud_folders` | Folder tree (soft-delete with `is_deleted`) | portal_id |
| `cloud_files` | File metadata + Supabase Storage URL | portal_id |
| `cloud_file_versions` | Version history for files | portal_id |
| `folder_access_log` | Access log for cloud folders | portal_id |

### Security

| Table | Purpose | RLS |
|-------|---------|-----|
| `vault_items` | Encrypted credentials/cards/notes | portal_id |
| `vault_access_log` | Audit trail for vault access | portal_id |
| `audit_log` | General platform audit log | portal_id |

### Social & Profiles

| Table | Purpose | RLS |
|-------|---------|-----|
| `social_posts` | Content calendar posts (draft/scheduled/published) | portal_id |
| `social_connections` | Connected social accounts | portal_id |
| `user_profiles` | Per-user profile data | portal_id |
| `user_preferences` | Per-user preferences per portal | portal_id |

---

## Indexes

Key composite indexes (created in `missing_schemas_v2.sql`):

- `idx_pt_portal_user` — `personal_transactions(portal_id, user_id)`
- `idx_pt_date` — `personal_transactions(portal_id, date)`
- `idx_tasks_portal` — `tasks(portal_id)`
- `idx_fg_portal_user` — `financial_goals(portal_id, user_id)`
- `idx_inv_portal_user` — `investments(portal_id, user_id)`
- `idx_ch_portal_user` — `crypto_holdings(portal_id, user_id)`
- `idx_subs_next_billing` — `subscriptions(next_billing_date) WHERE status='active'`

---

## Services

All services live in `src/lib/services/` and follow this pattern:

1. **Primary**: Supabase with `portal_id = toPortalUUID(portalId)` filter
2. **Fallback**: Portal-scoped localStorage cache
3. **Optimistic writes**: Local update before Supabase, rollback on failure
4. **Validation**: Zod schemas from `src/lib/validation/schemas.ts` on create

| Service | File | Tables |
|---------|------|--------|
| personalTransactionService | services/personalTransactionService.ts | personal_transactions |
| budgetService | services/budgetService.ts | budget_limits |
| goalsService | services/goalsService.ts | financial_goals |
| investmentService | services/investmentService.ts | investments |
| categoryService | services/categoryService.ts | finance_transaction_categories |
| notesService | services/notesService.ts | notes, note_folders |
| vaultService | services/vaultService.ts | vault_items |
| cloudService | services/cloudService.ts | cloud_folders, cloud_files |
| socialPostsService | services/socialPostsService.ts | social_posts |
| tasksService | services/tasksService.ts | tasks, projects, task_comments |
| userProfileService | services/userProfileService.ts | user_profiles, user_preferences |
| auditLogService | services/auditLogService.ts | audit_log |

---

## Real-time

- **Finance updates**: `src/lib/financeRealtime.ts` — broadcast channel for transaction changes
- **Postgres Changes**: `src/lib/realtime/useRealtimeTable.ts` — generic hook for any table

Usage:
```ts
useRealtimeTable<DbFinancialGoal>("financial_goals", portalId, {
  onInsert: (row) => setGoals(prev => [mapRow(row), ...prev]),
  onUpdate: (row) => setGoals(prev => prev.map(g => g.id === row.id ? mapRow(row) : g)),
  onDelete: (id)  => setGoals(prev => prev.filter(g => g.id !== id)),
});
```

---

## Migration

One-time migration from localStorage → Supabase:

```ts
import { runMigration } from "@/lib/migration/migrateLocalToSupabase";
const result = await runMigration(userId, portalId);
```

Migrates: transactions, goals, investments, budget limits.  
Skips if already migrated (flag in localStorage: `iconoff_migration_done_<portalId>`).
