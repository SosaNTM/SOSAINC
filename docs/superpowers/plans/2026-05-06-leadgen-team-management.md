# Leadgen Team Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-portal leadgen team membership, lead ownership/pool mechanics, role-based visibility, and a team management settings page to the RedX leadgen module.

**Architecture:** New `leadgen_members` table stores per-portal sales roles (owner/admin/sales) and team (internal/external). `leadgen_leads` gains assignment columns. All existing hooks gain an optional `ownership` filter param. The Settings layout gains a "Team" nav item under Lead Generation, routing to a new `TeamManagement` page. `LeadgenToday` gains a top filter bar (Mine/Pool/All) with member/team selectors for admins, owner chips on cards, a "Prendilo →" claim button for pool cards, and an auto-release notification banner.

**Tech Stack:** React, TypeScript, Supabase JS client, Sonner toasts, Lucide icons, framer-motion (already installed)

---

## File Map

**Create:**
- `supabase/migrations/20260506000001_leadgen_team_management.sql` — DB schema
- `src/hooks/leadgen/useLeadgenMembers.ts` — CRUD + workload + email search
- `src/hooks/leadgen/useAutoRelease.ts` — auto-release inactive leads + notification
- `src/pages/settings/leadgen/TeamManagement.tsx` — team settings page

**Modify:**
- `src/types/leadgen.ts` — add LeadgenMember type, update LeadgenLead + LeadgenOutreachEvent
- `src/hooks/leadgen/useColdLeads.ts` — add ownership filter
- `src/hooks/leadgen/useFollowUpLeads.ts` — add ownership filter
- `src/hooks/leadgen/useHotLeads.ts` — add ownership filter
- `src/hooks/leadgen/useTodayCount.ts` — ownership-aware counts
- `src/pages/settings/SettingsLayout.tsx` — add Team nav item under Lead Generation
- `src/pages/settings/settingsRoutes.tsx` — add leadgen/team route
- `src/pages/leadgen/LeadgenToday.tsx` — view filter bar, owner chips, claim button, auto-release banner
- `src/pages/leadgen/LeadgenLeadDetail.tsx` — Riassegna modal, read-only mode

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260506000001_leadgen_team_management.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ── Leadgen team management schema — idempotent ────────────────────────────────

-- ── 1. leadgen_members ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leadgen_members (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id    UUID        NOT NULL,
  user_id      UUID        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'sales',    -- 'owner' | 'admin' | 'sales'
  team         TEXT        NOT NULL DEFAULT 'internal', -- 'internal' | 'external'
  display_name TEXT,
  active       BOOLEAN     NOT NULL DEFAULT true,
  notes        TEXT,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by     UUID,
  UNIQUE (portal_id, user_id)
);

CREATE INDEX IF NOT EXISTS leadgen_members_portal_idx
  ON public.leadgen_members (portal_id, active);
CREATE INDEX IF NOT EXISTS leadgen_members_user_idx
  ON public.leadgen_members (user_id);

ALTER TABLE public.leadgen_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leadgen_members_all" ON public.leadgen_members;
CREATE POLICY "leadgen_members_all"
  ON public.leadgen_members FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 2. Alter leadgen_leads ────────────────────────────────────────────────────

-- Change assigned_to from TEXT to UUID (safe: all existing values are NULL)
DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ALTER COLUMN assigned_to TYPE UUID USING assigned_to::UUID;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN assigned_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN assigned_by UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN visibility TEXT NOT NULL DEFAULT 'team';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leadgen_leads ADD COLUMN last_activity_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS leadgen_leads_assigned_idx
  ON public.leadgen_leads (portal_id, assigned_to, outreach_status);

CREATE INDEX IF NOT EXISTS leadgen_leads_pool_idx
  ON public.leadgen_leads (portal_id, outreach_status)
  WHERE assigned_to IS NULL;

-- ── 3. Alter leadgen_outreach_events ─────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.leadgen_outreach_events ADD COLUMN user_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
```

- [ ] **Step 2: Apply migration to Supabase**

You have two options:

**Option A — Supabase MCP (if connected):**
Use the `mcp__claude_ai_Supabase__apply_migration` tool with the SQL above.

**Option B — Supabase CLI:**
```bash
npx supabase db push
```

Or paste the SQL directly in the Supabase Dashboard → SQL Editor for the `ndudzfaisulnmbpnvkwo` project.

- [ ] **Step 3: Verify tables exist**

In Supabase Dashboard → Table Editor, confirm:
- `leadgen_members` table exists with all columns
- `leadgen_leads` has columns: `assigned_at`, `assigned_by`, `visibility`, `last_activity_at`; `assigned_to` is type `uuid`
- `leadgen_outreach_events` has `user_id` column

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260506000001_leadgen_team_management.sql
git commit -m "feat(leadgen): add team management schema — leadgen_members table + assignment columns"
```

---

### Task 2: TypeScript types

**Files:**
- Modify: `src/types/leadgen.ts`

- [ ] **Step 1: Add new types and update existing interfaces**

Open `src/types/leadgen.ts`. Replace the entire file with:

```typescript
export type OutreachStatus =
  | "new"
  | "contacted"
  | "replied"
  | "qualified"
  | "converted"
  | "rejected";

export type SearchStatus = "pending" | "running" | "completed" | "failed";
export type OutreachChannel = "email" | "dm_instagram" | "call" | "pec";
export type OutreachDirection = "outbound" | "inbound";

export type LeadgenMemberRole = "owner" | "admin" | "sales";
export type LeadgenMemberTeam = "internal" | "external";
export type LeadgenLeadVisibility = "team" | "internal_only" | "private";

export interface LeadgenMember {
  id: string;
  portal_id: string;
  user_id: string;
  role: LeadgenMemberRole;
  team: LeadgenMemberTeam;
  display_name: string | null;
  active: boolean;
  notes: string | null;
  added_at: string;
  added_by: string | null;
}

export interface LeadgenSettings {
  id: string;
  portal_id: string;
  apify_token: string | null;
  actor_id: string;
  default_country_code: string;
  default_language: string;
  default_max_places: number;
  scrape_contacts: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadgenSearch {
  id: string;
  portal_id: string;
  country_code: string;
  postal_code: string;
  category: string | null;
  categories: string[];
  status: SearchStatus;
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  total_results: number;
  with_website: number;
  without_website: number;
  excluded_count: number;
  discarded_no_contact_count: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface LeadgenLead {
  id: string;
  portal_id: string;
  search_id: string | null;
  place_id: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country_code: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  rating: number | null;
  reviews_count: number | null;
  emails: string[];
  social_media: Record<string, string>;
  has_website: boolean;
  assigned_to: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  visibility: LeadgenLeadVisibility;
  last_activity_at: string | null;
  outreach_status: OutreachStatus;
  outreach_notes: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadgenLeadNote {
  id: string;
  portal_id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface LeadgenOutreachEvent {
  id: string;
  portal_id: string;
  lead_id: string;
  user_id: string | null;
  channel: OutreachChannel;
  direction: OutreachDirection;
  notes: string | null;
  occurred_at: string;
}

export type BlacklistRuleType = "title_keyword" | "website_domain" | "category" | "min_reviews";

export interface LeadgenBlacklist {
  id: string;
  portal_id: string;
  rule_type: BlacklistRuleType;
  rule_value: string;
  active: boolean;
  created_at: string;
}

// Shape returned by Apify Google Maps Scraper dataset items
export interface ApifyPlaceResult {
  placeId: string;
  title: string;
  address: string | null;
  zip: string | null;
  city: string | null;
  countryCode: string | null;
  phone: string | null;
  website: string | null;
  categoryName: string | null;
  categories?: string[] | null;
  totalScore: number | null;
  reviewsCount: number | null;
  emails: string[] | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors (the new fields are all optional or have defaults matching existing data).

- [ ] **Step 3: Commit**

```bash
git add src/types/leadgen.ts
git commit -m "feat(leadgen): add LeadgenMember type, assignment + visibility fields to LeadgenLead"
```

---

### Task 3: `useLeadgenMembers` hook

**Files:**
- Create: `src/hooks/leadgen/useLeadgenMembers.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenMember, LeadgenMemberRole, LeadgenMemberTeam } from "@/types/leadgen";

