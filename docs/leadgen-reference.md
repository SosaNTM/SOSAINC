# Lead Generation Module — Reference Document

**Project:** SOSA INC / SOSAINC2  
**Stack:** Vite + React + TypeScript + Supabase + TailwindCSS + Sonner (toasts)  
**Portal:** REDX only (leadgen features are gated to the REDX portal)  
**Base route:** `/:portalId/leadgen/*`  
**Branch:** `feat/sosa-design-system`

---

## 1. Architecture Overview

The leadgen module is a B2B outreach pipeline built on top of Supabase. It lets a sales team:
- Run scraping searches via Apify to generate leads (Italian SMEs from Google Maps)
- Work through a daily action queue (cold → contacted → follow-up → hot)
- Track outreach history per lead (channel, direction, notes)
- Manage team members, roles, and lead ownership
- View personal KPIs (assigned lead counts, conversion rates, period deltas)
- View team-wide analytics (Overview page — owner/admin only)

All data is strictly **portal-scoped** — every Supabase query includes `.eq("portal_id", currentPortalId)`. RLS enforces this server-side as a second layer.

---

## 2. Directory Structure

```
src/
├── pages/leadgen/
│   ├── LeadgenDashboard.tsx       Personal KPI dashboard (default landing)
│   ├── LeadgenOverview.tsx        Team analytics — owner/admin only
│   ├── LeadgenToday.tsx           Daily action hub (3 tabs: cold/follow-up/hot)
│   ├── LeadgenSearch.tsx          Apify search launcher
│   ├── LeadgenSearchHistory.tsx   Search history table
│   ├── LeadgenSettings.tsx        Apify config, blacklist, data cleanup
│   ├── LeadgenLeadDetail.tsx      Individual lead detail + outreach log + reassign
│   ├── LeadgenWithWebsite.tsx     Filtered lead list (has website)
│   └── LeadgenNoWebsite.tsx       Filtered lead list (no website)
│
├── hooks/leadgen/
│   ├── useLeadgenLeads.ts         All portal leads, SWR cached, realtime
│   ├── useColdLeads.ts            Uncontacted leads, scored + skip tracking
│   ├── useFollowUpLeads.ts        Aging leads (contacted >7d, qualified >5d)
│   ├── useHotLeads.ts             Replied leads with no outbound >2d
│   ├── usePersonalLeads.ts        Assigned leads — filter/search/sort/paginate
│   ├── usePersonalLeadgenSummary.ts  Personal KPIs + period deltas, SWR cached
│   ├── useLeadgenMembers.ts       Team members + workload map + realtime
│   ├── useLeadgenOverviewStats.ts Team-wide KPIs + per-member breakdown
│   ├── useLeadgenSettings.ts      Apify portal settings (upsert)
│   ├── useLeadgenBlacklist.ts     Blacklist rule CRUD
│   ├── useLeadgenLeadNotes.ts     Lead notes CRUD
│   ├── useLeadgenOutreachEvents.ts Outreach event history (paginated)
│   ├── useLeadgenSearches.ts      Search management — Apify polling + abort
│   ├── useAutoRelease.ts          Auto-releases leads inactive >14d
│   ├── useTodayCount.ts           Action item count for sidebar badge
│   ├── useLeadgenSummary.ts       Aggregates lead array into summary metrics
│   └── usePortalMembers.ts        Generic portal members (non-leadgen)
│
├── components/leadgen/
│   ├── LeadOutreachStatusBadge.tsx  Status badge + STATUS_CONFIG export
│   ├── AddLeadModal.tsx             Manual lead addition modal
│   ├── LeadTable.tsx                Reusable lead table with filter/sort
│   ├── SearchProgressIndicator.tsx  Apify search status indicator
│   └── CountryFlagSelect.tsx        Country picker with flags
│
└── lib/
    ├── leadgenConstants.ts     All threshold constants (single source of truth)
    ├── leadgenFilter.ts        Blacklist logic + applyOwnershipFilter
    ├── leadgenSkipTracking.ts  localStorage skip-map utilities
    ├── leadgenRealtime.ts      Broadcast/subscribe event system
    ├── leadgenStatusGroups.ts  DashboardGroup/DashboardPeriod types + mappings
    └── leadgenCategories.ts    Italian PMI category definitions
```

---

## 3. Routes

All routes are lazy-loaded via `React.lazy`.

