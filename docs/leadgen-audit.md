# Lead Generation — Codebase Audit

**Date:** 2026-05-06
**Branch:** `feat/sosa-design-system`
**Scope:** All files under `src/pages/leadgen/`, `src/hooks/leadgen/`, `src/components/leadgen/`, and related lib files.

---

## 1. File Inventory

### Pages (`src/pages/leadgen/`)

| File | Lines | Purpose |
|------|-------|---------|
| `LeadgenDashboard.tsx` | 473 | Personal lead dashboard — KPI cards, period selector, filtered/paginated lead list, archived section |
| `LeadgenOverview.tsx` | 275 | Team-wide overview — global KPI strip, member workload table, pie/bar charts, funnel |
| `LeadgenToday.tsx` | 1048 | Daily action hub — 3 tabs: cold leads, follow-up, hot leads |
| `LeadgenSearch.tsx` | 917 | Lead search launcher — category picker, cost calculator, Apify integration |
| `LeadgenSearchHistory.tsx` | 150 | Search history table with status and result counts |
| `LeadgenSettings.tsx` | 465 | Apify config, blacklist rules, data cleanup |
| `LeadgenLeadDetail.tsx` | 779 | Individual lead — outreach log, notes, status, reassign modal |
| `LeadgenWithWebsite.tsx` | 355 | Filtered lead list (has website) |
| `LeadgenNoWebsite.tsx` | 331 | Filtered lead list (no website) |

### Hooks (`src/hooks/leadgen/`)

| File | Lines | Purpose |
|------|-------|---------|
| `useLeadgenLeads.ts` | 131 | Core lead fetching — SWR cached, all portal leads |
| `useColdLeads.ts` | 131 | Cold leads — uncontacted, scored by rating/reviews, skip tracking |
| `useFollowUpLeads.ts` | 141 | Follow-up aging — contacted >7d, qualified >5d |
| `useHotLeads.ts` | 108 | Hot leads — replied but no outbound for >2d |
| `useLeadgenMembers.ts` | 166 | Team members, workload map, pool count, lightweight `useLeadgenCurrentMember` |
| `useLeadgenSettings.ts` | 54 | Apify portal settings (upsert) |
| `useLeadgenBlacklist.ts` | 113 | Blacklist rule CRUD |
| `useLeadgenLeadNotes.ts` | 56 | Lead notes CRUD |
| `useLeadgenOutreachEvents.ts` | 60 | Outreach event history (paginated) |
| `useLeadgenSummary.ts` | 50 | Aggregates lead array into summary metrics |
| `useLeadgenOverviewStats.ts` | 139 | Team-wide KPIs + per-member breakdown |
| `usePersonalLeads.ts` | 161 | Personal assigned leads — filter, search, sort, pagination |
| `usePersonalLeadgenSummary.ts` | 191 | Personal KPIs with period deltas, SWR cache, conversion rate |
| `useLeadgenSearches.ts` | 205 | Search management — Apify polling, abort, SWR cache |
| `useAutoRelease.ts` | 86 | Auto-releases leads inactive for >14d |
| `useTodayCount.ts` | 79 | Count of daily action items for sidebar badge |
| `usePortalMembers.ts` | 47 | Generic portal members (non-leadgen) |

### Components (`src/components/leadgen/`)

| File | Purpose |
|------|---------|
| `LeadOutreachStatusBadge.tsx` | Status badge + `STATUS_CONFIG` export |
| `AddLeadModal.tsx` | Manual lead addition modal |
| `LeadTable.tsx` | Reusable lead table with filter/sort |
| `SearchProgressIndicator.tsx` | Status indicator for Apify searches |
| `CountryFlagSelect.tsx` | Country picker with flags |

