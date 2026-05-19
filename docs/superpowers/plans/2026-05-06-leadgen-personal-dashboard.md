# Leadgen Personal Dashboard + Rename Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the existing `LeadgenDashboard` to `LeadgenOverview`, create a new personal `LeadgenDashboard` scoped to `auth.uid()`, update routing/sidebar accordingly.

**Architecture:** New `leadgenStatusGroups.ts` defines the 4 KPI group → status mapping used everywhere. Two new hooks (`usePersonalLeadgenSummary`, `usePersonalLeads`/`useArchivedLeads`) drive the personal page with parallel count queries, SWR caching, and realtime subscription. The old Dashboard component is copied to `LeadgenOverview.tsx` with the component renamed, then `LeadgenDashboard.tsx` is replaced with the new personal page. Sidebar gets a role-gated Overview item via a new lightweight `useLeadgenCurrentMember` hook.

**Tech Stack:** React, TypeScript, Supabase JS client (user-session scoped, never service role), Sonner toasts, Lucide icons, existing `subscribeToLeadgenUpdates`/`broadcastLeadgenUpdate` from `leadgenRealtime.ts`.

---

## File Map

**Create:**
- `src/lib/leadgenStatusGroups.ts` — DashboardGroup type + all group↔status constants
- `src/hooks/leadgen/usePersonalLeadgenSummary.ts` — KPI counts, deltas, quick stats, SWR cache
- `src/hooks/leadgen/usePersonalLeads.ts` — exports `usePersonalLeads` + `useArchivedLeads`
- `src/pages/leadgen/LeadgenOverview.tsx` — renamed copy of old Dashboard

**Repurpose (replace content):**
- `src/pages/leadgen/LeadgenDashboard.tsx` — new personal dashboard page

**Modify:**
- `src/hooks/leadgen/useLeadgenMembers.ts` — add exported `useLeadgenCurrentMember` (lightweight)
- `src/App.tsx` — add `LeadgenOverview` lazy import + `/leadgen/overview` route, change `/leadgen` redirect target
- `src/components/AppSidebar.tsx` — reorder `leadgenSubItems`, add role-gated Overview NavLink, import `useLeadgenCurrentMember`

---

### Task 1: `src/lib/leadgenStatusGroups.ts`

**Files:**
- Create: `src/lib/leadgenStatusGroups.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { OutreachStatus } from "@/types/leadgen";

export type DashboardGroup = "uncontacted" | "contacted" | "in_progress" | "completed" | "archived";
export type DashboardPeriod = "all" | "week" | "month" | "quarter";

export const STATUS_TO_GROUP: Record<OutreachStatus, DashboardGroup> = {
  new:       "uncontacted",
  contacted: "contacted",
  replied:   "in_progress",
  qualified: "in_progress",
  converted: "completed",
  rejected:  "archived",
};

export const GROUP_LABELS: Record<DashboardGroup, string> = {
  uncontacted: "Non contattato",
  contacted:   "Contattato",
  in_progress: "In corso",
  completed:   "Completato",
  archived:    "Archiviato",
};

export const GROUP_TO_STATUSES: Record<DashboardGroup, OutreachStatus[]> = {
  uncontacted: ["new"],
  contacted:   ["contacted"],
  in_progress: ["replied", "qualified"],
  completed:   ["converted"],
  archived:    ["rejected"],
};

export const GROUP_COLOR: Record<DashboardGroup, string> = {
  uncontacted: "var(--text-tertiary)",
  contacted:   "var(--color-info)",
  in_progress: "var(--accent-primary)",
  completed:   "var(--color-success)",
  archived:    "var(--text-tertiary)",
};

export const ACTIVE_STATUSES: OutreachStatus[] = ["new", "contacted", "replied", "qualified", "converted"];

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  all:     "Tutti",
  week:    "Questa settimana",
  month:   "Questo mese",
  quarter: "Questo trimestre",
};
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/leadgenStatusGroups.ts
git commit -m "feat(leadgen): add leadgenStatusGroups constants (DashboardGroup, period types)"
```

---

### Task 2: `useLeadgenCurrentMember` lightweight hook

**Files:**
- Modify: `src/hooks/leadgen/useLeadgenMembers.ts`

- [ ] **Step 1: Add the export at the bottom of `useLeadgenMembers.ts`**

Append after the existing `useLeadgenMembers` function (keep everything already there intact):

```typescript
/** Lightweight hook — only fetches the current user's own member record.
 *  Use this in the sidebar to avoid the full members+profiles round-trip. */
export function useLeadgenCurrentMember(): import("@/types/leadgen").LeadgenMember | null {
  const { currentPortalId } = usePortalDB();
  const [currentMember, setCurrentMember] = useState<import("@/types/leadgen").LeadgenMember | null>(null);

  useEffect(() => {
    if (!currentPortalId) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("leadgen_members")
        .select("*")
        .eq("portal_id", currentPortalId)
        .eq("user_id", user.id)
        .maybeSingle();
      setCurrentMember((data as import("@/types/leadgen").LeadgenMember | null));
    });
  }, [currentPortalId]);

  return currentMember;
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
git commit -m "feat(leadgen): add useLeadgenCurrentMember lightweight hook for sidebar"
```

---

### Task 3: `usePersonalLeadgenSummary` hook

**Files:**
- Create: `src/hooks/leadgen/usePersonalLeadgenSummary.ts`