| Path | Component | Notes |
|------|-----------|-------|
| `/leadgen` | → `dashboard` | Redirect |
| `/leadgen/dashboard` | `LeadgenDashboard` | Personal KPI — default landing |
| `/leadgen/today` | `LeadgenToday` | Daily action queue |
| `/leadgen/overview` | `LeadgenOverview` | Team analytics — sidebar-gated to owner/admin |
| `/leadgen/search` | `LeadgenSearch` | New search launcher |
| `/leadgen/searches` | `LeadgenSearchHistory` | History table |
| `/leadgen/no-website` | `LeadgenNoWebsite` | Leads without website |
| `/leadgen/with-website` | `LeadgenWithWebsite` | Leads with website |
| `/leadgen/lead/:id` | `LeadgenLeadDetail` | Lead detail |
| `/leadgen/settings` | `LeadgenSettings` | Settings |

---

## 4. Data Model (`src/types/leadgen.ts`)

### Union Types

```typescript
type OutreachStatus = "new" | "contacted" | "replied" | "qualified" | "converted" | "rejected";
type SearchStatus = "pending" | "running" | "completed" | "failed";
type OutreachChannel = "email" | "dm_instagram" | "call" | "pec";
type OutreachDirection = "outbound" | "inbound";
type LeadgenMemberRole = "owner" | "admin" | "sales";
type LeadgenMemberTeam = "internal" | "external";
type LeadgenLeadVisibility = "team" | "internal_only" | "private";
type BlacklistRuleType = "title_keyword" | "website_domain" | "category" | "min_reviews";
```

### LeadgenLead (main entity)

```typescript
interface LeadgenLead {
  id: string;
  portal_id: string;
  search_id: string | null;
  place_id: string | null;
  // Location
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country_code: string | null;
  // Contact
  phone: string | null;
  website: string | null;
  emails: string[];
  social_media: Record<string, string>;
  has_website: boolean;
  // Meta
  category: string | null;
  rating: number | null;
  reviews_count: number | null;
  // Assignment
  assigned_to: string | null;       // user_id
  assigned_at: string | null;
  assigned_by: string | null;
  visibility: LeadgenLeadVisibility;
  // Outreach
  outreach_status: OutreachStatus;
  outreach_notes: string | null;
  contacted_at: string | null;
  last_activity_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}
```

### Other Interfaces

```typescript
interface LeadgenMember {
  id: string; portal_id: string; user_id: string;
  role: LeadgenMemberRole; team: LeadgenMemberTeam;
  display_name: string | null; active: boolean;
  notes: string | null; added_at: string; added_by: string | null;
}

interface LeadgenSettings {
  portal_id: string; apify_token: string | null; actor_id: string | null;
  default_country_code: string; default_language: string;
  default_max_places: number; scrape_contacts: boolean;
}

interface LeadgenSearch {
  id: string; portal_id: string;
  country_code: string; postal_code: string;
  category: string | null; categories: string[];
  status: SearchStatus; apify_run_id: string | null;
  total_results: number | null; with_website: number | null;
  without_website: number | null; excluded_count: number | null;
  discarded_no_contact_count: number | null;
  started_at: string; completed_at: string | null;
}

interface LeadgenOutreachEvent {
  id: string; portal_id: string; lead_id: string; user_id: string | null;
  channel: OutreachChannel; direction: OutreachDirection;
  notes: string | null; occurred_at: string;
}

interface LeadgenLeadNote {
  id: string; portal_id: string; lead_id: string;
  author_id: string; content: string; created_at: string;
}

interface LeadgenBlacklist {
  id: string; portal_id: string;
  rule_type: BlacklistRuleType; rule_value: string;
  active: boolean; created_at: string;
}
```

---

## 5. Shared Library Files

### `src/lib/leadgenConstants.ts`
Single source of truth for all thresholds:
```typescript
export const COLD_SKIP_TTL_MS = 24 * 60 * 60 * 1000;      // 24h
export const FOLLOWUP_SKIP_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const COLD_LIMIT = 200;                              // max cold leads fetched
export const HOT_THRESHOLD_DAYS = 2;                        // days before "replied" lead is hot
export const CONTACTED_THRESHOLD_DAYS = 7;                  // days before contacted lead needs follow-up
export const QUALIFIED_THRESHOLD_DAYS = 5;                  // days before qualified lead needs follow-up
export const AUTO_RELEASE_DAYS = 14;                        // days of inactivity before auto-release
```