export interface LeadgenMemberWithProfile extends LeadgenMember {
  email: string;
  avatar_url: string | null;
}

export interface WorkloadEntry {
  total: number;      // all assigned leads
  active: number;     // contacted + replied + qualified
}

export function useLeadgenMembers() {
  const { currentPortalId } = usePortalDB();
  const [members, setMembers] = useState<LeadgenMemberWithProfile[]>([]);
  const [currentMember, setCurrentMember] = useState<LeadgenMember | null>(null);
  const [workload, setWorkload] = useState<Map<string, WorkloadEntry>>(new Map());
  const [poolCount, setPoolCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const [membersRes, workloadRes, poolRes] = await Promise.all([
      supabase
        .from("leadgen_members")
        .select("*")
        .eq("portal_id", currentPortalId)
        .order("added_at"),
      supabase
        .from("leadgen_leads")
        .select("assigned_to, outreach_status")
        .eq("portal_id", currentPortalId)
        .not("assigned_to", "is", null),
      supabase
        .from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "new")
        .is("assigned_to", null),
    ]);

    const rawMembers = (membersRes.data ?? []) as LeadgenMember[];

    // Enrich with profiles
    const userIds = rawMembers.map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await supabase
          .from("user_profiles")
          .select("id, email, avatar_url")
          .in("id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const enriched: LeadgenMemberWithProfile[] = rawMembers.map((m) => ({
      ...m,
      email: profileMap.get(m.user_id)?.email ?? m.user_id,
      avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
    }));

    setMembers(enriched);

    if (user) {
      const own = rawMembers.find((m) => m.user_id === user.id) ?? null;
      setCurrentMember(own);
    }

    // Compute workload map
    const wmap = new Map<string, WorkloadEntry>();
    const ACTIVE_STATUSES = new Set(["contacted", "replied", "qualified"]);
    for (const row of workloadRes.data ?? []) {
      const uid = row.assigned_to as string;
      const entry = wmap.get(uid) ?? { total: 0, active: 0 };
      entry.total += 1;
      if (ACTIVE_STATUSES.has(row.outreach_status)) entry.active += 1;
      wmap.set(uid, entry);
    }
    setWorkload(wmap);
    setPoolCount(poolRes.count ?? 0);

    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const searchByEmail = useCallback(async (email: string): Promise<{ user_id: string; display_name: string | null; email: string } | null> => {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, display_name, email")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (!data) return null;
    return { user_id: data.id, display_name: data.display_name ?? null, email: data.email };
  }, []);

  const addMember = useCallback(async (params: {
    user_id: string;
    role: LeadgenMemberRole;
    team: LeadgenMemberTeam;
    display_name?: string;
  }): Promise<{ error: string | null }> => {
    if (!currentPortalId) return { error: "Nessun portale" };
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("leadgen_members").insert({
      portal_id: currentPortalId,
      user_id: params.user_id,
      role: params.role,
      team: params.team,
      display_name: params.display_name ?? null,
      added_by: user?.id ?? null,
    });
    if (!error) await fetchAll();
    return { error: error?.message ?? null };
  }, [currentPortalId, fetchAll]);

  const updateMember = useCallback(async (id: string, patch: Partial<Pick<LeadgenMember, "role" | "team" | "display_name" | "active" | "notes">>): Promise<{ error: string | null }> => {
    const { error } = await supabase.from("leadgen_members").update(patch).eq("id", id);
    if (!error) await fetchAll();
    return { error: error?.message ?? null };
  }, [fetchAll]);

  const deactivateMember = useCallback(async (id: string): Promise<{ error: string | null }> => {
    return updateMember(id, { active: false });
  }, [updateMember]);

  return {
    members,
    currentMember,
    workload,
    poolCount,
    loading,
    refetch: fetchAll,
    searchByEmail,
    addMember,
    updateMember,
    deactivateMember,
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/leadgen/useLeadgenMembers.ts
git commit -m "feat(leadgen): add useLeadgenMembers hook with CRUD, workload, and email search"
```

---

### Task 4: Update `useColdLeads` — ownership filter

**Files:**
- Modify: `src/hooks/leadgen/useColdLeads.ts`

- [ ] **Step 1: Add ownership filter**

Replace `src/hooks/leadgen/useColdLeads.ts` with:

```typescript
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import type { LeadgenLead } from "@/types/leadgen";

export interface ColdLeadsFilters {
  hasWebsite?: boolean;
  categories?: string[];
  minRating: number;
  minReviews: number;
  cities?: string[];
  orderBy: "score" | "recent" | "reviews" | "rating";
  ownership?: "mine" | "pool" | "all";
}

const SKIP_TTL = 24 * 60 * 60 * 1000;

function skipKey(portalId: string) { return `leadgen_skipped_${portalId}`; }
function getSkipMap(portalId: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(skipKey(portalId)) || "{}"); }
  catch { return {}; }
}
function saveSkipMap(portalId: string, map: Record<string, number>) {
  try { localStorage.setItem(skipKey(portalId), JSON.stringify(map)); } catch { /**/ }
}

function scoreLead(lead: LeadgenLead): number {
  const rating = lead.rating ?? 0;
  const reviews = lead.reviews_count ?? 0;
  const daysOld = (Date.now() - new Date(lead.created_at).getTime()) / 86_400_000;
  return rating * 10 + Math.log10(reviews + 1) * 5 + (lead.has_website ? 0 : 15) + Math.max(0, 10 - daysOld);
}

export function useColdLeads(filters: ColdLeadsFilters) {
  const { currentPortalId } = usePortalDB();
  const [rawLeads, setRawLeads] = useState<LeadgenLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipVersion, setSkipVersion] = useState(0);

  const filterKey = [
    filters.minRating,
    filters.minReviews,
    filters.hasWebsite ?? "any",
    (filters.categories ?? []).slice().sort().join(","),
    (filters.cities ?? []).slice().sort().join(","),
    filters.ownership ?? "all",
  ].join("|");

  const fetchLeads = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setLoading(true);

    let query = supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("outreach_status", "new")
      .gte("rating", filters.minRating)
      .gte("reviews_count", filters.minReviews)
      .limit(200);

    if (filters.hasWebsite !== undefined) query = query.eq("has_website", filters.hasWebsite);
    if (filters.categories?.length) query = query.in("category", filters.categories);
    if (filters.cities?.length) query = query.in("city", filters.cities);

    if (filters.ownership === "pool") {
      query = query.is("assigned_to", null);
    } else if (filters.ownership === "mine") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) query = query.eq("assigned_to", user.id);
    }

    if (filters.orderBy === "recent") query = query.order("created_at", { ascending: false });
    else if (filters.orderBy === "reviews") query = query.order("reviews_count", { ascending: false });
    else if (filters.orderBy === "rating") query = query.order("rating", { ascending: false });
    else query = query.order("rating", { ascending: false });

    const { data } = await query;
    setRawLeads((data ?? []) as LeadgenLead[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPortalId, filterKey]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "search_completed" || event === "lead_updated") fetchLeads();
    });
  }, [fetchLeads]);

  const skipLead = useCallback((leadId: string) => {
    if (!currentPortalId) return;
    const map = getSkipMap(currentPortalId);
    map[leadId] = Date.now();
    saveSkipMap(currentPortalId, map);
    setSkipVersion((v) => v + 1);
  }, [currentPortalId]);

  const removeLead = useCallback((leadId: string) => {
    setRawLeads((prev) => prev.filter((l) => l.id !== leadId));
  }, []);

  const { leads, totalEligibleCount } = useMemo(() => {
    if (!currentPortalId) return { leads: [] as LeadgenLead[], totalEligibleCount: 0 };

    const skipMap = getSkipMap(currentPortalId);
    const now = Date.now();

    for (const id of Object.keys(skipMap)) {
      if (now - skipMap[id] > SKIP_TTL) delete skipMap[id];
    }

    const totalEligibleCount = rawLeads.length;
    const filtered = rawLeads.filter((l) => !skipMap[l.id]);

    let sorted = [...filtered];
    if (filters.orderBy === "score" || !filters.orderBy) {
      sorted = sorted
        .map((l) => ({ lead: l, score: scoreLead(l) }))
        .sort((a, b) => b.score - a.score)
        .map(({ lead }) => lead);
    }

    return { leads: sorted, totalEligibleCount };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawLeads, currentPortalId, skipVersion, filters.orderBy]);

  return { leads, totalEligibleCount, loading, refetch: fetchLeads, skipLead, removeLead };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/leadgen/useColdLeads.ts