### Library Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/leadgenStatusGroups.ts` | 47 | `DashboardGroup`/`DashboardPeriod` types + group↔status constants |
| `src/lib/leadgenRealtime.ts` | 57 | Broadcast/subscribe event system (Supabase + CustomEvent fallback) |
| `src/lib/leadgenFilter.ts` | 77 | Blacklist filtering logic |
| `src/lib/leadgenCategories.ts` | — | Italian PMI category definitions |

---

## 2. Routes

All routes are lazy-loaded. Base path: `/:portalId/leadgen/*`

| Path | Component | Notes |
|------|-----------|-------|
| `/leadgen` | → `dashboard` | Redirect |
| `/leadgen/dashboard` | `LeadgenDashboard` | Personal KPI page — new default |
| `/leadgen/today` | `LeadgenToday` | Daily action queue |
| `/leadgen/overview` | `LeadgenOverview` | Team analytics — admin/owner only (sidebar-gated) |
| `/leadgen/search` | `LeadgenSearch` | New search launcher |
| `/leadgen/searches` | `LeadgenSearchHistory` | History table |
| `/leadgen/no-website` | `LeadgenNoWebsite` | Leads without website |
| `/leadgen/with-website` | `LeadgenWithWebsite` | Leads with website |
| `/leadgen/lead/:id` | `LeadgenLeadDetail` | Lead detail |
| `/leadgen/settings` | `LeadgenSettings` | Settings |

---

## 3. Hooks — Capabilities Matrix

| Hook | Realtime | SWR Cache | Error Check | portal_id filter |
|------|----------|-----------|-------------|-----------------|
| `useLeadgenLeads` | ✅ | ✅ localStorage | Partial | ✅ |
| `useColdLeads` | ✅ | ❌ | ❌ | ✅ |
| `useFollowUpLeads` | ✅ | ❌ | ❌ | ✅ |
| `useHotLeads` | ✅ | ❌ | ❌ | ✅ |
| `useLeadgenMembers` | ❌ | ❌ | Partial | ✅ |
| `useLeadgenSettings` | ❌ | ✅ localStorage | Partial | ✅ |
| `useLeadgenBlacklist` | ❌ | ❌ | Partial | ✅ |
| `useLeadgenLeadNotes` | ❌ | ❌ | Partial | ✅ |
| `useLeadgenOutreachEvents` | ❌ | ❌ | Partial | ✅ |
| `useLeadgenOverviewStats` | ✅ | ❌ | ❌ | ✅ |
| `usePersonalLeads` | ✅ | ❌ | Partial | ✅ |
| `usePersonalLeadgenSummary` | ✅ | ✅ localStorage | Partial | ✅ |
| `useLeadgenSearches` | ✅ | ✅ localStorage | Partial | ✅ |
| `useAutoRelease` | ✅ | ✅ localStorage | Partial | ✅ |
| `useTodayCount` | ✅ | ❌ | ❌ | ✅ |

---

## 4. Data Model (`src/types/leadgen.ts`)

### Types / Unions

| Type | Values |
|------|--------|
| `OutreachStatus` | `new` `contacted` `replied` `qualified` `converted` `rejected` |
| `SearchStatus` | `pending` `running` `completed` `failed` |
| `OutreachChannel` | `email` `dm_instagram` `call` `pec` |
| `OutreachDirection` | `outbound` `inbound` |
| `LeadgenMemberRole` | `owner` `admin` `sales` |
| `LeadgenMemberTeam` | `internal` `external` |
| `LeadgenLeadVisibility` | `team` `internal_only` `private` |
| `BlacklistRuleType` | `title_keyword` `website_domain` `category` `min_reviews` |

### Interfaces

**`LeadgenLead`** (26 fields)
- Identity: `id`, `portal_id`, `search_id`, `place_id`
- Location: `name`, `address`, `postal_code`, `city`, `country_code`
- Contact: `phone`, `website`, `emails[]`, `social_media{}`
- Meta: `category`, `rating`, `reviews_count`, `has_website`
- Assignment: `assigned_to`, `assigned_at`, `assigned_by`, `visibility`
- Outreach: `outreach_status`, `outreach_notes`, `contacted_at`, `last_activity_at`
- Timestamps: `created_at`, `updated_at`