### `src/lib/leadgenSkipTracking.ts`
localStorage skip-map (temporarily hide a lead from the queue):
```typescript
coldSkipKey(portalId: string): string       // key for cold leads skip map
followUpSkipKey(portalId: string): string   // key for follow-up skip map
getSkipMap(key: string): Record<string, number>
saveSkipMap(key: string, map: Record<string, number>): void
```

### `src/lib/leadgenFilter.ts`
```typescript
// Blacklist evaluation
applyBlacklist(rules: BlacklistRules, item: ApifyPlaceResult): FilterResult
evaluateLead(rules: BlacklistRules, item: ApifyPlaceResult): FilterResult  // blacklist + no-contact check
getValidEmails(item: ApifyPlaceResult): string[]
shouldDiscardForNoContact(item: ApifyPlaceResult): boolean

// Ownership filter — applies to any Supabase query builder
type OwnershipFilter = "mine" | "pool" | "all";
applyOwnershipFilter<Q extends { eq(...): Q; is(...): Q }>(
  query: Q,
  ownership: OwnershipFilter,
  currentUserId?: string
): Q
```

### `src/lib/leadgenRealtime.ts`
```typescript
// Broadcast an event to all subscribers (Supabase channel + CustomEvent fallback)
broadcastLeadgenUpdate(event: LeadgenEvent, payload?: object): void

// Subscribe to leadgen events — returns cleanup function
subscribeToLeadgenUpdates(cb: (event: LeadgenEvent) => void): () => void

type LeadgenEvent = "lead_updated" | "search_completed" | "search_started" | "search_failed"
```

### `src/lib/leadgenStatusGroups.ts`
```typescript
type DashboardGroup = "uncontacted" | "contacted" | "in_progress" | "completed" | "archived";
type DashboardPeriod = "all" | "week" | "month" | "quarter";

STATUS_TO_GROUP: Record<OutreachStatus, DashboardGroup>
GROUP_TO_STATUSES: Record<DashboardGroup, OutreachStatus[]>
GROUP_LABELS: Record<DashboardGroup, string>       // Italian labels
GROUP_COLOR: Record<DashboardGroup, string>        // CSS variable strings
PERIOD_LABELS: Record<DashboardPeriod, string>     // Italian labels
ACTIVE_STATUSES: OutreachStatus[]                  // new|contacted|replied|qualified|converted
```

---

## 6. Hook APIs

### `useLeadgenLeads()`
All leads for portal. SWR localStorage cache (60s TTL). Realtime via `lead_updated`.
```typescript
{ data: LeadgenLead[], loading: boolean, error: string | null, refetch: () => void }
```

### `useColdLeads(filters: ColdLeadsFilters)`
Uncontacted leads (`outreach_status = "new"`), scored and skip-filtered.
```typescript
interface ColdLeadsFilters {
  hasWebsite?: boolean; categories?: string[]; minRating: number;
  minReviews: number; cities?: string[];
  orderBy: "score" | "recent" | "reviews" | "rating";
  ownership?: "mine" | "pool" | "all";
}
{ leads: LeadgenLead[], totalEligibleCount: number, loading: boolean,
  refetch: () => void, skipLead: (id: string) => void, removeLead: (id: string) => void }
```

### `useFollowUpLeads(filters?: FollowUpFilters)`
Aging leads: `contacted` >7d and `qualified` >5d since last event.
```typescript
{ contactedAging: LeadgenLead[], qualifiedAging: LeadgenLead[], total: number,
  loading: boolean, refetch: () => void,
  skipLead: (id: string) => void, removeLead: (id: string) => void }
```

### `useHotLeads(filters?: HotLeadsFilters)`
`replied` leads where last outreach event was inbound and >2d ago.
```typescript
interface HotLead extends LeadgenLead {
  lastInboundAt: string; lastInboundNotes: string | null; daysAgo: number;
}
{ hotLeads: HotLead[], total: number, loading: boolean,
  refetch: () => void, removeLead: (id: string) => void }
```

### `usePersonalLeads()`
Personal assigned leads with client-side filter/search/sort/pagination.
```typescript
{ leads: LeadgenLead[], total: number, page: number, totalPages: number,
  loading: boolean, search: string, setSearch: (s: string) => void,
  group: DashboardGroup | "all", setGroup: (g: ...) => void,
  sortField: string, setSortField: (f: string) => void,
  sortDir: "asc"|"desc", setSortDir: (d: ...) => void,
  setPage: (p: number) => void, refetch: () => void }

// Also exports:
useArchivedLeads()  // rejected leads with reopen action
→ { leads: LeadgenLead[], loading: boolean, reopen: (id: string) => Promise<void>, refetch: () => void }
```