- [ ] **Step 1: Create the file**

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates } from "@/lib/leadgenRealtime";
import { GROUP_TO_STATUSES } from "@/lib/leadgenStatusGroups";
import type { DashboardPeriod } from "@/lib/leadgenStatusGroups";
import type { OutreachStatus } from "@/types/leadgen";

export interface PersonalSummaryData {
  uncontacted: number;
  contacted: number;
  inProgress: number;
  completed: number;
  archived: number;
  totalActive: number;
  lastActionAt: string | null;
  personalConversionRate: number;
  teamAverageConversionRate: number;
  deltaUncontacted: number;
  deltaContacted: number;
  deltaInProgress: number;
  deltaCompleted: number;
}

const EMPTY: PersonalSummaryData = {
  uncontacted: 0, contacted: 0, inProgress: 0, completed: 0, archived: 0,
  totalActive: 0, lastActionAt: null,
  personalConversionRate: 0, teamAverageConversionRate: 0,
  deltaUncontacted: 0, deltaContacted: 0, deltaInProgress: 0, deltaCompleted: 0,
};

function periodStart(period: DashboardPeriod): Date | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  // quarter
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1);
}

function prevPeriodRange(period: DashboardPeriod): { from: string; to: string } | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "week") {
    const to = new Date(now); to.setDate(now.getDate() - 7); to.setHours(0, 0, 0, 0);
    const from = new Date(to); from.setDate(to.getDate() - 7);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to   = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  // quarter
  const q = Math.floor(now.getMonth() / 3);
  const pq = q === 0 ? 3 : q - 1;
  const py = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const from = new Date(py, pq * 3, 1);
  const to   = new Date(py, pq * 3 + 3, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function countQuery(
  portalId: string,
  userId: string,
  statuses: OutreachStatus[],
  from?: string,
  to?: string,
): Promise<number> {
  let q = supabase
    .from("leadgen_leads")
    .select("id", { count: "exact", head: true })
    .eq("portal_id", portalId)
    .eq("assigned_to", userId)
    .in("outreach_status", statuses);
  if (from) q = q.gte("assigned_at", from);
  if (to)   q = q.lt("assigned_at", to);
  const { count } = await q;
  return count ?? 0;
}

export function usePersonalLeadgenSummary(period: DashboardPeriod = "all") {
  const { currentPortalId } = usePortalDB();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [data, setData] = useState<PersonalSummaryData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!currentPortalId || !currentUserId) return;

    const cacheKey = `swr_personal_summary_${currentUserId}_${currentPortalId}_${period}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { ts, payload } = JSON.parse(cached) as { ts: number; payload: PersonalSummaryData };
        if (Date.now() - ts < 60_000) {
          setData(payload);
          setLoading(false);
        }
      }
    } catch { /**/ }

    const from = periodStart(period)?.toISOString();

    const [uncontacted, contacted, inProgress, completed, archived] = await Promise.all([
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.uncontacted, from),
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.contacted,   from),
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.in_progress, from),
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.completed,   from),
      countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.archived,    from),
    ]);

    const [totalActiveRes, lastActionRes, teamConvertedRes, teamTotalRes] = await Promise.all([
      supabase.from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("assigned_to", currentUserId)
        .not("outreach_status", "eq", "rejected"),
      supabase.from("leadgen_outreach_events")
        .select("occurred_at")
        .eq("portal_id", currentPortalId)
        .eq("user_id", currentUserId)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("outreach_status", "converted"),
      supabase.from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .in("outreach_status", ["converted", "rejected"]),
    ]);

    let deltaUncontacted = 0, deltaContacted = 0, deltaInProgress = 0, deltaCompleted = 0;
    const prev = prevPeriodRange(period);
    if (prev) {
      const [pu, pc, pip, pcm] = await Promise.all([
        countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.uncontacted, prev.from, prev.to),
        countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.contacted,   prev.from, prev.to),
        countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.in_progress, prev.from, prev.to),
        countQuery(currentPortalId, currentUserId, GROUP_TO_STATUSES.completed,   prev.from, prev.to),
      ]);
      deltaUncontacted = uncontacted - pu;
      deltaContacted   = contacted   - pc;
      deltaInProgress  = inProgress  - pip;
      deltaCompleted   = completed   - pcm;
    }

    const personalConversionRate = (completed + archived) > 0 ? completed / (completed + archived) : 0;
    const teamTotal = teamTotalRes.count ?? 0;
    const teamAverageConversionRate = teamTotal > 0 ? (teamConvertedRes.count ?? 0) / teamTotal : 0;

    const payload: PersonalSummaryData = {
      uncontacted, contacted, inProgress, completed, archived,
      totalActive: totalActiveRes.count ?? 0,
      lastActionAt: (lastActionRes.data as { occurred_at: string } | null)?.occurred_at ?? null,
      personalConversionRate,
      teamAverageConversionRate,
      deltaUncontacted, deltaContacted, deltaInProgress, deltaCompleted,
    };

    setData(payload);
    setLoading(false);
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload })); } catch { /**/ }
  }, [currentPortalId, currentUserId, period]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") {
        try { localStorage.removeItem(`swr_personal_summary_${currentUserId}_${currentPortalId}_${period}`); } catch { /**/ }
        fetchSummary();
      }
    });
  }, [fetchSummary, currentUserId, currentPortalId, period]);

  return { ...data, loading };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/leadgen/usePersonalLeadgenSummary.ts
git commit -m "feat(leadgen): add usePersonalLeadgenSummary hook with period/delta/SWR"
```

---

### Task 4: `usePersonalLeads` + `useArchivedLeads` hooks

**Files:**
- Create: `src/hooks/leadgen/usePersonalLeads.ts`

- [ ] **Step 1: Create the file**

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { subscribeToLeadgenUpdates, broadcastLeadgenUpdate } from "@/lib/leadgenRealtime";
import { GROUP_TO_STATUSES, ACTIVE_STATUSES } from "@/lib/leadgenStatusGroups";
import type { DashboardGroup } from "@/lib/leadgenStatusGroups";
import type { LeadgenLead, OutreachStatus } from "@/types/leadgen";
import { toast } from "sonner";

export interface PersonalLeadsFilters {
  group?: DashboardGroup | "all_active" | "all";
  searchText?: string;
  sortBy?: "name" | "updated" | "created" | "rating";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

function resolveStatuses(group: DashboardGroup | "all_active" | "all"): OutreachStatus[] {
  if (group === "all_active") return ACTIVE_STATUSES;
  if (group === "all") return [...ACTIVE_STATUSES, ...GROUP_TO_STATUSES.archived];
  return GROUP_TO_STATUSES[group];
}

export function usePersonalLeads(filters: PersonalLeadsFilters = {}) {
  const { currentPortalId } = usePortalDB();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadgenLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const group     = filters.group    ?? "all_active";
  const searchText = filters.searchText ?? "";
  const sortBy    = filters.sortBy   ?? "updated";
  const sortDir   = filters.sortDir  ?? "desc";
  const page      = filters.page     ?? 0;
  const pageSize  = filters.pageSize ?? 25;

  const fetch = useCallback(async () => {
    if (!currentPortalId || !currentUserId) return;
    setLoading(true);

    const statuses = resolveStatuses(group as DashboardGroup | "all_active" | "all");
    const orderCol = sortBy === "name" ? "name" : sortBy === "created" ? "created_at" : sortBy === "rating" ? "rating" : "updated_at";
    const ascending = sortDir === "asc";

    let countQ = supabase
      .from("leadgen_leads")
      .select("id", { count: "exact", head: true })
      .eq("portal_id", currentPortalId)
      .eq("assigned_to", currentUserId)
      .in("outreach_status", statuses);

    let dataQ = supabase
      .from("leadgen_leads")
      .select("id,name,outreach_status,category,city,updated_at,assigned_at,rating,phone,website")
      .eq("portal_id", currentPortalId)
      .eq("assigned_to", currentUserId)
      .in("outreach_status", statuses)
      .order(orderCol, { ascending })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (searchText) {
      const pat = `%${searchText}%`;
      const orClause = `name.ilike.${pat},category.ilike.${pat},city.ilike.${pat}`;
      countQ = countQ.or(orClause);
      dataQ  = dataQ.or(orClause);
    }

    const [countRes, dataRes] = await Promise.all([countQ, dataQ]);
    setTotalCount(countRes.count ?? 0);
    setLeads((dataRes.data ?? []) as LeadgenLead[]);
    setLoading(false);
  }, [currentPortalId, currentUserId, group, searchText, sortBy, sortDir, page, pageSize]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetch();
    });
  }, [fetch]);

  return { leads, totalCount, loading };
}