**`LeadgenMember`** — `id`, `portal_id`, `user_id`, `role`, `team`, `display_name`, `active`, `notes`, `added_at`, `added_by`

**`LeadgenSettings`** — `portal_id`, `apify_token`, `actor_id`, `default_country_code`, `default_language`, `default_max_places`, `scrape_contacts`

**`LeadgenSearch`** — `portal_id`, `country_code`, `postal_code`, `category`, `categories[]`, `status`, `apify_run_id`, `total_results`, `with_website`, `without_website`, `excluded_count`, `discarded_no_contact_count`

**`LeadgenOutreachEvent`** — `portal_id`, `lead_id`, `user_id`, `channel`, `direction`, `notes`, `occurred_at`

**`LeadgenLeadNote`** — `portal_id`, `lead_id`, `author_id`, `content`, `created_at`

**`LeadgenBlacklist`** — `portal_id`, `rule_type`, `rule_value`, `active`, `created_at`

---

## 5. Sidebar Navigation

Lead Generation section — REDX portal only.

| Item | Path | Role-gated |
|------|------|-----------|
| Dashboard | `/leadgen/dashboard` | No |
| Da Fare Oggi | `/leadgen/today` | No (live badge shows action count) |
| Nuova ricerca | `/leadgen/search` | No |
| Senza sito | `/leadgen/no-website` | No |
| Con sito | `/leadgen/with-website` | No |
| Storico | `/leadgen/searches` | No |
| Impostazioni | `/leadgen/settings` | No |
| Overview | `/leadgen/overview` | **Yes — owner/admin only** |

---

## 6. Issues Found

### 🔴 Security

**S-1: `useLeadgenMembers.updateMember()` missing `portal_id` filter**
```typescript
// Current — can update any row by ID across portals
const { error } = await supabase.from("leadgen_members").update(patch).eq("id", id);

// Fix
const { error } = await supabase.from("leadgen_members").update(patch).eq("id", id).eq("portal_id", currentPortalId);
```
Risk: Low in practice (client-side ID not guessable), but violates the portal isolation invariant.

---

### 🟠 Duplicate Logic

**D-1: Skip-map logic duplicated in `useColdLeads` and `useFollowUpLeads`**

Both files implement identical `skipKey()`, `getSkipMap()`, `saveSkipMap()` functions.
**Fix:** Extract to `src/lib/leadgenSkipTracking.ts`.

**D-2: Ownership filter pattern duplicated in 4 hooks**

`useColdLeads`, `useFollowUpLeads`, `useHotLeads` all implement:
```typescript
if (ownership === "mine" && currentUserId) query = query.eq("assigned_to", currentUserId);
else if (ownership === "pool") query = query.is("assigned_to", null);
```
**Fix:** Extract `applyOwnershipFilter(query, ownership, currentUserId)` to `src/lib/leadgenFilter.ts`.

---

### 🟠 Missing Error Handling

**E-1: `useColdLeads.ts`** — Supabase `data` used without checking `error`
```typescript
const { data } = await query;  // error silently ignored
```

**E-2: `useFollowUpLeads.ts`** — `Promise.all` results not error-checked
```typescript
const [contactedRes, qualifiedRes] = await Promise.all([...]);
// contactedRes.error / qualifiedRes.error never checked
```

**E-3: `useHotLeads.ts`** — Same pattern
```typescript
const { data: leads } = await query;  // error silently ignored
```

**E-4: `useLeadgenSearches.ts`** — Poll error only `console.warn`'d, no user notification or error state set.

---

### 🟡 Hardcoded Thresholds (should be in `leadgenConstants.ts`)