### `usePersonalLeadgenSummary(period: DashboardPeriod)`
Personal KPI counts + period deltas + conversion rates. SWR cached (60s TTL).
```typescript
{ uncontacted: number, contacted: number, inProgress: number, completed: number,
  archived: number, totalActive: number, lastActionAt: string | null,
  personalConversionRate: number, teamAverageConversionRate: number,
  deltaUncontacted: number, deltaContacted: number,
  deltaInProgress: number, deltaCompleted: number, loading: boolean }
```

### `useLeadgenMembers()`
Team members enriched with `user_profiles` (email, avatar). Workload map. Realtime subscription on `leadgen_members` table.
```typescript
interface LeadgenMemberWithProfile extends LeadgenMember { email: string; avatar_url: string | null; }
interface WorkloadEntry { total: number; active: number; }

{ members: LeadgenMemberWithProfile[], currentMember: LeadgenMember | null,
  workload: Map<string, WorkloadEntry>, poolCount: number, loading: boolean,
  refetch: () => void, searchByEmail: (email: string) => Promise<...>,
  addMember: (params) => Promise<{ error: string | null }>,
  updateMember: (id, patch) => Promise<{ error: string | null }>,
  deactivateMember: (id) => Promise<{ error: string | null }> }

// Also exports lightweight hook (no profile enrichment):
useLeadgenCurrentMember(): LeadgenMember | null
```

### `useLeadgenOverviewStats()`
Team-wide KPIs + per-member breakdown. Realtime on `lead_updated`.
```typescript
interface MemberStat {
  userId: string; displayName: string; email: string; role: string;
  total: number; active: number; completed: number; rejected: number;
  conversionRate: number;
}
interface LeadgenOverviewStats {
  totalLeads: number; activeLeads: number; poolSize: number;
  convertedThisMonth: number; teamConversionRate: number;
  memberStats: MemberStat[]; loading: boolean;
}
```

### `useLeadgenSearches()`
Search history + Apify polling loop.
```typescript
{ searches: LeadgenSearch[], loading: boolean, pollError: string | null,
  refetch: () => void,
  createSearch: (payload) => Promise<{ data: LeadgenSearch | null, error: string | null }>,
  startPolling: (apifyToken: string) => void,
  stopPolling: () => void,
  abortSearch: (searchId, apifyRunId, apifyToken) => Promise<{ error: string | null }> }
```

### `useLeadgenSettings()`
```typescript
{ data: LeadgenSettings | null, loading: boolean,
  upsert: (patch: Partial<LeadgenSettings>) => Promise<{ error: string | null }> }
```

### `useLeadgenBlacklist()`
```typescript
{ rules: LeadgenBlacklist[], loading: boolean,
  create: (rule) => Promise<{ error: string | null }>,
  update: (id, patch) => Promise<{ error: string | null }>,
  remove: (id) => Promise<{ error: string | null }> }
```

### `useLeadgenLeadNotes(leadId: string)`
```typescript
{ notes: LeadgenLeadNote[], loading: boolean,
  create: (content: string) => Promise<{ error: string | null }>,
  update: (id, content) => Promise<{ error: string | null }>,
  remove: (id) => Promise<{ error: string | null }> }
```

### `useLeadgenOutreachEvents(leadId: string, limit?: number)`
```typescript
{ events: LeadgenOutreachEvent[], loading: boolean, hasMore: boolean,
  loadMore: () => void }
```

### `useAutoRelease()`
Runs once on mount. Releases leads inactive >14d back to pool. Fires toast notification to affected user.
```typescript
{ notification: AutoReleaseNotification | null, dismissNotification: () => void }
interface AutoReleaseNotification { count: number; leadNames: string[]; }
```

### `useTodayCount()`
Sum of cold + follow-up + hot leads for sidebar badge.
```typescript
{ count: number, loading: boolean }
```

---

## 7. Key Patterns

### Portal isolation
Every raw Supabase query must include `.eq("portal_id", currentPortalId)`. The `usePortalDB()` hook from `@/lib/portalContextDB` provides `currentPortalId`, `isOwner`, `isAdmin`. Never use the older `usePortal()`.

### SWR cache (localStorage)
Used by: `useLeadgenLeads`, `usePersonalLeadgenSummary`, `useLeadgenSearches`, `useAutoRelease`.  
Pattern: load from localStorage on mount for instant UI, then async-refresh from Supabase, write back with TTL. Invalidated on realtime events.