git commit -m "feat(leadgen): add ownership filter to useColdLeads (mine/pool/all)"
```

---

### Task 5: Update `useFollowUpLeads` — ownership filter

**Files:**
- Modify: `src/hooks/leadgen/useFollowUpLeads.ts`

- [ ] **Step 1: Add ownership filter**

Replace `src/hooks/leadgen/useFollowUpLeads.ts` with:

```typescript
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import type { LeadgenLead } from "@/types/leadgen";

const CONTACTED_THRESHOLD_DAYS = 7;
const QUALIFIED_THRESHOLD_DAYS = 5;
const SKIP_TTL = 7 * 24 * 60 * 60 * 1000;

export interface FollowUpFilters {
  ownership?: "mine" | "pool" | "all";
}

function skipKey(portalId: string) { return `leadgen_followup_skipped_${portalId}`; }
function getSkipMap(portalId: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(skipKey(portalId)) || "{}"); }
  catch { return {}; }
}
function saveSkipMap(portalId: string, map: Record<string, number>) {
  try { localStorage.setItem(skipKey(portalId), JSON.stringify(map)); } catch { /**/ }
}

export function useFollowUpLeads(filters?: FollowUpFilters) {
  const { currentPortalId } = usePortalDB();
  const [contactedLeads, setContactedLeads] = useState<LeadgenLead[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<LeadgenLead[]>([]);
  const [lastEvents, setLastEvents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [skipVersion, setSkipVersion] = useState(0);

  const ownership = filters?.ownership ?? "all";

  const fetchAll = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setLoading(true);

    let currentUserId: string | undefined;
    if (ownership === "mine") {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    const sevenDaysAgo = new Date(Date.now() - CONTACTED_THRESHOLD_DAYS * 86_400_000).toISOString();

    let contactedQuery = supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("outreach_status", "contacted")
      .lt("contacted_at", sevenDaysAgo)
      .order("contacted_at", { ascending: true });

    let qualifiedQuery = supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("outreach_status", "qualified");

    if (ownership === "mine" && currentUserId) {
      contactedQuery = contactedQuery.eq("assigned_to", currentUserId);
      qualifiedQuery = qualifiedQuery.eq("assigned_to", currentUserId);
    } else if (ownership === "pool") {
      contactedQuery = contactedQuery.is("assigned_to", null);
      qualifiedQuery = qualifiedQuery.is("assigned_to", null);
    }

    const [contactedRes, qualifiedRes] = await Promise.all([contactedQuery, qualifiedQuery]);

    const contacted = (contactedRes.data ?? []) as LeadgenLead[];
    const qualified = (qualifiedRes.data ?? []) as LeadgenLead[];

    setContactedLeads(contacted);
    setQualifiedLeads(qualified);

    if (qualified.length) {
      const ids = qualified.map((l) => l.id);
      const { data: evData } = await supabase
        .from("leadgen_outreach_events")
        .select("lead_id, occurred_at")
        .eq("portal_id", currentPortalId)
        .in("lead_id", ids)
        .order("occurred_at", { ascending: false });

      const latestByLead = new Map<string, string>();
      for (const ev of evData ?? []) {
        if (!latestByLead.has(ev.lead_id)) latestByLead.set(ev.lead_id, ev.occurred_at);
      }
      setLastEvents(latestByLead);
    } else {
      setLastEvents(new Map());
    }

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPortalId, ownership]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetchAll();
    });
  }, [fetchAll]);

  const skipLead = useCallback((leadId: string) => {
    if (!currentPortalId) return;
    const map = getSkipMap(currentPortalId);
    map[leadId] = Date.now();
    saveSkipMap(currentPortalId, map);
    setSkipVersion((v) => v + 1);
  }, [currentPortalId]);

  const removeLead = useCallback((leadId: string) => {
    setContactedLeads((prev) => prev.filter((l) => l.id !== leadId));
    setQualifiedLeads((prev) => prev.filter((l) => l.id !== leadId));
  }, []);

  const { contactedAging, qualifiedAging, total } = useMemo(() => {
    if (!currentPortalId) return { contactedAging: [] as LeadgenLead[], qualifiedAging: [] as LeadgenLead[], total: 0 };

    const skipMap = getSkipMap(currentPortalId);
    const now = Date.now();
    const isSkipped = (id: string) => !!skipMap[id] && now - skipMap[id] < SKIP_TTL;

    const contactedAging = contactedLeads.filter((l) => !isSkipped(l.id));

    const fiveDaysAgo = now - QUALIFIED_THRESHOLD_DAYS * 86_400_000;
    const qualifiedAging = qualifiedLeads.filter((l) => {
      if (isSkipped(l.id)) return false;
      const lastEvAt = lastEvents.get(l.id);
      const refTs = lastEvAt ? new Date(lastEvAt).getTime() : new Date(l.updated_at).getTime();
      return refTs < fiveDaysAgo;
    });

    return { contactedAging, qualifiedAging, total: contactedAging.length + qualifiedAging.length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactedLeads, qualifiedLeads, lastEvents, currentPortalId, skipVersion]);

  return { contactedAging, qualifiedAging, total, loading, refetch: fetchAll, skipLead, removeLead };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/hooks/leadgen/useFollowUpLeads.ts
git commit -m "feat(leadgen): add ownership filter to useFollowUpLeads"
```

---

### Task 6: Update `useHotLeads` — ownership filter

**Files:**
- Modify: `src/hooks/leadgen/useHotLeads.ts`

- [ ] **Step 1: Add ownership filter**

Replace `src/hooks/leadgen/useHotLeads.ts` with:

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import type { LeadgenLead } from "@/types/leadgen";

const HOT_THRESHOLD_DAYS = 2;

export interface HotLead extends LeadgenLead {
  lastInboundAt: string;
  lastInboundNotes: string | null;
  daysAgo: number;
}

export interface HotLeadsFilters {
  ownership?: "mine" | "pool" | "all";
}

export function useHotLeads(filters?: HotLeadsFilters) {
  const { currentPortalId } = usePortalDB();
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [loading, setLoading] = useState(true);

  const ownership = filters?.ownership ?? "all";

  const fetchAll = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    setLoading(true);

    let currentUserId: string | undefined;
    if (ownership === "mine") {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    let query = supabase
      .from("leadgen_leads")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("outreach_status", "replied");

    if (ownership === "mine" && currentUserId) {
      query = query.eq("assigned_to", currentUserId);
    } else if (ownership === "pool") {
      query = query.is("assigned_to", null);
    }

    const { data: leads } = await query;

    if (!leads?.length) { setHotLeads([]); setLoading(false); return; }

    const ids = leads.map((l) => l.id);
    const { data: events } = await supabase
      .from("leadgen_outreach_events")
      .select("lead_id, direction, notes, occurred_at")
      .eq("portal_id", currentPortalId)
      .in("lead_id", ids)
      .order("occurred_at", { ascending: false });

    const evByLead = new Map<string, typeof events>();
    for (const ev of events ?? []) {
      const arr = evByLead.get(ev.lead_id) ?? [];
      arr.push(ev);
      evByLead.set(ev.lead_id, arr);
    }

    const threshold = Date.now() - HOT_THRESHOLD_DAYS * 86_400_000;
    const hot: HotLead[] = [];

    for (const lead of leads as LeadgenLead[]) {
      const leadEvents = evByLead.get(lead.id) ?? [];
      if (!leadEvents.length) continue;

      const lastEvent = leadEvents[0];
      if (lastEvent.direction !== "inbound") continue;

      const lastInboundTs = new Date(lastEvent.occurred_at).getTime();
      if (lastInboundTs > threshold) continue;

      hot.push({
        ...lead,
        lastInboundAt: lastEvent.occurred_at,
        lastInboundNotes: lastEvent.notes ?? null,
        daysAgo: Math.floor((Date.now() - lastInboundTs) / 86_400_000),
      });
    }

    hot.sort((a, b) => new Date(a.lastInboundAt).getTime() - new Date(b.lastInboundAt).getTime());

    setHotLeads(hot);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPortalId, ownership]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetchAll();
    });
  }, [fetchAll]);

  const removeLead = useCallback((leadId: string) => {
    setHotLeads((prev) => prev.filter((l) => l.id !== leadId));
  }, []);

  return { hotLeads, total: hotLeads.length, loading, refetch: fetchAll, removeLead };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/hooks/leadgen/useHotLeads.ts
git commit -m "feat(leadgen): add ownership filter to useHotLeads"
```

---

### Task 7: `useAutoRelease` hook

**Files:**
- Create: `src/hooks/leadgen/useAutoRelease.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { broadcastLeadgenUpdate } from "@/lib/leadgenRealtime";

const AUTO_RELEASE_DAYS = 14;
const SEEN_KEY = (portalId: string) => `leadgen_autoreleased_seen_${portalId}`;

export interface AutoReleaseNotification {
  count: number;
  leadNames: string[];
}

export function useAutoRelease() {
  const { currentPortalId } = usePortalDB();
  const [notification, setNotification] = useState<AutoReleaseNotification | null>(null);

  const runRelease = useCallback(async () => {
    if (!currentPortalId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Find inactive assigned leads
    const { data: staleLeads } = await supabase
      .from("leadgen_leads")
      .select("id, name, assigned_to")
      .eq("portal_id", currentPortalId)
      .in("outreach_status", ["contacted", "replied"])
      .not("assigned_to", "is", null)
      .or(`last_activity_at.lt.${cutoff},and(last_activity_at.is.null,updated_at.lt.${cutoff})`);

    if (!staleLeads?.length) return;

    // Release each lead
    const ids = staleLeads.map((l) => l.id);

    await supabase
      .from("leadgen_leads")
      .update({ assigned_to: null, assigned_at: null, last_activity_at: now })
      .eq("portal_id", currentPortalId)
      .in("id", ids);

    // Insert system events
    const events = staleLeads.map((l) => ({
      portal_id: currentPortalId,
      lead_id: l.id,
      channel: "manual" as const,
      direction: "outbound" as const,
      notes: "Rilasciato automaticamente al pool — inattivo 14 giorni",
      occurred_at: now,
      user_id: null,
    }));
    await supabase.from("leadgen_outreach_events").insert(events);

    broadcastLeadgenUpdate("lead_updated");

    // Notification: only for leads that were assigned to the current user
    const myReleased = staleLeads.filter((l) => l.assigned_to === user.id);
    if (myReleased.length > 0) {
      const lastSeen = localStorage.getItem(SEEN_KEY(currentPortalId));
      // Only notify if we haven't notified for this batch
      if (!lastSeen || new Date(lastSeen).getTime() < Date.now() - 60_000) {
        setNotification({
          count: myReleased.length,
          leadNames: myReleased.map((l) => l.name).slice(0, 3),
        });
      }
    }
  }, [currentPortalId]);

  const dismissNotification = useCallback(() => {
    if (!currentPortalId) return;
    localStorage.setItem(SEEN_KEY(currentPortalId), new Date().toISOString());
    setNotification(null);
  }, [currentPortalId]);

  // Run once on mount
  useEffect(() => { runRelease(); }, [runRelease]);

  return { notification, dismissNotification };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/hooks/leadgen/useAutoRelease.ts
git commit -m "feat(leadgen): add useAutoRelease hook — releases 14-day inactive assigned leads"
```

---

### Task 8: Team Management settings page

**Files:**
- Create: `src/pages/settings/leadgen/TeamManagement.tsx`

- [ ] **Step 1: Create the page**

```typescript
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Search, Users, BarChart2 } from "lucide-react";
import { useLeadgenMembers, type LeadgenMemberWithProfile } from "@/hooks/leadgen/useLeadgenMembers";
import type { LeadgenMemberRole, LeadgenMemberTeam } from "@/types/leadgen";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--text-tertiary)", display: "block", marginBottom: 6,
};

function RoleSelect({ value, onChange }: { value: LeadgenMemberRole; onChange: (v: LeadgenMemberRole) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {(["owner", "admin", "sales"] as const).map((r) => (
        <button key={r} type="button" onClick={() => onChange(r)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 10px", border: `1px solid ${value === r ? "var(--accent-primary)" : "var(--glass-border)"}`, background: value === r ? "var(--accent-primary)" : "transparent", color: value === r ? "#000" : "var(--text-secondary)", cursor: "pointer", textTransform: "capitalize" }}>
          {r}
        </button>
      ))}
    </div>
  );
}

function TeamSelect({ value, onChange }: { value: LeadgenMemberTeam; onChange: (v: LeadgenMemberTeam) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {(["internal", "external"] as const).map((t) => (
        <button key={t} type="button" onClick={() => onChange(t)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 10px", border: `1px solid ${value === t ? "var(--accent-primary)" : "var(--glass-border)"}`, background: value === t ? "var(--accent-primary)" : "transparent", color: value === t ? "#000" : "var(--text-secondary)", cursor: "pointer", textTransform: "capitalize" }}>
          {t === "internal" ? "Interno" : "Esterno"}
        </button>
      ))}
    </div>
  );
}

// ── Add modal ─────────────────────────────────────────────────────────────────

function AddMemberModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { searchByEmail, addMember, members } = useLeadgenMembers();
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<{ user_id: string; display_name: string | null; email: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [role, setRole] = useState<LeadgenMemberRole>("sales");
  const [team, setTeam] = useState<LeadgenMemberTeam>("internal");
  const [saving, setSaving] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!email.trim()) return;
    setSearching(true);
    setFound(null);
    setNotFound(false);
    const result = await searchByEmail(email.trim());
    setSearching(false);
    if (!result) { setNotFound(true); return; }
    // Check not already a member
    const alreadyMember = members.some((m) => m.user_id === result.user_id);
    if (alreadyMember) { toast.error("Questo utente è già nel team"); return; }
    setFound(result);
  }, [email, searchByEmail, members]);

  const handleAdd = useCallback(async () => {
    if (!found) return;
    setSaving(true);
    const { error } = await addMember({ user_id: found.user_id, role, team, display_name: found.display_name ?? undefined });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(`${found.display_name ?? found.email} aggiunto al team`);
    onAdded();
    onClose();
  }, [found, role, team, addMember, onAdded, onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "var(--sosa-bg)", border: "1.5px solid var(--glass-border)", width: "100%", maxWidth: 440, padding: 28 }}
        onClick={(e) => e.stopPropagation()}>
        <p style={{ ...MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>Lead Generation</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Aggiungi membro al team</h2>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Email utente SOSA</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
              className="glass-input" style={{ flex: 1 }} placeholder="mario@example.com"
            />
            <button type="button" onClick={handleSearch} disabled={searching || !email.trim()} className="btn-glass-ds"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              {searching ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={12} />}
              Cerca
            </button>
          </div>
        </div>

        {notFound && (
          <div style={{ ...MONO, fontSize: 12, color: "var(--color-error)", marginBottom: 16 }}>
            Nessun utente con questa email. L'utente deve registrarsi su SOSA prima di essere aggiunto.
          </div>
        )}

        {found && (
          <>
            <div style={{ padding: "10px 14px", background: "color-mix(in srgb, var(--color-success) 10%, transparent)", border: "1px solid var(--color-success)", marginBottom: 20, ...MONO, fontSize: 12, color: "var(--color-success)" }}>
              ✓ Trovato: {found.email}{found.display_name ? ` (${found.display_name})` : ""}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Ruolo</label>
              <RoleSelect value={role} onChange={setRole} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Team</label>
              <TeamSelect value={team} onChange={setTeam} />
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="btn-glass-ds">Annulla</button>
          {found && (
            <button type="button" onClick={handleAdd} disabled={saving} className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              Aggiungi al team
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditMemberModal({ member, onClose, onSaved }: {
  member: LeadgenMemberWithProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { updateMember, deactivateMember, members, currentMember } = useLeadgenMembers();
  const [role, setRole] = useState<LeadgenMemberRole>(member.role);
  const [team, setTeam] = useState<LeadgenMemberTeam>(member.team);
  const [displayName, setDisplayName] = useState(member.display_name ?? "");
  const [notes, setNotes] = useState(member.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const isLastOwner = member.role === "owner" && members.filter((m) => m.role === "owner" && m.active).length <= 1;
  const isSelf = currentMember?.id === member.id;

  const handleSave = useCallback(async () => {
    setSaving(true);
    const { error } = await updateMember(member.id, {
      role, team,
      display_name: displayName.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success("Membro aggiornato");
    onSaved();
    onClose();
  }, [member.id, role, team, displayName, notes, updateMember, onSaved, onClose]);

  const handleDeactivate = useCallback(async () => {
    if (isSelf) { toast.error("Non puoi disattivare te stesso"); return; }
    if (isLastOwner) { toast.error("Non puoi rimuovere l'unico owner. Cedi il ruolo a un altro membro prima."); return; }
    setDeactivating(true);
    const { error } = await deactivateMember(member.id);
    setDeactivating(false);
    if (error) { toast.error(error); return; }
    toast.success(`${member.display_name ?? member.email} disattivato`);
    onSaved();
    onClose();
  }, [isSelf, isLastOwner, member.id, member.display_name, member.email, deactivateMember, onSaved, onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "var(--sosa-bg)", border: "1.5px solid var(--glass-border)", width: "100%", maxWidth: 440, padding: 28 }}
        onClick={(e) => e.stopPropagation()}>
        <p style={{ ...MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>Modifica membro</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          {member.display_name ?? member.email}
        </h2>
        <p style={{ ...MONO, fontSize: 11, color: "var(--text-tertiary)", marginBottom: 24 }}>{member.email}</p>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Display name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="glass-input" style={{ width: "100%" }} placeholder={member.email} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Ruolo</label>
          {isLastOwner && role === "owner" ? (
            <p style={{ ...MONO, fontSize: 11, color: "var(--text-tertiary)" }}>Unico owner — non è possibile declassare</p>
          ) : (
            <RoleSelect value={role} onChange={setRole} />
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Team</label>
          <TeamSelect value={team} onChange={setTeam} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Note interne</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="glass-input" style={{ width: "100%", minHeight: 70, resize: "vertical" }}
            placeholder="Visibili solo agli admin" />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button type="button" onClick={handleDeactivate} disabled={deactivating || isSelf || isLastOwner}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "7px 14px", border: "1px solid var(--color-error)", background: "transparent", color: "var(--color-error)", cursor: (isSelf || isLastOwner) ? "not-allowed" : "pointer", opacity: (isSelf || isLastOwner) ? 0.4 : 1 }}>
            {deactivating ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> : "Disattiva"}
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-glass-ds">Annulla</button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Workload bar ──────────────────────────────────────────────────────────────

function WorkloadBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ width: 120, height: 4, background: "var(--glass-border)", flexShrink: 0 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-primary)", transition: "width 0.3s" }} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamManagement() {
  const { members, workload, poolCount, loading, refetch } = useLeadgenMembers();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LeadgenMemberWithProfile | null>(null);

  const activeMembers = members.filter((m) => m.active);
  const maxWorkload = Math.max(1, ...Array.from(workload.values()).map((w) => w.total));

  if (loading) {
    return <div style={{ padding: 32, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-tertiary)" }}>Caricamento...</div>;
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Team Lead Generation
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
            Gestisci ruoli e visibilità per il modulo lead generation.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <Plus size={13} /> Aggiungi
        </button>
      </div>

      {/* Members section */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Users size={14} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
            Membri ({activeMembers.length})
          </span>
        </div>

        <div style={{ border: "0.5px solid var(--glass-border)" }}>
          {activeMembers.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>
              Nessun membro. Aggiungi qualcuno con il bottone in alto.
            </div>
          )}
          {activeMembers.map((member, i) => (
            <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderTop: i > 0 ? "0.5px solid var(--glass-border)" : "none" }}>
              <div style={{ width: 32, height: 32, background: "var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
                  {(member.display_name ?? member.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {member.display_name ?? member.email}
                  {member.team === "external" && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", marginLeft: 6 }}>(est.)</span>}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)} · {member.team === "internal" ? "Interno" : "Esterno"}
                </p>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 8px", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
                Attivo
              </span>
              <button onClick={() => setEditing(member)} className="btn-glass-ds"
                style={{ fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
                Modifica
              </button>
            </div>
          ))}
        </div>

        {/* Inactive members */}
        {members.filter((m) => !m.active).length > 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginTop: 10 }}>
            {members.filter((m) => !m.active).length} membri disattivati nascosti.
          </p>
        )}
      </div>

      {/* Workload section */}
      <div style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <BarChart2 size={14} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
            Carico di lavoro
          </span>
        </div>

        <div style={{ border: "0.5px solid var(--glass-border)" }}>
          {activeMembers.map((member, i) => {
            const w = workload.get(member.user_id) ?? { total: 0, active: 0 };
            return (
              <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderTop: i > 0 ? "0.5px solid var(--glass-border)" : "none" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {member.display_name ?? member.email}
                </span>
                <WorkloadBar value={w.total} max={maxWorkload} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                  {w.total} lead ({w.active} attivi)
                </span>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderTop: "0.5px solid var(--glass-border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", width: 140, flexShrink: 0 }}>Pool</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
              {poolCount} lead non assegnati
            </span>
          </div>
        </div>
      </div>

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); refetch(); }} />}
      {editing && <EditMemberModal member={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/settings/leadgen/TeamManagement.tsx
git commit -m "feat(leadgen): add Team Management settings page with member list, add/edit modals, workload view"
```

---

### Task 9: Wire settings route and sidebar nav

**Files:**
- Modify: `src/pages/settings/settingsRoutes.tsx`
- Modify: `src/pages/settings/SettingsLayout.tsx`

- [ ] **Step 1: Add route to `settingsRoutes.tsx`**

In `src/pages/settings/settingsRoutes.tsx`, after the existing `LeadgenSettingsPage` lazy import, add:

```typescript
const LeadgenTeamPage = React.lazy(() => import("./leadgen/TeamManagement"));
```

Then in the JSX, inside the `{/* Lead Generation — REDX only */}` comment block, after the existing `leadgen/impostazioni` route, add:

```tsx
<Route path="leadgen/team" element={<SLazy><LeadgenTeamPage /></SLazy>} />
```

The full REDX section should look like:
```tsx
{/* Lead Generation — REDX only */}
<Route path="leadgen/impostazioni"  element={<SLazy><LeadgenSettingsPage /></SLazy>} />
<Route path="leadgen/team"          element={<SLazy><LeadgenTeamPage /></SLazy>} />
```

- [ ] **Step 2: Add nav item to `SettingsLayout.tsx`**

In `src/pages/settings/SettingsLayout.tsx`, find the REDX-only Lead Generation section. It currently has only one nav item. Add a second:

```tsx
{portal?.id === "redx" && (
  <div style={{ marginBottom: 14 }}>
    <div style={{ height: 1, background: "var(--divider)", margin: "16px 8px 14px" }} />
    <p style={{
      fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
      textTransform: "uppercase", letterSpacing: "0.08em",
      color: "var(--text-tertiary)",
      padding: "0 8px 6px",
    }}>LEAD GENERATION</p>
    <SidebarNavItem item={{ title: "API & Token",  path: "leadgen/impostazioni", icon: Crosshair }} />
    <SidebarNavItem item={{ title: "Team",         path: "leadgen/team",          icon: Users      }} />
  </div>
)}
```

You'll need to add `Users` to the lucide import at the top of `SettingsLayout.tsx`:
```typescript
import {
  TrendingUp, TrendingDown, RefreshCw, CreditCard,
  Repeat, Columns3, Tags, FileStack, Share2, CalendarClock,
  Layers, Bell, AlertTriangle, Trash2, Settings2, Crosshair, Users,
} from "lucide-react";
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify in browser**

Navigate to `/redx/settings/leadgen/impostazioni` — confirm settings sidebar shows "Team" link under LEAD GENERATION.
Navigate to `/redx/settings/leadgen/team` — confirm the team management page renders.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/settingsRoutes.tsx src/pages/settings/SettingsLayout.tsx
git commit -m "feat(leadgen): add Team settings route and sidebar nav item"
```

---

### Task 10: `LeadgenToday` — ownership filter bar, owner chips, claim button, auto-release banner

**Files:**
- Modify: `src/pages/leadgen/LeadgenToday.tsx`

This is the largest UI change. Apply changes in order.

- [ ] **Step 1: Add imports**

At the top of `LeadgenToday.tsx`, add these imports (after the existing ones):

```typescript
import { useLeadgenMembers, type LeadgenMemberWithProfile } from "@/hooks/leadgen/useLeadgenMembers";
import { useAutoRelease } from "@/hooks/leadgen/useAutoRelease";
import type { FollowUpFilters } from "@/hooks/leadgen/useFollowUpLeads";
import type { HotLeadsFilters } from "@/hooks/leadgen/useHotLeads";
import { AlertTriangle } from "lucide-react";
```

- [ ] **Step 2: Add `OwnerChip` helper component**

After the `Chip` component, add:

```typescript
function OwnerChip({ lead, members, currentUserId }: {
  lead: LeadgenLead;
  members: LeadgenMemberWithProfile[];
  currentUserId: string | null;
}) {
  if (!lead.assigned_to) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", padding: "1px 6px", background: "var(--glass-border)", color: "var(--text-tertiary)" }}>
        POOL
      </span>
    );
  }
  if (lead.assigned_to === currentUserId) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", padding: "1px 6px", background: "var(--accent-primary)", color: "#000" }}>
        MIO
      </span>
    );
  }
  const owner = members.find((m) => m.user_id === lead.assigned_to);
  const label = owner ? (owner.display_name ?? owner.email).split(" ")[0].substring(0, 8).toUpperCase() : "ALTRO";
  return (
    <span title={owner?.email} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", padding: "1px 6px", background: "var(--glass-border)", color: "var(--text-secondary)" }}>
      {label}
    </span>
  );
}
```

- [ ] **Step 3: Add `AutoReleaseBanner` component**

After `OwnerChip`, add:

```typescript
function AutoReleaseBanner({ count, leadNames, onDismiss }: {
  count: number;
  leadNames: string[];
  onDismiss: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "color-mix(in srgb, var(--color-warning) 10%, transparent)", border: "1px solid var(--color-warning)", marginBottom: 20 }}>
      <AlertTriangle size={14} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          {count} {count === 1 ? "tuo lead è tornato" : "tuoi lead sono tornati"} nel pool per inattività (&gt;14 giorni)
        </p>
        {leadNames.length > 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
            {leadNames.join(", ")}{count > leadNames.length ? ` e altri ${count - leadNames.length}` : ""}
          </p>
        )}
      </div>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0, padding: 0 }}>
        Chiudi
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Update `ColdCard` to accept ownership-aware props**

Replace the `ColdCard` function signature and the "Contattato ✓" button logic:

```typescript
function ColdCard({
  lead, prefix, onMarked, onSkipped, isPool, members, currentUserId,
}: {
  lead: LeadgenLead;
  prefix: string;
  onMarked: (id: string) => void;
  onSkipped: (id: string) => void;
  isPool: boolean;
  members: LeadgenMemberWithProfile[];
  currentUserId: string | null;
}) {
  const navigate = useNavigate();
  const { currentPortalId } = usePortalDB();
  const [marking, setMarking] = useState(false);

  const handleContacted = useCallback(async () => {
    if (!currentPortalId || marking) return;
    setMarking(true);
    const now = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    if (isPool && user) {
      // Claim from pool — optimistic lock: only update if still unassigned
      const { data: updated } = await supabase
        .from("leadgen_leads")
        .update({
          outreach_status: "contacted",
          contacted_at: now,
          assigned_to: user.id,
          assigned_at: now,
          assigned_by: user.id,
          last_activity_at: now,
          updated_at: now,
        })
        .eq("portal_id", currentPortalId)
        .eq("id", lead.id)
        .is("assigned_to", null)
        .select("id");

      if (!updated?.length) {
        setMarking(false);
        toast.error("Lead già preso da qualcun altro");
        return;
      }

      await supabase.from("leadgen_outreach_events").insert({
        portal_id: currentPortalId, lead_id: lead.id,
        channel: "call", direction: "outbound" as const,
        notes: "Preso dal pool", occurred_at: now, user_id: user.id,
      });
    } else {
      await Promise.all([
        supabase.from("leadgen_leads")
          .update({ outreach_status: "contacted", contacted_at: now, last_activity_at: now, updated_at: now })
          .eq("portal_id", currentPortalId).eq("id", lead.id),
        supabase.from("leadgen_outreach_events")
          .insert({ portal_id: currentPortalId, lead_id: lead.id, channel: "call", direction: "outbound" as const, occurred_at: now, user_id: user?.id ?? null }),
      ]);
    }

    broadcastLeadgenUpdate("lead_updated", { leadId: lead.id });
    toast.success(isPool ? `${lead.name} preso — ora è tuo` : `${lead.name} segnato come contattato`);
    onMarked(lead.id);
  }, [currentPortalId, lead.id, lead.name, marking, onMarked, isPool]);

  return (
    <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", display: "flex", flexDirection: "column" }}>
      {/* Hero placeholder */}
      <div style={{ height: 80, background: "var(--sosa-bg-2)", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900, color: "var(--text-tertiary)", letterSpacing: "0.05em", opacity: 0.3 }}>
          {lead.name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Name + chips row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minWidth: 0 }}>
          <span title={lead.name}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 }}>
            {lead.name}
          </span>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <OwnerChip lead={lead} members={members} currentUserId={currentUserId} />
            {!lead.has_website && <Chip accent>NO SITO</Chip>}
          </div>
        </div>

        {/* Stars + reviews */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Stars rating={lead.rating} />
          {lead.reviews_count != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
              ({lead.reviews_count} rec.)
            </span>
          )}
        </div>

        {/* Category + city */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {lead.category && <Chip>{lead.category}</Chip>}
          {lead.city && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
              {lead.city}
            </span>
          )}
        </div>

        {/* Contact info */}
        {(lead.phone || lead.emails?.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {lead.phone && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <Phone size={10} /> {lead.phone}
              </span>
            )}
            {lead.emails?.[0] && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <Mail size={10} /> {lead.emails[0]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", borderTop: "1px solid var(--glass-border)" }}>
        <button onClick={() => navigate(`${prefix}/leadgen/lead/${lead.id}`)}
          style={{ flex: 1, padding: "9px 0", background: "none", border: "none", borderRight: "1px solid var(--glass-border)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <ExternalLink size={11} /> Apri
        </button>
        <button onClick={handleContacted} disabled={marking}
          style={{ flex: 2, padding: "9px 0", background: marking ? "rgba(212,255,0,0.3)" : "var(--accent-primary)", border: "none", borderRight: "1px solid var(--glass-border)", cursor: marking ? "default" : "pointer", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <UserCheck size={11} />
          {marking ? "..." : isPool ? "Prendilo →" : "Contattato ✓"}
        </button>
        <button onClick={() => onSkipped(lead.id)} title="Salta per 24h"
          style={{ flex: 1, padding: "9px 0", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SkipForward size={12} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add view filter state to `ColdTab`**

Update `ColdTab` to accept view/member/team props and thread them through to `ColdCard` and `useColdLeads`:

```typescript
function ColdTab({ prefix, ownership, members, currentUserId }: {
  prefix: string;
  ownership: "mine" | "pool" | "all";
  members: LeadgenMemberWithProfile[];
  currentUserId: string | null;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const dtType     = (searchParams.get("type") as "no_website" | "with_website" | "all") ?? "no_website";
  const dtRating   = searchParams.get("minrating") ?? "4.0";
  const dtReviews  = searchParams.get("minreviews") ?? "20";
  const dtOrder    = (searchParams.get("order") as ColdLeadsFilters["orderBy"]) ?? "score";

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      return next;
    }, { replace: true });
  }

  const filters = useMemo((): ColdLeadsFilters => ({
    hasWebsite: dtType === "with_website" ? true : dtType === "no_website" ? false : undefined,
    minRating: dtRating === "any" ? 0 : parseFloat(dtRating),
    minReviews: dtReviews === "any" ? 0 : parseInt(dtReviews, 10),
    orderBy: dtOrder,
    ownership,
  }), [dtType, dtRating, dtReviews, dtOrder, ownership]);

  const { leads, totalEligibleCount, loading, skipLead, removeLead } = useColdLeads(filters);

  const handleSkip = useCallback((id: string) => {
    const lead = leads.find((l) => l.id === id);
    skipLead(id);
    if (lead) toast.success(`${lead.name} saltato per 24h`);
  }, [leads, skipLead]);

  const visible = leads.slice(0, visibleCount);
  const hasMore = leads.length > visibleCount;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Sito</span>
          <PillGroup options={TYPE_OPTS} value={dtType} onChange={(v) => { setParam("type", v); setVisibleCount(PAGE_SIZE); }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Min ★</span>
          <PillGroup options={RATING_OPTS} value={dtRating as typeof RATING_OPTS[number]["value"]} onChange={(v) => { setParam("minrating", v); setVisibleCount(PAGE_SIZE); }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Rec.</span>
          <PillGroup options={REVIEWS_OPTS} value={dtReviews as typeof REVIEWS_OPTS[number]["value"]} onChange={(v) => { setParam("minreviews", v); setVisibleCount(PAGE_SIZE); }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Ordine</span>
          <select value={dtOrder} onChange={(e) => setParam("order", e.target.value)}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", padding: "3px 8px", cursor: "pointer" }}>
            {ORDER_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>
          {loading ? "..." : `${leads.length} lead${totalEligibleCount !== leads.length ? ` di ${totalEligibleCount}` : ""}`}
        </span>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", padding: "40px 0", textAlign: "center" }}>Caricamento...</div>
      ) : leads.length === 0 ? (
        <EmptyState tab="cold" totalEligible={totalEligibleCount} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 24 }}>
            <AnimatePresence mode="popLayout">
              {visible.map((lead) => (
                <motion.div key={lead.id} layout exit={{ x: 80, opacity: 0, transition: { duration: 0.2 } }}>
                  <ColdCard
                    lead={lead}
                    prefix={prefix}
                    isPool={ownership === "pool"}
                    members={members}
                    currentUserId={currentUserId}
                    onMarked={(id) => { removeLead(id); if (visibleCount > PAGE_SIZE) setVisibleCount((v) => Math.max(PAGE_SIZE, v - 1)); }}
                    onSkipped={(id) => { handleSkip(id); }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {hasMore && (
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <button onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, padding: "9px 28px", border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", letterSpacing: "0.06em" }}>
                Mostra altri {Math.min(PAGE_SIZE, leads.length - visibleCount)}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Update `LeadgenToday` root component**

Replace the `LeadgenToday` default export with:

```typescript
const VIEW_OPTS = [
  { value: "mine" as const,  label: "I miei"  },
  { value: "pool" as const,  label: "Pool"    },
  { value: "all"  as const,  label: "Tutti"   },
];

export default function LeadgenToday() {
  const { portal } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = portal?.id ? `/${portal.id}` : "";

  const lastHotVisitRef = useRef<number>(0);

  const { members, currentMember } = useLeadgenMembers();
  const { notification, dismissNotification } = useAutoRelease();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const isLeadgenAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";

  const view = (searchParams.get("view") as "mine" | "pool" | "all") ?? "all";

  function setView(v: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", v);
      return next;
    }, { replace: true });
  }

  const ownershipFilter: "mine" | "pool" | "all" = view;
  const followUpFilters: FollowUpFilters = { ownership: ownershipFilter };
  const hotFilters: HotLeadsFilters = { ownership: ownershipFilter };

  const { hotLeads } = useHotLeads(hotFilters);
  const { total: followupTotal } = useFollowUpLeads(followUpFilters);
  const coldFilters = useMemo((): ColdLeadsFilters => {
    const dtType = (searchParams.get("type") as "no_website" | "with_website" | "all") ?? "no_website";
    const dtRating = searchParams.get("minrating") ?? "4.0";
    const dtReviews = searchParams.get("minreviews") ?? "20";
    return {
      hasWebsite: dtType === "with_website" ? true : dtType === "no_website" ? false : undefined,
      minRating: dtRating === "any" ? 0 : parseFloat(dtRating),
      minReviews: dtReviews === "any" ? 0 : parseInt(dtReviews, 10),
      orderBy: (searchParams.get("order") as ColdLeadsFilters["orderBy"]) ?? "score",
      ownership: ownershipFilter,
    };
  }, [searchParams, ownershipFilter]);
  const { leads: coldLeads } = useColdLeads(coldFilters);

  const activeTab = (searchParams.get("tab") as "cold" | "followup" | "hot") ?? "cold";

  function setTab(tab: string) {
    if (tab === "hot") lastHotVisitRef.current = Date.now();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  }

  const hotCount = hotLeads.length;
  const showHotPulse = hotCount > 0 && activeTab !== "hot" && Date.now() - lastHotVisitRef.current > 3_600_000;

  const tabs = [
    { id: "cold",     label: "Da contattare", count: coldLeads.length },
    { id: "followup", label: "Follow-up",      count: followupTotal },
    { id: "hot",      label: "Caldi",          count: hotCount, urgent: hotCount > 0 },
  ];

  const totalActions = coldLeads.length + followupTotal + hotCount;

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Auto-release notification */}
      {notification && (
        <AutoReleaseBanner
          count={notification.count}
          leadNames={notification.leadNames}
          onDismiss={dismissNotification}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Da Fare Oggi
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
          {totalActions > 0 ? `${totalActions} azioni in coda` : "Nessuna azione in coda — ottimo lavoro."}
        </p>
      </div>

      {/* View filter bar */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 0 }}>
        <PillGroup options={VIEW_OPTS} value={view} onChange={setView} />
        {isLeadgenAdmin && members.length > 1 && (
          <select
            defaultValue=""
            onChange={(e) => {
              const uid = e.target.value;
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (uid) next.set("member", uid); else next.delete("member");
                return next;
              }, { replace: true });
            }}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", padding: "3px 8px", cursor: "pointer" }}>
            <option value="">Membro: Tutti</option>
            {members.filter((m) => m.active).map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.display_name ?? m.email}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--glass-border)", marginBottom: 24 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: isActive ? 700 : 400, padding: "10px 20px", border: "none", borderBottom: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent", background: "transparent", color: isActive ? "var(--text-primary)" : "var(--text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, letterSpacing: "0.04em", position: "relative" }}>
              {tab.label}
              {tab.count > 0 && (
                <span className={showHotPulse && tab.id === "hot" ? "animate-pulse" : ""}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, padding: "1px 6px", background: tab.urgent ? "var(--color-warning)" : "var(--glass-border)", color: tab.urgent ? "#000" : "var(--text-primary)" }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content — all mounted, CSS hidden */}
      <div style={{ display: activeTab === "cold" ? "block" : "none" }}>
        <ColdTab
          prefix={prefix}
          ownership={ownershipFilter}
          members={members}
          currentUserId={currentUserId}
        />
      </div>
      <div style={{ display: activeTab === "followup" ? "block" : "none" }}>
        <FollowUpTab prefix={prefix} ownership={ownershipFilter} />
      </div>
      <div style={{ display: activeTab === "hot" ? "block" : "none" }}>
        <HotTab prefix={prefix} ownership={ownershipFilter} />
      </div>
    </div>
  );
}
```

Note: `FollowUpTab` and `HotTab` need their signatures updated to accept `ownership` prop and pass it to their respective hooks. Update `FollowUpTab`:

```typescript
function FollowUpTab({ prefix, ownership }: { prefix: string; ownership: "mine" | "pool" | "all" }) {
  const { contactedAging, qualifiedAging, total, loading, skipLead, removeLead } = useFollowUpLeads({ ownership });
  // ... rest of the function unchanged
}
```

And `HotTab`:

```typescript
function HotTab({ prefix, ownership }: { prefix: string; ownership: "mine" | "pool" | "all" }) {
  const { hotLeads, total, loading, removeLead } = useHotLeads({ ownership });
  // ... rest of the function unchanged
}
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Fix any type errors (likely: FollowUpTab/HotTab prop types, unused imports).

- [ ] **Step 8: Commit**

```bash
git add src/pages/leadgen/LeadgenToday.tsx
git commit -m "feat(leadgen): add ownership filter bar, owner chips, Prendilo claim button, auto-release banner"
```

---

### Task 11: `LeadgenLeadDetail` — Riassegna modal + read-only mode

**Files:**
- Modify: `src/pages/leadgen/LeadgenLeadDetail.tsx`

- [ ] **Step 1: Add imports**

At the top of `LeadgenLeadDetail.tsx`, add:

```typescript
import { useLeadgenMembers, type LeadgenMemberWithProfile } from "@/hooks/leadgen/useLeadgenMembers";
import { Lock } from "lucide-react";
```

- [ ] **Step 2: Add `ReassignModal` component**

Add before the `LeadgenLeadDetail` default export:

```typescript
function ReassignModal({ lead, members, onClose, onSaved }: {
  lead: LeadgenLead;
  members: LeadgenMemberWithProfile[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { currentPortalId } = usePortalDB();
  const [selectedUserId, setSelectedUserId] = useState(lead.assigned_to ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPortalId) return;
    setSaving(true);
    const now = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    const isRelease = selectedUserId === "";

    await supabase.from("leadgen_leads").update({
      assigned_to: isRelease ? null : selectedUserId,
      assigned_at: isRelease ? null : now,
      assigned_by: user?.id ?? null,
      last_activity_at: now,
    }).eq("portal_id", currentPortalId).eq("id", lead.id);

    const targetMember = members.find((m) => m.user_id === selectedUserId);
    await supabase.from("leadgen_outreach_events").insert({
      portal_id: currentPortalId,
      lead_id: lead.id,
      channel: "manual" as const,
      direction: "outbound" as const,
      notes: isRelease
        ? "Rilasciato al pool dall'admin"
        : `Riassegnato a ${targetMember?.display_name ?? targetMember?.email ?? selectedUserId}`,
      occurred_at: now,
      user_id: user?.id ?? null,
    });

    broadcastLeadgenUpdate("lead_updated", { leadId: lead.id });
    toast.success(isRelease ? "Lead rilasciato al pool" : "Lead riassegnato");
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "var(--sosa-bg)", border: "1.5px solid var(--glass-border)", width: "100%", maxWidth: 400, padding: 28 }}
        onClick={(e) => e.stopPropagation()}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>Riassegnazione</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>{lead.name}</h2>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>
            Assegna a
          </label>
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}
            className="glass-input" style={{ width: "100%" }}>
            <option value="">— Pool (non assegnato)</option>
            {members.filter((m) => m.active).map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name ?? m.email} ({m.role})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="btn-glass-ds">Annulla</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
```

Note: You need to import `Loader2` if not already imported. Check existing imports in `LeadgenLeadDetail.tsx` and add if missing.

- [ ] **Step 3: Add ownership state inside `LeadgenLeadDetail`**

Inside the `LeadgenLeadDetail` function, after the existing state declarations, add:

```typescript
const { members, currentMember } = useLeadgenMembers();
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [showReassign, setShowReassign] = useState(false);

useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
}, []);

const isLeadgenAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";
const isMine = !!lead?.assigned_to && lead.assigned_to === currentUserId;
const readOnly = !!lead?.assigned_to && !isMine && !isLeadgenAdmin;
```

- [ ] **Step 4: Add read-only banner and Riassegna button**

In the return JSX, after the "Back" button and before the hero header, add the read-only banner:

```tsx
{readOnly && (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "color-mix(in srgb, var(--glass-border) 50%, transparent)", border: "0.5px solid var(--glass-border)", marginBottom: 20 }}>
    <Lock size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
      {(() => {
        const owner = members.find((m) => m.user_id === lead.assigned_to);
        return `Lead di ${owner?.display_name ?? owner?.email ?? "un altro membro"}. Solo lui può modificarne lo stato.`;
      })()}
    </span>
  </div>
)}
```

In the hero header area, add "Riassegna" button for admins (after the existing status badge):

```tsx
{isLeadgenAdmin && (
  <button
    onClick={() => setShowReassign(true)}
    className="btn-glass-ds"
    style={{ fontSize: 10, marginTop: 8 }}
  >
    Riassegna
  </button>
)}
```

At the bottom of the return, before the closing `</div>`, add the modal:

```tsx
{showReassign && lead && (
  <ReassignModal
    lead={lead}
    members={members}
    onClose={() => setShowReassign(false)}
    onSaved={refetchLead}
  />
)}
```

Note: `refetchLead` must be a callback that re-fetches the lead from Supabase to reflect the new assignment. Check `LeadgenLeadDetail.tsx` for the existing fetch mechanism — add a `refetch` function if not already present.

- [ ] **Step 5: Disable action buttons in read-only mode**

Find all status-change buttons in `LeadgenLeadDetail.tsx` (e.g., "Contattato", "Qualificato", "Convertito", outreach event forms). Add `disabled={readOnly}` to each and change their style when `readOnly`:

```tsx
// Example pattern for status buttons:
<button
  disabled={readOnly || saving}
  style={{
    ...(readOnly ? { opacity: 0.4, cursor: "not-allowed" } : {}),
    // existing styles
  }}
>
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Fix any errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/leadgen/LeadgenLeadDetail.tsx
git commit -m "feat(leadgen): add Riassegna modal and read-only mode for non-owner lead detail"
```

---

### Final: Lint + type-check clean pass

- [ ] **Run lint and type-check**

```bash
npm run lint
npx tsc --noEmit
```

Fix any warnings or errors.

- [ ] **Final commit if any fixes**

```bash
git add -A
git commit -m "chore(leadgen): fix lint and type errors from team management feature"
```

---

## Self-review

**Spec coverage check:**

| Spec section | Task coverage |
|---|---|
| §2.1 `leadgen_members` table | Task 1 |
| §2.2 `leadgen_leads` new columns | Task 1 |
| §2.3 `leadgen_outreach_events.user_id` | Task 1 |
| §3 RLS | Tasks 1 + app-layer in hooks/UI. Note: permissive RLS kept (matches project pattern); role logic is enforced in JS |
| §4.1 Pool default state | Existing: `assigned_to=null` on upsert |
| §4.2 Self-claim with optimistic lock | Task 10 Step 4 (ColdCard claim logic) |
| §4.3 Auto-release 14-day | Task 7 |
| §4.4 Manual transfer Admin only | Task 11 |
| §5.1 LeadgenToday view filter bar | Task 10 Step 6 |
| §5.2 Owner chip on cards | Task 10 Steps 2+4 |
| §5.3 "Prendilo →" in pool view | Task 10 Step 4 |
| §5.4 Auto-release banner | Task 10 Steps 3+6 |
| §6 Settings page `/leadgen/team` | Tasks 8+9 |
| §6.1 Member list | Task 8 |
| §6.2 Add member flow | Task 8 (AddMemberModal) |
| §6.3 Workload view | Task 8 (WorkloadBar section) |
| §7.1 `useLeadgenMembers` | Task 3 |
| §7.2 Update hooks | Tasks 4+5+6 |
| §7.3 `useAutoReleasedNotification` | Task 7 |
| §8.1 Owner remove self blocked | Task 8 (isSelf guard) |
| §8.2 Last Owner/Admin block | Task 8 (isLastOwner guard) |
| §8.3 Deactivated member leads stay | Leads retain assigned_to; workload view shows them |
| §8.4 External sees internal-only | RLS not enforced server-side (app-layer: visibility field exists in type, UI can filter) |
| §8.5 Migration existing leads | Task 1: `assigned_to=null` by default; all existing leads go to pool |
| §9 DoD | All items covered across tasks |

**Note on RLS:** The project uses permissive `USING (true)` for all leadgen tables. Implementing server-side role-aware RLS requires setting `app.current_portal_id` in session headers (the app does not currently do this). Role enforcement is implemented in application code (hooks filter by `assigned_to`, UI hides/disables admin-only actions). This matches the existing project security model.

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `LeadgenMemberWithProfile` defined in Task 3, used in Tasks 8, 10, 11. `FollowUpFilters` defined in Task 5, used in Tasks 10. `HotLeadsFilters` defined in Task 6, used in Tasks 10. `ownership` param is `"mine" | "pool" | "all"` consistently across all hooks.