| Constant | Value | Location |
|----------|-------|----------|
| `HOT_THRESHOLD_DAYS` | 2 | `useHotLeads.ts` |
| `CONTACTED_THRESHOLD_DAYS` | 7 | `useFollowUpLeads.ts` |
| `QUALIFIED_THRESHOLD_DAYS` | 5 | `useFollowUpLeads.ts` |
| `AUTO_RELEASE_DAYS` | 14 | `useAutoRelease.ts` |
| `SKIP_TTL` | 24h (ms) | `useColdLeads.ts` |
| `COLD_LIMIT` | 200 | `useColdLeads.ts` |

All are defined as module-level constants in their respective files — correct pattern, but if any threshold needs to change it requires touching multiple files. A single `src/lib/leadgenConstants.ts` would be the source of truth.

---

### 🟡 Realtime Gaps

**R-1: `useLeadgenMembers`** — No realtime subscription. Adding/removing a team member doesn't update the UI until page refresh.

**R-2: `useLeadgenOverviewStats`** — Subscribes to `lead_updated` but not to member changes, so member workload table doesn't update when a member is added/removed.

---

### 🟡 Console Artifacts

**C-1: `useLeadgenSearches.ts`**
```typescript
console.warn("[leadgen poll]", err);
```
Should set an error state or toast instead of (or in addition to) logging.

---

### 🟡 Stale / Underused Patterns

**U-1: `useLeadgenOutreachEvents`** — Defined hook, but `LeadgenLeadDetail.tsx` fetches outreach events directly via Supabase rather than using it. Hook is only partially adopted.

**U-2: `useLeadgenSummary`** — Accepts an `allLeads` array (not a DB call). Callers must first call `useLeadgenLeads` and pass `allLeads` through. Works, but the two-step pattern is inconsistent with every other hook in the codebase.

---

### 🟡 Fetch Limits

**L-1: `useLeadgenLeads`** — No `.limit()`. For portals with thousands of leads, loads all into memory. Consider cursor/page approach for scale.

**L-2: `useColdLeads`** — `.limit(200)` is arbitrary and undocumented. If more than 200 eligible cold leads exist, scoring misses them silently.

---

## 7. Supabase Tables Used

| Table | Operations |
|-------|-----------|
| `leadgen_leads` | SELECT (heavy — filtered, counted, grouped), UPDATE (status, notes, assignment), INSERT (Apify ingest), DELETE (cleanup) |
| `leadgen_searches` | SELECT, INSERT, UPDATE (status, result counts) |
| `leadgen_members` | SELECT, INSERT, UPDATE |
| `leadgen_settings` | SELECT, UPSERT |
| `leadgen_outreach_events` | INSERT (dominant), SELECT (aging, last-event) |
| `leadgen_lead_notes` | SELECT, INSERT, UPDATE, DELETE |
| `leadgen_blacklist` | SELECT, INSERT, UPDATE, DELETE |
| `user_profiles` | SELECT only (email/avatar enrichment) |

---

## 8. Recommended Fixes — Priority Order

| Priority | Issue | Effort |
|----------|-------|--------|
| 🔴 High | **S-1** — Add `portal_id` filter to `updateMember()` | 1 line |
| 🟠 Medium | **E-1/2/3** — Add error checks in `useColdLeads`, `useFollowUpLeads`, `useHotLeads` | ~10 lines |
| 🟠 Medium | **C-1** — Replace `console.warn` with error state in `useLeadgenSearches` | 5 lines |
| 🟡 Low | **D-1** — Extract skip-map to `src/lib/leadgenSkipTracking.ts` | Refactor |
| 🟡 Low | **D-2** — Extract ownership filter to `src/lib/leadgenFilter.ts` | Refactor |
| 🟡 Low | **R-1** — Add realtime to `useLeadgenMembers` | ~10 lines |
| 🟡 Low | Create `src/lib/leadgenConstants.ts` for all thresholds | 20 lines |
| 🟡 Low | **L-1** — Paginate `useLeadgenLeads` or add lazy load | Architecture |