### Realtime
Two mechanisms used together:
1. `subscribeToLeadgenUpdates(cb)` — cross-tab Supabase broadcast + CustomEvent fallback. Events: `lead_updated`, `search_completed`, `search_started`, `search_failed`.
2. Direct Supabase channel subscription — used in `useLeadgenMembers` for `leadgen_members` table changes.

### Ownership filter
`applyOwnershipFilter(query, ownership, currentUserId)` from `@/lib/leadgenFilter.ts`:
- `"mine"` → `.eq("assigned_to", currentUserId)`
- `"pool"` → `.is("assigned_to", null)`
- `"all"` → no filter

If `ownership === "mine"`, call `supabase.auth.getUser()` first to get `currentUserId`, then pass it.

### Skip tracking
Cold and follow-up queues let the user temporarily hide a lead (skip). Stored in localStorage with a TTL (`COLD_SKIP_TTL_MS` = 24h, `FOLLOWUP_SKIP_TTL_MS` = 7d). Skip maps are keyed by `coldSkipKey(portalId)` / `followUpSkipKey(portalId)`.

### Toast notifications
```typescript
import { toast } from "sonner";
toast.success("Messaggio");
toast.error("Errore");
```
All UI labels are in **Italian**. Code, variable names, and comments are in English.

### Parallel count queries
`useLeadgenOverviewStats` and `usePersonalLeadgenSummary` use `{ count: "exact", head: true }` with `Promise.all` to run multiple count queries in parallel — no N+1.

---

## 8. Supabase Tables

| Table | Main Operations |
|-------|----------------|
| `leadgen_leads` | SELECT (filtered/counted/grouped), UPDATE (status/notes/assignment), INSERT (Apify ingest), DELETE (cleanup) |
| `leadgen_searches` | SELECT, INSERT, UPDATE (status/result counts) |
| `leadgen_members` | SELECT, INSERT, UPDATE |
| `leadgen_settings` | SELECT, UPSERT |
| `leadgen_outreach_events` | INSERT (dominant), SELECT (aging/last-event queries) |
| `leadgen_lead_notes` | SELECT, INSERT, UPDATE, DELETE |
| `leadgen_blacklist` | SELECT, INSERT, UPDATE, DELETE |
| `user_profiles` | SELECT only (email/avatar enrichment for members) |

---

## 9. Sidebar Navigation

Leadgen section visible only in REDX portal. Overview item gated by role.

| Item | Icon | Path | Role gate |
|------|------|------|-----------|
| Dashboard | LayoutDashboard | `/leadgen/dashboard` | None |
| Da Fare Oggi | CheckSquare | `/leadgen/today` | None (live count badge) |
| Nuova ricerca | Search | `/leadgen/search` | None |
| Senza sito | Globe | `/leadgen/no-website` | None |
| Con sito | Globe2 | `/leadgen/with-website` | None |
| Storico | History | `/leadgen/searches` | None |
| Impostazioni | Settings | `/leadgen/settings` | None |
| Overview | BarChart2 | `/leadgen/overview` | owner or admin |

---

## 10. Recent Changes (as of 2026-05-06)

- **Personal Dashboard** (`LeadgenDashboard.tsx`) — new page with period selector, 4 KPI cards with delta badges, lead list with group/search/sort/pagination, archived section with Riapri
- **Team Overview** (`LeadgenOverview.tsx`) — global KPI strip + member workload table + pie/bar charts
- **Ownership filter bar** — filter pills (Tutti / Miei / Pool) on Today tabs + Dashboard
- **Riassegna modal** — reassign leads from LeadgenLeadDetail (owner/admin only)
- **Auto-release banner** — `useAutoRelease` notifies user when their leads were auto-released
- **Team settings route** — `/leadgen/settings` includes team member management
- **`useLeadgenCurrentMember`** — lightweight hook for sidebar role check (avoids full members+profiles fetch)
- **All thresholds centralized** in `leadgenConstants.ts`
- **Skip-map utilities** extracted to `leadgenSkipTracking.ts`
- **`applyOwnershipFilter`** extracted to `leadgenFilter.ts`
- **Error handling** added to `useColdLeads`, `useFollowUpLeads`, `useHotLeads`
- **`pollError` state** added to `useLeadgenSearches` (replaces `console.warn`)
- **Realtime subscription** added to `useLeadgenMembers`
- **`updateMember` portal_id filter** security fix