export function useArchivedLeads() {
  const { currentPortalId } = usePortalDB();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadgenLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const fetch = useCallback(async () => {
    if (!currentPortalId || !currentUserId) return;
    setLoading(true);

    const [countRes, dataRes] = await Promise.all([
      supabase.from("leadgen_leads")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", currentPortalId)
        .eq("assigned_to", currentUserId)
        .eq("outreach_status", "rejected"),
      supabase.from("leadgen_leads")
        .select("id,name,outreach_status,category,city,updated_at,outreach_notes")
        .eq("portal_id", currentPortalId)
        .eq("assigned_to", currentUserId)
        .eq("outreach_status", "rejected")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

    setTotalCount(countRes.count ?? 0);
    setLeads((dataRes.data ?? []) as LeadgenLead[]);
    setLoading(false);
  }, [currentPortalId, currentUserId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    return subscribeToLeadgenUpdates((event) => {
      if (event === "lead_updated") fetch();
    });
  }, [fetch]);

  const reopen = useCallback(async (leadId: string): Promise<void> => {
    if (!currentPortalId || !currentUserId) return;
    const now = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("leadgen_leads")
      .update({ outreach_status: "new", updated_at: now })
      .eq("id", leadId)
      .eq("portal_id", currentPortalId);

    if (error) { toast.error(error.message); return; }

    await supabase.from("leadgen_outreach_events").insert({
      portal_id: currentPortalId,
      lead_id: leadId,
      channel: "email" as const,
      direction: "outbound" as const,
      notes: "Riaperto dall'archivio",
      occurred_at: now,
      user_id: user?.id ?? null,
    });

    broadcastLeadgenUpdate("lead_updated", { leadId });
    toast.success("Lead riaperto");
  }, [currentPortalId, currentUserId]);

  return { leads, totalCount, loading, reopen };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/leadgen/usePersonalLeads.ts
git commit -m "feat(leadgen): add usePersonalLeads and useArchivedLeads hooks"
```

---

### Task 5: Rename — `LeadgenOverview.tsx` + App.tsx route wiring

**Files:**
- Create: `src/pages/leadgen/LeadgenOverview.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `LeadgenOverview.tsx`**

Copy the ENTIRE content of `src/pages/leadgen/LeadgenDashboard.tsx` into the new file, then change only the component name on line 77:

```typescript
// src/pages/leadgen/LeadgenOverview.tsx
// (identical to old LeadgenDashboard.tsx except default export name)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "@/lib/portalContext";
import { useLeadgenLeads } from "@/hooks/leadgen/useLeadgenLeads";
import { useLeadgenSearches } from "@/hooks/leadgen/useLeadgenSearches";
import { useLeadgenSummary } from "@/hooks/leadgen/useLeadgenSummary";
import { SearchProgressIndicator } from "@/components/leadgen/SearchProgressIndicator";
import { X } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const OUTREACH_FUNNEL = [
  { key: "new",       label: "Nuovi" },
  { key: "contacted", label: "Contattati" },
  { key: "replied",   label: "Risposto" },
  { key: "qualified", label: "Qualificati" },
  { key: "converted", label: "Convertiti" },
];

const DONUT_COLORS = ["#4ade80", "#f87171"];

function DiscardedInfoModal({ onClose, summary }: {
  onClose: () => void;
  summary: { discardedNoContact: number; totalRawResults: number; excludedChains: number; saved: number };
}) {
  const discardPct = summary.totalRawResults > 0
    ? ((summary.discardedNoContact / summary.totalRawResults) * 100).toFixed(1)
    : "0.0";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: 28, maxWidth: 460, width: "90%", fontFamily: "var(--font-mono)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            Lead scartati senza contatti
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "16px", background: "var(--sosa-bg-2)", border: "1px solid var(--glass-border)" }}>
          {[
            { label: "Lead grezzi trovati", value: summary.totalRawResults, color: "var(--text-primary)" },
            { label: "Catene escluse", value: summary.excludedChains, color: "var(--color-error)" },
            { label: "Senza contatti", value: `${summary.discardedNoContact} (${discardPct}%)`, color: "var(--text-tertiary)" },
            { label: "Salvati nel CRM", value: summary.saved, color: "var(--accent-primary)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.8, marginBottom: 20 }}>
          Apify trova attività su Google Maps senza telefono né email pubblici — vengono scartate
          perché non contattabili. Se la percentuale è alta, prova categorie diverse (es. "ristoranti"
          ha più contatti di "uffici postali") o aree con più PMI strutturate.
        </p>

        <button onClick={onClose} className="btn-primary" style={{ width: "100%" }}>
          Chiudi
        </button>
      </div>
    </div>
  );
}

export default function LeadgenOverview() {
  const { portal } = usePortal();
  const navigate = useNavigate();
  const slug = portal?.id ?? "redx";
  const { allLeads, loading } = useLeadgenLeads();
  const { searches } = useLeadgenSearches();
  const summary = useLeadgenSummary(allLeads, searches);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const completedSearches = searches.filter((s) => s.status === "completed");
  const totalExcludedChains = completedSearches.reduce((sum, s) => sum + (s.excluded_count ?? 0), 0);

  const donutData = [
    { name: "Con sito",   value: summary.withWebsite    },
    { name: "Senza sito", value: summary.withoutWebsite },
  ];

  const barData = summary.topCategories.map((c) => ({ name: c.category, count: c.count }));

  const kpiCards = [
    { label: "Lead totali",         value: summary.total,                                              onClick: () => navigate(`/${slug}/leadgen/no-website`) },
    { label: "Con sito",            value: summary.withWebsite,                                        onClick: () => navigate(`/${slug}/leadgen/with-website`) },
    { label: "Senza sito",          value: summary.withoutWebsite,                                     onClick: () => navigate(`/${slug}/leadgen/no-website`) },
    { label: "Tasso contatto",      value: `${(summary.contactRate * 100).toFixed(1)}%`,               onClick: undefined as (() => void) | undefined },
    {
      label: "Scartati no-contatti",
      value: summary.discardedNoContact,
      sub: summary.totalRawResults > 0 ? `${(summary.discardRate * 100).toFixed(1)}% del totale grezzo` : "nessuna ricerca",
      onClick: () => setShowDiscardModal(true),
      dim: true,
    },
  ];

  if (loading) return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        Overview — Team Lead Generation
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
        {kpiCards.map((kpi) => (
          <div key={kpi.label}
            onClick={kpi.onClick}
            title={kpi.label === "Scartati no-contatti" ? "Lead trovati ma scartati perché senza email né telefono. Non sono salvati nel CRM." : undefined}
            style={{
              background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
              borderRadius: "var(--radius-md)", padding: "20px 24px",
              cursor: kpi.onClick ? "pointer" : "default",
            }}
            onMouseEnter={(e) => { if (kpi.onClick) e.currentTarget.style.borderColor = "var(--accent-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 8px" }}>{kpi.label}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: kpi.dim ? "var(--text-tertiary)" : "var(--text-primary)", margin: 0 }}>{kpi.value}</p>
            {"sub" in kpi && kpi.sub && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", margin: "4px 0 0" }}>{kpi.sub}</p>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 32 }}>
        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 16px" }}>Distribuzione sito</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {donutData.map((_entry, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val, name) => [val, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
            {donutData.map((d, i) => (
              <span key={d.name} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 16px" }}>Top categorie</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#666" }} />
              <YAxis tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#666" }} />
              <Tooltip />
              <Bar dataKey="count" fill="#d4ff00" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 16px" }}>Ultime ricerche</p>
          {searches.slice(0, 5).map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--glass-border)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", flex: 1 }}>{s.category} · {s.postal_code}</span>
              <SearchProgressIndicator status={s.status} />
            </div>
          ))}
          {searches.length === 0 && <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>Nessuna ricerca.</p>}
        </div>

        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 16px" }}>Funnel outreach</p>
          {OUTREACH_FUNNEL.map(({ key, label }) => {
            const count = summary.byOutreachStatus[key as keyof typeof summary.byOutreachStatus] ?? 0;
            const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
            return (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)" }}>{count}</span>
                </div>
                <div style={{ height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent-primary)", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showDiscardModal && (
        <DiscardedInfoModal
          onClose={() => setShowDiscardModal(false)}
          summary={{
            discardedNoContact: summary.discardedNoContact,
            totalRawResults: summary.totalRawResults,
            excludedChains: totalExcludedChains,
            saved: summary.total,
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/App.tsx`**

Find the lazy imports block for leadgen and replace:

```typescript
// OLD:
const LeadgenDashboard    = React.lazy(() => import("./pages/leadgen/LeadgenDashboard"));

// NEW (add LeadgenOverview, keep LeadgenDashboard):
const LeadgenDashboard    = React.lazy(() => import("./pages/leadgen/LeadgenDashboard"));
const LeadgenOverview     = React.lazy(() => import("./pages/leadgen/LeadgenOverview"));
```

Find the `/leadgen` redirect route and change its target:

```typescript
// OLD:
<Route path="leadgen" element={<Navigate to="today" replace />} />

// NEW:
<Route path="leadgen" element={<Navigate to="dashboard" replace />} />
```

Add the overview route immediately after the dashboard route:

```typescript
// After:
<Route path="leadgen/dashboard" element={<Lazy><LeadgenDashboard /></Lazy>} />
// Add:
<Route path="leadgen/overview"  element={<Lazy><LeadgenOverview /></Lazy>} />
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/leadgen/LeadgenOverview.tsx src/App.tsx
git commit -m "feat(leadgen): add LeadgenOverview (renamed from Dashboard), wire /leadgen/overview route"
```

---

### Task 6: `LeadgenDashboard.tsx` — new personal page

**Files:**
- Repurpose: `src/pages/leadgen/LeadgenDashboard.tsx` (replace entire content)

- [ ] **Step 1: Replace entire content of `src/pages/leadgen/LeadgenDashboard.tsx`**

```typescript
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "@/lib/portalContext";
import { useLeadgenMembers } from "@/hooks/leadgen/useLeadgenMembers";
import { usePersonalLeadgenSummary } from "@/hooks/leadgen/usePersonalLeadgenSummary";
import { usePersonalLeads, useArchivedLeads } from "@/hooks/leadgen/usePersonalLeads";
import {
  GROUP_LABELS, GROUP_COLOR, PERIOD_LABELS,
  type DashboardGroup, type DashboardPeriod,
} from "@/lib/leadgenStatusGroups";
import { STATUS_CONFIG } from "@/components/leadgen/LeadOutreachStatusBadge";
import { ChevronDown, ChevronUp, Search, ExternalLink, Loader2 } from "lucide-react";
import type { LeadgenLead, OutreachStatus } from "@/types/leadgen";

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "meno di un'ora fa";
  if (h < 24) return `${h} ${h === 1 ? "ora" : "ore"} fa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ${d === 1 ? "giorno" : "giorni"} fa`;
  return new Date(iso).toLocaleDateString("it-IT");
}

function DeltaBadge({ delta, goodWhenNegative, period }: {
  delta: number; goodWhenNegative: boolean; period: DashboardPeriod;
}) {
  if (period === "all" || delta === 0) return null;
  const isGood = goodWhenNegative ? delta < 0 : delta > 0;
  const color = Math.abs(delta) < 2 ? "var(--text-tertiary)" : isGood ? "var(--color-success)" : "var(--color-error)";
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color }}>
      {delta > 0 ? "+" : ""}{delta} rispetto al periodo precedente
    </span>
  );
}

const KPI_DEFS: {
  key: keyof import("@/hooks/leadgen/usePersonalLeadgenSummary").PersonalSummaryData;
  deltaKey: keyof import("@/hooks/leadgen/usePersonalLeadgenSummary").PersonalSummaryData;
  group: DashboardGroup;
  subline: string;
  goodWhenNegative: boolean;
}[] = [
  { key: "uncontacted", deltaKey: "deltaUncontacted", group: "uncontacted", subline: "lead in attesa di primo contatto", goodWhenNegative: true  },
  { key: "contacted",   deltaKey: "deltaContacted",   group: "contacted",   subline: "lead contattati, in attesa di risposta", goodWhenNegative: false },
  { key: "inProgress",  deltaKey: "deltaInProgress",  group: "in_progress", subline: "conversazioni attive", goodWhenNegative: false },
  { key: "completed",   deltaKey: "deltaCompleted",   group: "completed",   subline: "deal chiusi", goodWhenNegative: false },
];

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, subline, count, delta, deltaGoodWhenNegative, color, onClick, loading, period }: {
  label: string; subline: string; count: number; delta: number;
  deltaGoodWhenNegative: boolean; color: string;
  onClick: () => void; loading: boolean; period: DashboardPeriod;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--glass-bg)", border: `0.5px solid var(--glass-border)`,
        padding: "20px 22px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color, margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1 }}>
        {loading ? "—" : count}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>{subline}</p>
      <DeltaBadge delta={delta} goodWhenNegative={deltaGoodWhenNegative} period={period} />
    </div>
  );
}

function QuickStatsStrip({ summary }: {
  summary: ReturnType<typeof usePersonalLeadgenSummary>;
}) {
  const convPct = (summary.personalConversionRate * 100).toFixed(1) + "%";
  const teamPct = summary.teamAverageConversionRate;
  const convColor = summary.personalConversionRate > teamPct ? "var(--color-success)"
    : summary.personalConversionRate < teamPct ? "var(--color-error)"
    : "var(--text-secondary)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
      padding: "10px 16px", background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
      fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)",
      marginBottom: 32,
    }}>
      <span>◆ <strong style={{ color: "var(--text-primary)" }}>{summary.totalActive}</strong> lead totali assegnati</span>
      <span style={{ color: "var(--glass-border)" }}>●</span>
      <span>Ultima azione:{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {summary.lastActionAt ? timeAgo(summary.lastActionAt) : "mai"}
        </strong>
      </span>
      <span style={{ color: "var(--glass-border)" }}>●</span>
      <span>Tasso conversione:{" "}
        <strong style={{ color: convColor }}>{convPct}</strong>
        {summary.teamAverageConversionRate > 0 && (
          <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>
            (team: {(teamPct * 100).toFixed(1)}%)
          </span>
        )}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: OutreachStatus }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "2px 7px",
      background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`,
      border: `1px solid ${cfg.color}`, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function LeadRow({ lead, slug, navigate }: { lead: LeadgenLead; slug: string; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div
      onClick={() => navigate(`/${slug}/leadgen/lead/${lead.id}`)}
      style={{
        display: "grid", gridTemplateColumns: "1fr 120px 130px 100px",
        gap: 12, padding: "10px 0", borderBottom: "1px solid var(--glass-border)",
        cursor: "pointer", alignItems: "center",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.name}
        </span>
        {lead.category && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>{lead.category}</span>
        )}
      </div>
      <StatusBadge status={lead.outreach_status} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
        {lead.city ?? "—"}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
        {lead.updated_at ? timeAgo(lead.updated_at) : "—"}
      </span>
    </div>
  );
}

function ArchivedRow({ lead, onReopen, slug, navigate }: {
  lead: LeadgenLead; onReopen: (id: string) => Promise<void>;
  slug: string; navigate: ReturnType<typeof useNavigate>;
}) {
  const [reopening, setReopening] = useState(false);
  const handleReopen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReopening(true);
    await onReopen(lead.id);
    setReopening(false);
  };
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "1fr 130px 130px auto",
        gap: 12, padding: "8px 0", borderBottom: "1px solid var(--glass-border)",
        cursor: "pointer", alignItems: "center", opacity: 0.7,
      }}
      onClick={() => navigate(`/${slug}/leadgen/lead/${lead.id}`)}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lead.name}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
        {lead.city ?? "—"}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lead.outreach_notes ? lead.outreach_notes.slice(0, 40) : "—"}
      </span>
      <button
        type="button"
        onClick={handleReopen}
        disabled={reopening}
        className="btn-glass-ds"
        style={{ fontSize: 10, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        {reopening ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : null}
        Riapri →
      </button>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const PERIOD_OPTS = (Object.entries(PERIOD_LABELS) as [DashboardPeriod, string][]);
const GROUP_FILTER_OPTS: { label: string; value: DashboardGroup | "all_active" }[] = [
  { label: "Tutti",           value: "all_active"  },
  { label: GROUP_LABELS.uncontacted, value: "uncontacted" },
  { label: GROUP_LABELS.contacted,   value: "contacted"   },
  { label: GROUP_LABELS.in_progress, value: "in_progress" },
  { label: GROUP_LABELS.completed,   value: "completed"   },
];
const PAGE_SIZE = 25;

export default function LeadgenDashboard() {
  const { portal } = usePortal();
  const navigate = useNavigate();
  const slug = portal?.id ?? "redx";
  const listRef = useRef<HTMLDivElement>(null);

  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [activeGroup, setActiveGroup] = useState<DashboardGroup | "all_active">("all_active");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "updated" | "created" | "rating">("updated");
  const [page, setPage] = useState(0);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const { currentMember } = useLeadgenMembers();
  const summary = usePersonalLeadgenSummary(period);
  const { leads, totalCount, loading: leadsLoading } = usePersonalLeads({
    group: activeGroup,
    searchText,
    sortBy,
    sortDir: "desc",
    page,
    pageSize: PAGE_SIZE,
  });
  const { leads: archivedLeads, totalCount: archivedCount, reopen } = useArchivedLeads();

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [activeGroup, searchText, sortBy]);

  const greetName = currentMember?.display_name ?? "there";
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleKpiClick = (group: DashboardGroup) => {
    setActiveGroup(group);
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  // Empty state: no leads at all
  if (!summary.loading && summary.totalActive === 0 && summary.archived === 0) {
    return (
      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          Benvenuto, {greetName}!
        </h2>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", marginBottom: 24, textAlign: "center" }}>
          Non hai ancora lead assegnati. Vai sul pool e prendine uno per iniziare.
        </p>
        <button
          onClick={() => navigate(`/${slug}/leadgen/today`)}
          className="btn-primary"
        >
          Vai al pool →
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Header + period selector */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
            Ciao {greetName}, ecco i tuoi lead.
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PERIOD_OPTS.map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              style={{
                padding: "5px 12px",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
                background: period === val ? "var(--accent-primary)" : "transparent",
                border: `1px solid ${period === val ? "var(--accent-primary)" : "var(--glass-border)"}`,
                color: period === val ? "var(--sosa-bg)" : "var(--text-tertiary)",
                cursor: "pointer",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards — 4 col desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        {KPI_DEFS.map((def) => (
          <KpiCard
            key={String(def.key)}
            label={GROUP_LABELS[def.group]}
            subline={def.subline}
            count={summary[def.key] as number}
            delta={summary[def.deltaKey] as number}
            deltaGoodWhenNegative={def.goodWhenNegative}
            color={GROUP_COLOR[def.group]}
            onClick={() => handleKpiClick(def.group)}
            loading={summary.loading}
            period={period}
          />
        ))}
      </div>

      {/* Quick stats strip */}
      <QuickStatsStrip summary={summary} />

      {/* Lead list section */}
      <div ref={listRef}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {/* Group pills */}
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {GROUP_FILTER_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveGroup(opt.value)}
                style={{
                  padding: "4px 10px",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                  letterSpacing: "0.05em", textTransform: "uppercase",
                  background: activeGroup === opt.value ? "var(--glass-border)" : "transparent",
                  border: `1px solid ${activeGroup === opt.value ? "var(--text-tertiary)" : "var(--glass-border)"}`,
                  color: activeGroup === opt.value ? "var(--text-primary)" : "var(--text-tertiary)",
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "5px 10px" }}>
            <Search size={11} style={{ color: "var(--text-tertiary)" }} />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cerca..."
              style={{ background: "none", border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)", width: 140 }}
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="glass-input"
            style={{ fontSize: 10, padding: "5px 8px" }}
          >
            <option value="updated">Ultima modifica</option>
            <option value="created">Data creazione</option>
            <option value="name">Nome</option>
            <option value="rating">Rating</option>
          </select>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 130px 100px", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
          {["Nome", "Stato", "Città", "Ultima azione"].map((h) => (
            <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {leadsLoading ? (
          <div style={{ padding: "32px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Caricamento...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12 }}>
              {period !== "all" ? "Nessun lead in questo periodo." : "Nessun lead attivo."}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {period !== "all" && (
                <button onClick={() => setPeriod("all")} className="btn-glass-ds" style={{ fontSize: 11 }}>
                  Vedi tutti i miei lead
                </button>
              )}
              <button onClick={() => navigate(`/${slug}/leadgen/today`)} className="btn-primary" style={{ fontSize: 11 }}>
                Prendi nuovi lead dal pool →
              </button>
            </div>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} slug={slug} navigate={navigate} />
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
            <span>{totalCount} lead · pagina {page + 1} di {totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-glass-ds" style={{ padding: "4px 10px", fontSize: 10 }}>← Prec</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-glass-ds" style={{ padding: "4px 10px", fontSize: 10 }}>Succ →</button>
            </div>
          </div>
        )}
      </div>

      {/* Archived section */}
      <div style={{ marginTop: 40, borderTop: "1px solid var(--glass-border)", paddingTop: 20 }}>
        <button
          type="button"
          onClick={() => setArchivedExpanded((p) => !p)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
            Archiviati (rejected)
          </span>
          {archivedCount > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", background: "var(--glass-border)", padding: "1px 6px" }}>
              {archivedCount}
            </span>
          )}
          {archivedExpanded ? <ChevronUp size={13} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={13} style={{ color: "var(--text-tertiary)" }} />}
        </button>

        {archivedExpanded && (
          <div style={{ marginTop: 12 }}>
            {archivedLeads.length === 0 ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", padding: "16px 0" }}>Nessun lead archiviato.</p>
            ) : (
              <>
                {/* Archived table header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px auto", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
                  {["Nome", "Città", "Note", ""].map((h, i) => (
                    <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
                      {h}
                    </span>
                  ))}
                </div>
                {archivedLeads.map((lead) => (
                  <ArchivedRow key={lead.id} lead={lead} onReopen={reopen} slug={slug} navigate={navigate} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Fix any errors before committing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/leadgen/LeadgenDashboard.tsx
git commit -m "feat(leadgen): add personal Dashboard page (KPIs, lead list, archived section)"
```

---

### Task 7: AppSidebar — reorder + Overview item

**Files:**
- Modify: `src/components/AppSidebar.tsx`

- [ ] **Step 1: Add `BarChart2` to lucide imports**

Find the lucide import block at the top of `AppSidebar.tsx`. `BarChart2` is already imported (it's in `personalFinanceSubItems`). Verify. If not present, add it to the import.

Also add `useLeadgenCurrentMember` to the import:

```typescript
import { useLeadgenCurrentMember } from "@/hooks/leadgen/useLeadgenMembers";
```

- [ ] **Step 2: Update `leadgenSubItems` array (reorder Dashboard to first)**

Find the `leadgenSubItems` constant and replace it:

```typescript
const leadgenSubItems = [
  { title: "Dashboard",     path: "/leadgen/dashboard",    icon: LayoutDashboard },
  { title: "Da Fare Oggi",  path: "/leadgen/today",        icon: CalendarClock   },
  { title: "Nuova ricerca", path: "/leadgen/search",       icon: Crosshair       },
  { title: "Senza sito",    path: "/leadgen/no-website",   icon: MonitorOff      },
  { title: "Con sito",      path: "/leadgen/with-website", icon: Globe           },
  { title: "Storico",       path: "/leadgen/searches",     icon: History         },
  { title: "Impostazioni",  path: "/leadgen/settings",     icon: Settings        },
];
```

- [ ] **Step 3: Update `LeadgenSidebarSection` to add `useLeadgenCurrentMember` + Overview NavLink**

Find the `LeadgenSidebarSection` function and replace it:

```typescript
function LeadgenSidebarSection({
  isActive, isOpen, onToggle, portal, accentOf, prefix, location, onMobileClose,
}: {
  isActive: boolean; isOpen: boolean; onToggle: () => void;
  portal: PortalConfig | null;
  accentOf: (p: PortalConfig | null) => string;
  prefix: string; location: { pathname: string }; onMobileClose: () => void;
}) {
  const { total } = useTodayCount();
  const currentMember = useLeadgenCurrentMember();
  const isLeadgenAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";

  const renderLabel = () => (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      Lead Generation
      {total > 0 && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, background: "var(--accent-primary)", color: "#000", padding: "1px 5px", lineHeight: 1.4 }}>
          {total}
        </span>
      )}
    </span>
  );

  const navLinkStyle = (active: boolean) => ({
    padding: "7px 14px 7px 10px", borderRadius: 0,
    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: active ? 600 : 400,
    letterSpacing: "0.03em",
    color: active ? "var(--text-primary)" : "var(--text-tertiary)",
    background: active ? "rgba(255,255,255,0.04)" : "transparent",
    borderLeft: active ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
  });

  return (
    <AccordionSection
      label="Lead Generation"
      icon={Crosshair}
      isActive={isActive} isOpen={isOpen}
      onToggle={onToggle} portal={portal}
      renderLabel={renderLabel}
    >
      {leadgenSubItems.map((item) => {
        const isItemActive =
          location.pathname === `${prefix}${item.path}` ||
          (item.path !== "/leadgen/dashboard" && location.pathname.startsWith(`${prefix}${item.path}/`));
        return (
          <NavLink
            key={item.path} to={`${prefix}${item.path}`} onClick={onMobileClose}
            className="flex items-center gap-2"
            style={navLinkStyle(isItemActive)}
            onMouseEnter={(e) => { if (!isItemActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
            onMouseLeave={(e) => { if (!isItemActive) e.currentTarget.style.background = "transparent"; }}
          >
            <item.icon style={{ width: 13, height: 13, strokeWidth: 1.6, opacity: isItemActive ? 1 : 0.4 }} />
            {item.title}
            {item.path === "/leadgen/today" && total > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, background: "var(--accent-primary)", color: "#000", padding: "1px 5px", lineHeight: 1.4, marginLeft: "auto" }}>
                {total}
              </span>
            )}
          </NavLink>
        );
      })}

      {isLeadgenAdmin && (() => {
        const overviewPath = `${prefix}/leadgen/overview`;
        const isOverviewActive = location.pathname === overviewPath;
        return (
          <NavLink
            to={overviewPath} onClick={onMobileClose}
            className="flex items-center gap-2"
            style={navLinkStyle(isOverviewActive)}
            onMouseEnter={(e) => { if (!isOverviewActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
            onMouseLeave={(e) => { if (!isOverviewActive) e.currentTarget.style.background = "transparent"; }}
          >
            <BarChart2 style={{ width: 13, height: 13, strokeWidth: 1.6, opacity: isOverviewActive ? 1 : 0.4 }} />
            Overview
          </NavLink>
        );
      })()}
    </AccordionSection>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Lint check**

```bash
npm run lint 2>&1 | grep -E "AppSidebar|useLeadgenMembers"
```

Expected: no errors (warnings for pre-existing issues elsewhere are OK).

- [ ] **Step 6: Commit**

```bash
git add src/components/AppSidebar.tsx
git commit -m "feat(leadgen): sidebar — Dashboard first, Overview gated to admin/owner"
```

---

### Final: Lint + type-check

- [ ] **Run full checks**

```bash
npx tsc --noEmit
npm run lint 2>&1 | grep -E "(error|leadgen)" | head -40
```

Expected: tsc clean. Only pre-existing lint errors in unrelated files.

- [ ] **Commit if any fixes needed**

```bash
git add -A
git commit -m "chore(leadgen): fix lint/type issues from personal dashboard"
```

---

## Self-review

**Spec coverage:**

| Section | Covered by |
|---|---|
| §1 KPI mapping via STATUS_TO_GROUP | Task 1 |
| §2.1 Routes | Task 5 |
| §2.2 File operations (rename Dashboard→Overview) | Task 5 |
| §2.3 Sidebar reorder + Overview admin-only | Task 7 |
| §3.1 Identity check — all queries `.eq("assigned_to", currentUserId)` from `supabase.auth.getUser()` | Tasks 3+4 |
| §3.2 Page header + period selector | Task 6 |
| §3.3 4 KPI cards with delta | Tasks 3+6 |
| §3.4 Quick stats strip (total assigned, last action, conversion rate vs team) | Tasks 3+6 |
| §3.5 Embedded lead list with filter pills, search, sort, pagination | Tasks 4+6 |
| §3.6 Archived section — collapsed, expand, Riapri action | Tasks 4+6 |
| §3.7 Empty states | Task 6 |
| §4.1 usePersonalLeadgenSummary | Task 3 |
| §4.2 usePersonalLeads | Task 4 |
| §4.3 useArchivedLeads | Task 4 |
| §5 RLS — app-layer `.eq("assigned_to", currentUserId)` + existing permissive RLS | All hooks |
| §6 Realtime | Tasks 3+4 subscribe to `"lead_updated"` |
| §7 Performance — parallel Promise.all, head:true counts, SWR localStorage | Task 3 |
| §9 DoD routing + file structure | Tasks 5+6+7 |

**Placeholder scan:** None found.

**Type consistency:** `DashboardGroup`, `DashboardPeriod`, `PersonalSummaryData` defined in Tasks 1+3 and used consistently in Tasks 4+6+7.
