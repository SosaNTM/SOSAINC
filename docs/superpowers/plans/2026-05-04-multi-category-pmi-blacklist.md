# Multi-Category PMI Search + Blacklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-category leadgen search with multi-category PMI-focused search, add a chain-exclusion blacklist pipeline, and add advanced filters on lead list pages.

**Architecture:** Three layers — (1) DB schema + types, (2) business logic (filter pipeline, hooks), (3) UI (search form rebuild, settings blacklist section, history stats, lead list filters). Each task is independently deployable. The filter pipeline lives in `useLeadgenSearches.ts` because that's where Apify results are ingested; the blacklist rules are fetched fresh at ingestion time so they don't need realtime subscription.

**Tech Stack:** React + TypeScript + Supabase (RLS) + Apify Google Maps Scraper

---

## File Map

**Create:**
- `src/lib/leadgenCategories.ts` — PMI_DEFAULT, PMI_EXTRA, MAX_CATEGORIES constants
- `src/lib/countries.ts` — static map of ISO alpha-2 codes → English country names for Apify locationQuery
- `src/lib/leadgenFilter.ts` — `applyBlacklist()` pure function
- `src/hooks/leadgen/useLeadgenBlacklist.ts` — CRUD hook over `leadgen_blacklist` table

**Modify:**
- `src/types/leadgen.ts` — add `categories`, `excluded_count` to `LeadgenSearch`; add `LeadgenBlacklist` interface
- `src/hooks/leadgen/useLeadgenSearches.ts` — update `createSearch` to accept `categories[]`; add filter pipeline in `pollRunning`
- `src/pages/leadgen/LeadgenSearch.tsx` — full rebuild: multi-category chips, preset buttons, cost estimator
- `src/pages/leadgen/LeadgenSettings.tsx` — add blacklist section + auto-seed on first load
- `src/pages/leadgen/LeadgenSearchHistory.tsx` — add Categories + Escluse columns
- `src/pages/leadgen/LeadgenNoWebsite.tsx` — add advanced filter panel with URL state
- `src/pages/leadgen/LeadgenWithWebsite.tsx` — same filter panel

---

## Task 1: SQL Migrations

**Files:**
- Apply via Supabase MCP `execute_sql` tool

- [ ] **Step 1: Run migration 1 — extend leadgen_searches**

```sql
alter table leadgen_searches
  add column if not exists categories text[] not null default '{}',
  add column if not exists excluded_count int default 0;

alter table leadgen_searches
  alter column category drop not null;
```

- [ ] **Step 2: Run migration 2 — create leadgen_blacklist with RLS**

```sql
create table if not exists leadgen_blacklist (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null,
  rule_type text not null,
  rule_value text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_leadgen_blacklist_portal
  on leadgen_blacklist (portal_id, rule_type, active);

alter table leadgen_blacklist enable row level security;

create policy "portal members can read blacklist"
  on leadgen_blacklist for select
  using (
    exists (
      select 1 from portal_members pm
      where pm.portal_id = leadgen_blacklist.portal_id
        and pm.user_id = auth.uid()
    )
  );

create policy "portal admins can manage blacklist"
  on leadgen_blacklist for all
  using (
    exists (
      select 1 from portal_members pm
      where pm.portal_id = leadgen_blacklist.portal_id
        and pm.user_id = auth.uid()
        and pm.role in ('admin', 'owner')
    )
  );
```

- [ ] **Step 3: Verify tables**

Run:
```sql
select column_name, data_type from information_schema.columns
where table_name = 'leadgen_searches'
order by ordinal_position;

select count(*) from leadgen_blacklist;
```

Expected: `categories`, `excluded_count` appear in first query; second returns `0`.

---

## Task 2: Type updates

**Files:**
- Modify: `src/types/leadgen.ts`

- [ ] **Step 1: Update `LeadgenSearch` interface**

In `src/types/leadgen.ts`, replace the existing `LeadgenSearch` interface with:

```ts
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
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Add `LeadgenBlacklist` interface**

Append to `src/types/leadgen.ts`:

```ts
export type BlacklistRuleType = "title_keyword" | "website_domain" | "category" | "min_reviews";

export interface LeadgenBlacklist {
  id: string;
  portal_id: string;
  rule_type: BlacklistRuleType;
  rule_value: string;
  active: boolean;
  created_at: string;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in files that reference old `LeadgenSearch` shape (we'll fix those in later tasks).

---

## Task 3: Library files

**Files:**
- Create: `src/lib/leadgenCategories.ts`
- Create: `src/lib/countries.ts`
- Create: `src/lib/leadgenFilter.ts`

- [ ] **Step 1: Create `src/lib/leadgenCategories.ts`**

```ts
export const PMI_DEFAULT = [
  "ristoranti",
  "bar",
  "parrucchieri",
  "estetiste",
  "palestre",
  "studi dentistici",
];

export const PMI_EXTRA = [
  "pizzerie",
  "studi legali",
  "commercialisti",
  "officine auto",
  "carrozzerie",
  "agenzie immobiliari",
  "hotel",
  "B&B",
  "gioiellerie",
  "negozi abbigliamento",
];

export const MAX_CATEGORIES = 10;
```

- [ ] **Step 2: Create `src/lib/countries.ts`**

```ts
export const COUNTRY_NAMES: Record<string, string> = {
  IT: "Italy",
  FR: "France",
  DE: "Germany",
  ES: "Spain",
  GB: "United Kingdom",
  US: "United States",
  PT: "Portugal",
  NL: "Netherlands",
  BE: "Belgium",
  AT: "Austria",
  CH: "Switzerland",
  PL: "Poland",
  CZ: "Czech Republic",
  SK: "Slovakia",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  GR: "Greece",
  HR: "Croatia",
  SI: "Slovenia",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IE: "Ireland",
  LU: "Luxembourg",
  MT: "Malta",
  CY: "Cyprus",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  TR: "Turkey",
  UA: "Ukraine",
  RU: "Russia",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  AR: "Argentina",
  ZA: "South Africa",
  EG: "Egypt",
  MA: "Morocco",
  NG: "Nigeria",
  KE: "Kenya",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  IL: "Israel",
  SG: "Singapore",
  TH: "Thailand",
  ID: "Indonesia",
  MY: "Malaysia",
  PH: "Philippines",
  VN: "Vietnam",
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}
```

- [ ] **Step 3: Create `src/lib/leadgenFilter.ts`**

```ts
import type { ApifyPlaceResult } from "@/types/leadgen";

export interface BlacklistRules {
  titleKeywords: string[];
  websiteDomains: string[];
  categories: string[];
  minReviews: number | null;
}

export interface FilterResult {
  keep: boolean;
  reason?: string;
}

export function applyBlacklist(
  rules: BlacklistRules,
  item: ApifyPlaceResult
): FilterResult {
  const titleLower = (item.title || "").toLowerCase();

  if (rules.titleKeywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
    return { keep: false, reason: "chain_title_keyword" };
  }

  if (
    item.website &&
    rules.websiteDomains.some((d) => item.website!.includes(d))
  ) {
    return { keep: false, reason: "chain_website_domain" };
  }

  const allCats = [
    item.categoryName,
    ...((item as ApifyPlaceResult & { categories?: string[] }).categories ?? []),
  ].filter(Boolean) as string[];

  if (allCats.some((c) => rules.categories.includes(c))) {
    return { keep: false, reason: "blacklist_category" };
  }

  if (
    rules.minReviews !== null &&
    (item.reviewsCount ?? 0) > rules.minReviews
  ) {
    return { keep: false, reason: "high_reviews_likely_chain" };
  }

  return { keep: true };
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from these new files.

---

## Task 4: `useLeadgenBlacklist` hook

**Files:**
- Create: `src/hooks/leadgen/useLeadgenBlacklist.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenBlacklist, BlacklistRuleType } from "@/types/leadgen";

export function useLeadgenBlacklist() {
  const { currentPortalId } = usePortalDB();
  const [rules, setRules] = useState<LeadgenBlacklist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    const { data } = await supabase
      .from("leadgen_blacklist")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("active", true)
      .order("created_at", { ascending: true });
    setRules((data ?? []) as LeadgenBlacklist[]);
    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const addRule = useCallback(
    async (rule_type: BlacklistRuleType, rule_value: string) => {
      if (!currentPortalId) return { error: "Nessun portale" };
      const { data, error } = await supabase
        .from("leadgen_blacklist")
        .insert({ portal_id: currentPortalId, rule_type, rule_value })
        .select()
        .single();
      if (!error && data) setRules((prev) => [...prev, data as LeadgenBlacklist]);
      return { error: error?.message ?? null };
    },
    [currentPortalId]
  );

  const removeRule = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("leadgen_blacklist")
      .delete()
      .eq("id", id);
    if (!error) setRules((prev) => prev.filter((r) => r.id !== id));
    return { error: error?.message ?? null };
  }, []);

  const seedDefaults = useCallback(async () => {
    if (!currentPortalId) return;
    const count = await supabase
      .from("leadgen_blacklist")
      .select("id", { count: "exact", head: true })
      .eq("portal_id", currentPortalId);
    if ((count.count ?? 0) > 0) return; // already seeded

    const titleKeywords = [
      "Carrefour","Conad","Eurospin","Esselunga","Lidl","MD Discount",
      "Penny Market","Coop","Pam","Tigotà","Acqua&Sapone","McDonald",
      "Burger King","KFC","Subway","Starbucks","Old Wild West","Roadhouse",
      "H&M","Zara","Ovs","Decathlon","Mediaworld","Unieuro","Trony",
      "Euronics","Feltrinelli","Mondadori","IKEA","Leroy Merlin",
      "Bricoman","Bricocenter","Obi",
    ];
    const websiteDomains = [
      "carrefour.it","conad.it","esselunga.it","lidl.it","mcdonalds.it",
      "decathlon.it","ikea.com","mediaworld.it","unieuro.it","hm.com",
      "zara.com","leroymerlin.it",
    ];
    const categories = [
      "Supermarket","Hypermarket","Bank","ATM","Gas station",
      "Post office","Cinema","Hospital","Public school",
    ];

    const rows = [
      ...titleKeywords.map((v) => ({
        portal_id: currentPortalId,
        rule_type: "title_keyword" as const,
        rule_value: v,
      })),
      ...websiteDomains.map((v) => ({
        portal_id: currentPortalId,
        rule_type: "website_domain" as const,
        rule_value: v,
      })),
      ...categories.map((v) => ({
        portal_id: currentPortalId,
        rule_type: "category" as const,
        rule_value: v,
      })),
      {
        portal_id: currentPortalId,
        rule_type: "min_reviews" as const,
        rule_value: "5000",
      },
    ];

    await supabase.from("leadgen_blacklist").insert(rows);
    await fetchRules();
  }, [currentPortalId, fetchRules]);

  const byType = (type: BlacklistRuleType) =>
    rules.filter((r) => r.rule_type === type);

  return { rules, loading, addRule, removeRule, seedDefaults, refetch: fetchRules, byType };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

---

## Task 5: Update `useLeadgenSearches` — multi-category + filter pipeline

**Files:**
- Modify: `src/hooks/leadgen/useLeadgenSearches.ts`

- [ ] **Step 1: Update `createSearch` payload type**

Replace the `createSearch` function in `src/hooks/leadgen/useLeadgenSearches.ts`:

```ts
const createSearch = useCallback(async (payload: {
  country_code: string;
  postal_code: string;
  categories: string[];
  apify_run_id: string;
  apify_dataset_id: string;
}) => {
  if (!currentPortalId) return { error: "Nessun portale selezionato", data: null };
  const { data: row, error } = await supabase
    .from("leadgen_searches")
    .insert({
      ...payload,
      portal_id: currentPortalId,
      status: "running",
      category: payload.categories[0] ?? null,
    })
    .select()
    .single();
  if (!error && row) {
    setSearches((prev) => [row as LeadgenSearch, ...prev]);
    broadcastLeadgenUpdate("search_started", { searchId: row.id });
  }
  return { data: row as LeadgenSearch | null, error: error?.message ?? null };
}, [currentPortalId]);
```

- [ ] **Step 2: Add blacklist filter pipeline to `pollRunning`**

Replace the `if (status === "SUCCEEDED")` block in `pollRunning` (lines 37-86) with this version that loads blacklist rules and filters before upserting:

```ts
if (status === "SUCCEEDED") {
  const items = await getDatasetItems<ApifyPlaceResult>(apifyToken, defaultDatasetId);

  // Load blacklist rules for this portal
  const { data: blacklistRows } = await supabase
    .from("leadgen_blacklist")
    .select("rule_type, rule_value")
    .eq("portal_id", currentPortalId)
    .eq("active", true);

  const bRows = (blacklistRows ?? []) as { rule_type: string; rule_value: string }[];
  const blacklistRules = {
    titleKeywords: bRows.filter((r) => r.rule_type === "title_keyword").map((r) => r.rule_value),
    websiteDomains: bRows.filter((r) => r.rule_type === "website_domain").map((r) => r.rule_value),
    categories: bRows.filter((r) => r.rule_type === "category").map((r) => r.rule_value),
    minReviews: (() => {
      const row = bRows.find((r) => r.rule_type === "min_reviews");
      if (!row) return null;
      const n = parseInt(row.rule_value, 10);
      return isNaN(n) || n === 0 ? null : n;
    })(),
  };

  const kept: typeof items = [];
  let excludedCount = 0;
  for (const item of items) {
    const { keep } = applyBlacklist(blacklistRules, item);
    if (keep) kept.push(item);
    else excludedCount++;
  }

  const leadsToInsert = kept.map((item) => ({
    portal_id: currentPortalId,
    search_id: search.id,
    place_id: item.placeId,
    name: item.title,
    address: item.address ?? null,
    postal_code: item.zip ?? null,
    city: item.city ?? null,
    country_code: item.countryCode ?? null,
    phone: item.phone ?? null,
    website: item.website ?? null,
    category: item.categoryName ?? null,
    rating: item.totalScore ?? null,
    reviews_count: item.reviewsCount ?? null,
    emails: item.emails ?? [],
    social_media: {
      ...(item.instagram ? { instagram: item.instagram } : {}),
      ...(item.facebook ? { facebook: item.facebook } : {}),
      ...(item.twitter ? { twitter: item.twitter } : {}),
      ...(item.linkedin ? { linkedin: item.linkedin } : {}),
    },
    outreach_status: "new" as const,
    outreach_notes: null,
    contacted_at: null,
    created_at: new Date().toISOString(),
  }));

  await supabase
    .from("leadgen_leads")
    .upsert(leadsToInsert, { onConflict: "portal_id,place_id", ignoreDuplicates: true });

  const withWebsite = leadsToInsert.filter((l) => !!l.website).length;
  const withoutWebsite = leadsToInsert.length - withWebsite;

  await supabase
    .from("leadgen_searches")
    .update({
      status: "completed",
      apify_dataset_id: defaultDatasetId,
      total_results: leadsToInsert.length,
      with_website: withWebsite,
      without_website: withoutWebsite,
      excluded_count: excludedCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", search.id);

  broadcastLeadgenUpdate("search_completed", { searchId: search.id });
  await fetchSearches();
}
```

- [ ] **Step 3: Add import for `applyBlacklist`**

At the top of `src/hooks/leadgen/useLeadgenSearches.ts`, add:

```ts
import { applyBlacklist } from "@/lib/leadgenFilter";
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: error that `LeadgenSearch` missing `categories`/`excluded_count` resolved since we updated types in Task 2.

---

## Task 6: Rebuild `LeadgenSearch.tsx`

**Files:**
- Modify: `src/pages/leadgen/LeadgenSearch.tsx`

This is a full rewrite. The file grows significantly — all the country/flag/favorites logic stays, the category input is replaced with the chip multi-select, the filter panel becomes the Advanced panel, and a live cost box appears below the form.

- [ ] **Step 1: Add new imports at top**

```ts
import { PMI_DEFAULT, PMI_EXTRA, MAX_CATEGORIES } from "@/lib/leadgenCategories";
import { countryName } from "@/lib/countries";
import { X as XIcon } from "lucide-react";
```

- [ ] **Step 2: Replace category state**

Remove `const [category, setCategory] = useState("")`.
Add:

```ts
const [categories, setCategories] = useState<string[]>(PMI_DEFAULT);
const [customCatInput, setCustomCatInput] = useState("");
```

- [ ] **Step 3: Update settings effect**

The existing `useEffect` that initialises from `settings` — add `setMaxPlaces(settings.default_max_places)` etc. as already there. No change needed for categories — always default to PMI_DEFAULT.

- [ ] **Step 4: Update cost formula**

Replace existing `calcCost` function with:

```ts
function calcCost(numCategories: number, maxPlaces: number, scrapeContacts: boolean) {
  const total = numCategories * maxPlaces * (scrapeContacts ? 0.006 : 0.004);
  return { total };
}
```

- [ ] **Step 5: Add category helpers**

```ts
const ALL_CHIPS = [...PMI_DEFAULT, ...PMI_EXTRA];

const toggleCategory = (cat: string) => {
  setCategories((prev) =>
    prev.includes(cat)
      ? prev.filter((c) => c !== cat)
      : prev.length >= MAX_CATEGORIES
      ? prev
      : [...prev, cat]
  );
};

const addCustomCategory = () => {
  const trimmed = customCatInput.trim().toLowerCase();
  if (!trimmed || categories.includes(trimmed) || categories.length >= MAX_CATEGORIES) return;
  setCategories((prev) => [...prev, trimmed]);
  setCustomCatInput("");
};

const removeCategory = (cat: string) => {
  setCategories((prev) => prev.filter((c) => c !== cat));
};
```

- [ ] **Step 6: Update `handleSubmit`**

Replace the call to `startGoogleMapsRun` and `createSearch` in `handleSubmit`:

```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!settings?.apify_token) { toast.error("Configura il token Apify nelle impostazioni"); return; }
  if (!postalCode.trim()) { toast.error("Il CAP è obbligatorio"); return; }
  if (categories.length === 0) { toast.error("Seleziona almeno una categoria"); return; }
  setRunning(true);
  try {
    const locName = countryName(countryCode);
    const locationQuery = `${postalCode.trim()}, ${locName}`;
    const { runId, defaultDatasetId } = await startGoogleMapsRun(settings.apify_token, {
      searchStringsArray: categories,
      locationQuery,
      language,
      maxCrawledPlacesPerSearch: maxPlaces,
      scrapeContacts,
      actorId: settings.actor_id,
    });
    const { data: search, error } = await createSearch({
      country_code: countryCode,
      postal_code: postalCode.trim(),
      categories,
      apify_run_id: runId,
      apify_dataset_id: defaultDatasetId,
    });
    if (error || !search) throw new Error(error ?? "Errore creazione ricerca");
    toast.success("Ricerca avviata");
    navigate(`/${portal?.id ?? "redx"}/leadgen/searches?highlight=${search.id}`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Errore avvio ricerca");
  } finally {
    setRunning(false);
  }
};
```

- [ ] **Step 7: Add cost badge helper**

```ts
function CostBadge({ total }: { total: number }) {
  let color: string;
  let text: string;
  if (total < 1) {
    color = "var(--color-success)";
    text = "Coperto dal Free tier ($5/mese)";
  } else if (total < 3) {
    color = "#f59e0b";
    text = "Userà parte del Free credit";
  } else if (total <= 5) {
    color = "#f97316";
    text = "Userà tutto il Free credit";
  } else {
    color = "var(--color-error)";
    text = "Supera il Free credit — valuta upgrade a Starter ($49/mese)";
  }
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "2px 8px",
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      border: `1px solid ${color}`,
      color,
    }}>
      {text}
    </span>
  );
}
```

- [ ] **Step 8: Replace the JSX — search bar row**

In the JSX, the search bar row now has: flag button | CAP input | submit button (no category input inside the bar — categories are in the section below).

Replace the search bar `<form>` contents:

```tsx
<div style={{
  display: "flex",
  alignItems: "stretch",
  border: "1.5px solid var(--glass-border)",
  background: "var(--glass-bg)",
  overflow: "visible",
  position: "relative",
  height: 56,
}}>
  {/* Flag button (unchanged) */}
  <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
    {/* ... existing flag button + dropdown unchanged ... */}
  </div>

  {/* CAP input */}
  <input
    type="text"
    value={postalCode}
    onChange={(e) => setPostalCode(e.target.value)}
    placeholder="CAP — obbligatorio"
    disabled={running}
    maxLength={10}
    autoComplete="off"
    name="leadgen-cap"
    style={{
      flex: 1,
      height: "100%",
      background: "transparent",
      border: "none",
      outline: "none",
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--text-primary)",
      padding: "0 16px",
      letterSpacing: "0.04em",
    }}
    onFocus={(e) => e.currentTarget.parentElement!.style.borderColor = "var(--accent-primary)"}
    onBlur={(e) => e.currentTarget.parentElement!.style.borderColor = "var(--glass-border)"}
  />

  {/* Submit */}
  <button
    type="submit"
    disabled={running || noToken || categories.length === 0}
    style={{
      width: 56,
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: (running || noToken || categories.length === 0) ? "var(--sosa-bg-2)" : "var(--accent-primary)",
      border: "none",
      borderLeft: "1.5px solid var(--glass-border)",
      cursor: (running || noToken || categories.length === 0) ? "not-allowed" : "pointer",
      flexShrink: 0,
      transition: "background 0.15s",
    }}
  >
    {running
      ? <Loader2 size={18} color="#000" style={{ animation: "spin 1s linear infinite" }} />
      : <Search size={18} color={(noToken || categories.length === 0) ? "var(--text-tertiary)" : "#000"} />
    }
  </button>
</div>
```

- [ ] **Step 9: Add category section below the search bar row**

After the `</div>` closing the search bar + filter button row, add this category section (still inside the inner wrapper div):

```tsx
{/* Category section */}
<div style={{ width: "100%", maxWidth: 700, marginTop: 16 }}>
  {/* Preset buttons */}
  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
    <button
      type="button"
      onClick={() => setCategories([...PMI_DEFAULT])}
      style={{
        padding: "6px 14px",
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        background: JSON.stringify(categories) === JSON.stringify(PMI_DEFAULT) ? "var(--accent-primary)" : "transparent",
        border: `1px solid ${JSON.stringify(categories) === JSON.stringify(PMI_DEFAULT) ? "var(--accent-primary)" : "var(--glass-border)"}`,
        color: JSON.stringify(categories) === JSON.stringify(PMI_DEFAULT) ? "#000" : "var(--text-tertiary)",
        cursor: "pointer",
      }}
    >
      PMI Locali (consigliato)
    </button>
    <button
      type="button"
      onClick={() => setCategories([])}
      style={{
        padding: "6px 14px",
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        background: "transparent",
        border: "1px solid var(--glass-border)",
        color: "var(--text-tertiary)",
        cursor: "pointer",
      }}
    >
      Custom
    </button>
    <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: categories.length >= MAX_CATEGORIES ? "var(--color-error)" : "var(--text-tertiary)", alignSelf: "center" }}>
      {categories.length}/{MAX_CATEGORIES}
    </span>
  </div>

  {/* Chip grid */}
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
    {ALL_CHIPS.map((cat) => {
      const selected = categories.includes(cat);
      return (
        <button
          key={cat}
          type="button"
          onClick={() => toggleCategory(cat)}
          disabled={!selected && categories.length >= MAX_CATEGORIES}
          style={{
            padding: "5px 12px",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
            letterSpacing: "0.06em",
            background: selected ? "var(--accent-primary)" : "var(--glass-bg)",
            border: `1px solid ${selected ? "var(--accent-primary)" : "var(--glass-border)"}`,
            color: selected ? "#000" : "var(--text-tertiary)",
            cursor: (!selected && categories.length >= MAX_CATEGORIES) ? "not-allowed" : "pointer",
            opacity: (!selected && categories.length >= MAX_CATEGORIES) ? 0.4 : 1,
            transition: "all 0.1s",
          }}
        >
          {cat}
        </button>
      );
    })}
    {/* Custom categories not in ALL_CHIPS */}
    {categories.filter((c) => !ALL_CHIPS.includes(c)).map((cat) => (
      <button
        key={cat}
        type="button"
        onClick={() => removeCategory(cat)}
        style={{
          padding: "5px 12px",
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
          letterSpacing: "0.06em",
          background: "var(--accent-primary)",
          border: "1px solid var(--accent-primary)",
          color: "#000",
          cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 5,
        }}
      >
        {cat} <XIcon size={10} />
      </button>
    ))}
  </div>

  {/* Custom category input */}
  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
    <input
      type="text"
      value={customCatInput}
      onChange={(e) => setCustomCatInput(e.target.value.slice(0, 40))}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCategory(); } }}
      placeholder="Aggiungi categoria custom..."
      autoComplete="off"
      name="leadgen-custom-cat"
      className="glass-input"
      style={{ flex: 1, fontSize: 12 }}
    />
    <button
      type="button"
      onClick={addCustomCategory}
      disabled={!customCatInput.trim() || categories.length >= MAX_CATEGORIES}
      className="btn-glass-ds"
      style={{ fontSize: 11, whiteSpace: "nowrap" }}
    >
      + Aggiungi
    </button>
  </div>

  {/* Validation message */}
  {categories.length === 0 && (
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-error)", marginBottom: 8 }}>
      Seleziona almeno una categoria
    </p>
  )}

  {/* Preview line */}
  {categories.length > 0 && postalCode.trim() && (
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginBottom: 8 }}>
      Cercherò {categories.length} categor{categories.length === 1 ? "ia" : "ie"} in {postalCode.trim()}, {currentCountry.label} → max {maxPlaces} attività per categoria
    </p>
  )}

  {/* Cost box */}
  {categories.length > 0 && (() => {
    const { total } = calcCost(categories.length, maxPlaces, scrapeContacts);
    const estRaw = categories.length * maxPlaces;
    const estDedup = Math.round(estRaw * 0.7);
    return (
      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Costo stimato: ${total.toFixed(2)}
          </span>
          <CostBadge total={total} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
          Attività massime stimate: {estRaw} (≈ {estDedup} dopo deduplica)
        </span>
      </div>
    );
  })()}
</div>
```

- [ ] **Step 10: Update filter panel — move max/contacts/lang there**

The filter panel (already inside the `ref={filterRef}` div) keeps its existing content but update the slider max to 100 and step to 10, default 30:

```tsx
// Change slider range:
min={10} max={100} step={10}
```

No other changes to the filter panel needed — language and contacts already live there.

- [ ] **Step 11: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

---

## Task 7: Update `LeadgenSettings.tsx` — blacklist section + seeding

**Files:**
- Modify: `src/pages/leadgen/LeadgenSettings.tsx`

- [ ] **Step 1: Add imports**

```ts
import { useLeadgenBlacklist } from "@/hooks/leadgen/useLeadgenBlacklist";
import { Trash2, Plus } from "lucide-react";
import type { BlacklistRuleType } from "@/types/leadgen";
```

- [ ] **Step 2: Add hook + seed effect**

Inside the component, add:

```ts
const { rules, loading: blLoading, addRule, removeRule, seedDefaults, byType } = useLeadgenBlacklist();
const [newRuleInputs, setNewRuleInputs] = useState<Record<BlacklistRuleType, string>>({
  title_keyword: "",
  website_domain: "",
  category: "",
  min_reviews: "",
});
const [addingRule, setAddingRule] = useState<BlacklistRuleType | null>(null);

// Seed defaults once when settings page first loads and blacklist is empty
useEffect(() => {
  if (!blLoading && rules.length === 0) {
    seedDefaults();
  }
}, [blLoading]); // intentionally not including seedDefaults/rules to run once after initial load
```

- [ ] **Step 3: Add `handleAddRule` and `handleMinReviewsSave`**

```ts
const handleAddRule = async (type: BlacklistRuleType) => {
  const value = newRuleInputs[type].trim();
  if (!value) return;
  setAddingRule(type);
  const { error } = await addRule(type, value);
  setAddingRule(null);
  if (error) toast.error(error);
  else setNewRuleInputs((prev) => ({ ...prev, [type]: "" }));
};

const handleMinReviewsSave = async () => {
  const existing = byType("min_reviews")[0];
  const value = newRuleInputs.min_reviews.trim();
  if (existing) await removeRule(existing.id);
  if (value && value !== "0") await addRule("min_reviews", value);
  toast.success("Soglia aggiornata");
};
```

- [ ] **Step 4: Initialize min_reviews input from existing rule**

After the `useEffect` for `hydrated`, add:

```ts
useEffect(() => {
  const mr = byType("min_reviews")[0];
  if (mr) setNewRuleInputs((prev) => ({ ...prev, min_reviews: mr.rule_value }));
}, [rules]);
```

- [ ] **Step 5: Add the blacklist section JSX after the existing "Salva impostazioni" button**

```tsx
{/* Divider */}
<div style={{ height: 1, background: "var(--glass-border)", margin: "40px 0 32px" }} />

<h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
  Blacklist catene
</h2>
<p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)", marginBottom: 28 }}>
  Le attività che corrispondono a queste regole vengono escluse dai risultati e conteggiate separatamente.
</p>

{blLoading ? (
  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>Caricamento regole...</div>
) : (
  <>
    {/* Title keywords */}
    <BlacklistSection
      title="Parole chiave nei nomi"
      help="Corrisponde se il nome dell'attività contiene la parola (case-insensitive)."
      rules={byType("title_keyword")}
      inputValue={newRuleInputs.title_keyword}
      onInputChange={(v) => setNewRuleInputs((p) => ({ ...p, title_keyword: v }))}
      onAdd={() => handleAddRule("title_keyword")}
      onRemove={removeRule}
      adding={addingRule === "title_keyword"}
    />

    {/* Website domains */}
    <BlacklistSection
      title="Domini siti web"
      help="Corrisponde se il sito dell'attività contiene il dominio."
      rules={byType("website_domain")}
      inputValue={newRuleInputs.website_domain}
      onInputChange={(v) => setNewRuleInputs((p) => ({ ...p, website_domain: v }))}
      onAdd={() => handleAddRule("website_domain")}
      onRemove={removeRule}
      adding={addingRule === "website_domain"}
    />

    {/* Categories */}
    <BlacklistSection
      title="Categorie escluse"
      help="Corrisponde se la categoria Google dell'attività è nella lista."
      rules={byType("category")}
      inputValue={newRuleInputs.category}
      onInputChange={(v) => setNewRuleInputs((p) => ({ ...p, category: v }))}
      onAdd={() => handleAddRule("category")}
      onRemove={removeRule}
      adding={addingRule === "category"}
    />

    {/* Min reviews */}
    <div style={{ marginBottom: 28 }}>
      <label style={blLabelStyle}>Soglia recensioni</label>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginBottom: 10 }}>
        Attività con più recensioni di questo numero sono considerate catene ed escluse. Lascia 0 per disattivare.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          min={0}
          value={newRuleInputs.min_reviews}
          onChange={(e) => setNewRuleInputs((p) => ({ ...p, min_reviews: e.target.value }))}
          className="glass-input"
          style={{ width: 120 }}
          placeholder="5000"
        />
        <button type="button" onClick={handleMinReviewsSave} className="btn-glass-ds" style={{ fontSize: 11 }}>
          Salva soglia
        </button>
      </div>
    </div>
  </>
)}
```

- [ ] **Step 6: Add `BlacklistSection` component and `blLabelStyle` outside the main component**

```tsx
const blLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--text-secondary)", display: "block", marginBottom: 8,
};

function BlacklistSection({
  title, help, rules, inputValue, onInputChange, onAdd, onRemove, adding,
}: {
  title: string;
  help: string;
  rules: import("@/types/leadgen").LeadgenBlacklist[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  adding: boolean;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={blLabelStyle}>{title}</label>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginBottom: 10 }}>
        {help}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          className="glass-input"
          style={{ flex: 1 }}
          placeholder="Aggiungi regola..."
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={adding || !inputValue.trim()}
          className="btn-glass-ds"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11 }}
        >
          {adding ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
          Aggiungi
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {rules.map((r) => (
          <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>
            {r.rule_value}
            <button
              type="button"
              onClick={() => onRemove(r.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0, display: "inline-flex" }}
            >
              <Trash2 size={10} />
            </button>
          </span>
        ))}
        {rules.length === 0 && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
            Nessuna regola
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

---

## Task 8: Update `LeadgenSearchHistory.tsx` — exclusion stats

**Files:**
- Modify: `src/pages/leadgen/LeadgenSearchHistory.tsx`

- [ ] **Step 1: Replace the table columns**

Add "Categorie" and "Escluse" columns, update "Categoria" → show first of `categories` array:

In the `thead`:
```tsx
{["Paese", "CAP", "Categorie", "Status", "Salvate", "Escluse", "Con sito", "Senza sito", "Data", "Durata"].map((h) => (
  <th key={h} ...>{h}</th>
))}
```

In the `tbody` row, replace the category `<td>` and add the new columns:
```tsx
<td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>
  {s.categories?.length > 0
    ? s.categories.join(", ")
    : (s.category ?? "—")}
</td>
<td style={{ padding: "10px 12px" }}>
  <SearchProgressIndicator status={s.status} />
</td>
<td style={{ padding: "10px 12px", color: "var(--text-primary)", textAlign: "center" }}>
  {s.total_results}
</td>
<td style={{ padding: "10px 12px", color: "var(--color-error)", textAlign: "center" }}>
  {s.excluded_count ?? 0}
</td>
<td style={{ padding: "10px 12px", color: "var(--color-success)", textAlign: "center" }}>
  {s.with_website}
</td>
<td style={{ padding: "10px 12px", color: "var(--color-error)", textAlign: "center" }}>
  {s.without_website}
</td>
<td style={{ padding: "10px 12px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
  {new Date(s.started_at).toLocaleDateString("it-IT")}
</td>
<td style={{ padding: "10px 12px", color: "var(--text-tertiary)" }}>{duration(s)}</td>
```

Also add a summary stat line below each completed row:
```tsx
{s.status === "completed" && (s.excluded_count ?? 0) > 0 && (
  <tr key={`${s.id}-excl`} style={{ borderBottom: "1px solid var(--glass-border)" }}>
    <td colSpan={10} style={{ padding: "0 12px 8px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
      {s.excluded_count} attività escluse dalla blacklist (catene) —{" "}
      <a href={`/${portal?.id ?? "redx"}/leadgen/settings`} style={{ color: "var(--accent-primary)", textDecoration: "none" }}>
        Gestisci blacklist
      </a>
    </td>
  </tr>
)}
```

Need to import `usePortal` for `portal?.id`. Add:
```ts
import { usePortal } from "@/lib/portalContext";
```
And inside component:
```ts
const { portal } = usePortal();
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

---

## Task 9: Advanced filter panel — `LeadgenNoWebsite` + `LeadgenWithWebsite`

**Files:**
- Modify: `src/pages/leadgen/LeadgenNoWebsite.tsx`
- Modify: `src/pages/leadgen/LeadgenWithWebsite.tsx`

The two pages share identical filter panel logic. Extract to a small hook-pattern inline (no separate file — both files are simple enough that duplication is fine, and DRY extraction would require a context that doesn't exist yet).

- [ ] **Step 1: Add URL state imports**

```ts
import { useSearchParams } from "react-router-dom";
import { Filter } from "lucide-react";
```

- [ ] **Step 2: Define filter state via URL params**

In both pages, replace the existing `[searchText, setSearchText]` + `[outreachFilter, setOutreachFilter]` with URL-backed versions:

```ts
const [searchParams, setSearchParams] = useSearchParams();

const searchText = searchParams.get("q") ?? "";
const outreachFilter = (searchParams.get("status") as OutreachStatus | "all") ?? "all";
const filterCategories = searchParams.getAll("cat");
const minRating = parseFloat(searchParams.get("minRating") ?? "0") || 0;
const maxRating = parseFloat(searchParams.get("maxRating") ?? "5") || 5;
const minReviews = parseInt(searchParams.get("minReviews") ?? "0", 10) || 0;
const maxReviews = parseInt(searchParams.get("maxReviews") ?? "999999", 10) || 999999;
const onlyWithEmail = searchParams.get("email") === "1";
const onlyWithPhone = searchParams.get("phone") === "1";

const setParam = (key: string, value: string | null) => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    if (value === null || value === "" || value === "0" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    return next;
  }, { replace: true });
};

const setMultiParam = (key: string, values: string[]) => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete(key);
    values.forEach((v) => next.append(key, v));
    return next;
  }, { replace: true });
};

const resetFilters = () => setSearchParams({}, { replace: true });
```

- [ ] **Step 3: Update `useLeadgenLeads` call**

Pass the URL-backed values to the hook. The hook already supports `categories`, `minRating`, `cities` etc. We'll add the email/phone/minReviews/maxReviews filtering in the component's `useMemo` over leads since the hook doesn't currently support those exact params.

Keep the hook call simple:
```ts
const { leads: rawLeads, loading, updateLead, prependLead } = useLeadgenLeads({
  hasWebsite: false, // (true for WithWebsite)
  outreachStatus: outreachFilter === "all" ? undefined : outreachFilter,
  searchText,
  categories: filterCategories.length > 0 ? filterCategories : undefined,
  minRating: minRating > 0 ? minRating : undefined,
});
```

Then add client-side filtering:
```ts
const leads = useMemo(() => {
  let result = rawLeads;
  if (minReviews > 0) result = result.filter((l) => (l.reviews_count ?? 0) >= minReviews);
  if (maxReviews < 999999) result = result.filter((l) => (l.reviews_count ?? 0) <= maxReviews);
  if (maxRating < 5) result = result.filter((l) => (l.rating ?? 0) <= maxRating);
  if (onlyWithEmail) result = result.filter((l) => l.emails?.length > 0);
  if (onlyWithPhone) result = result.filter((l) => !!l.phone);
  return result;
}, [rawLeads, minReviews, maxReviews, maxRating, onlyWithEmail, onlyWithPhone]);
```

- [ ] **Step 4: Compute unique categories from rawLeads**

```ts
const uniqueCategories = useMemo(
  () => [...new Set(rawLeads.map((l) => l.category).filter(Boolean) as string[])].sort(),
  [rawLeads]
);
```

- [ ] **Step 5: Count active filters**

```ts
const activeFilterCount = [
  outreachFilter !== "all",
  filterCategories.length > 0,
  minRating > 0,
  maxRating < 5,
  minReviews > 0,
  maxReviews < 999999,
  onlyWithEmail,
  onlyWithPhone,
].filter(Boolean).length;
```

- [ ] **Step 6: Add filter panel state**

```ts
const [filterOpen, setFilterOpen] = useState(false);
const filterRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
      setFilterOpen(false);
    }
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, []);
```

Add `useRef` to imports.

- [ ] **Step 7: Replace the filter bar JSX**

Replace the existing `<div style={{ display: "flex", gap: 12, marginBottom: 20 }}>` filter bar with:

```tsx
<div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
  <input
    type="text" placeholder="Cerca nome, categoria, città..."
    value={searchText} onChange={(e) => setParam("q", e.target.value)}
    className="glass-input" style={{ width: 260 }}
  />

  {/* Outreach status segment */}
  <div style={{ display: "flex", gap: 0, border: "0.5px solid var(--glass-border)", overflow: "hidden" }}>
    {STATUS_FILTERS.map((s) => (
      <button key={s} onClick={() => setParam("status", s)}
        style={{
          padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", border: "none",
          background: outreachFilter === s ? "var(--accent-primary)" : "transparent",
          color: outreachFilter === s ? "#000" : "var(--text-tertiary)",
        }}>
        {s === "all" ? "Tutti" : s}
      </button>
    ))}
  </div>

  {/* Filtri button */}
  <div ref={filterRef} style={{ position: "relative" }}>
    <button
      type="button"
      onClick={() => setFilterOpen((p) => !p)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px",
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        background: filterOpen ? "var(--glass-bg)" : "transparent",
        border: `1px solid ${filterOpen || activeFilterCount > 0 ? "var(--accent-primary)" : "var(--glass-border)"}`,
        color: filterOpen || activeFilterCount > 0 ? "var(--accent-primary)" : "var(--text-tertiary)",
        cursor: "pointer",
      }}
    >
      <Filter size={11} />
      Filtri{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
    </button>

    {filterOpen && (
      <div style={{
        position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
        background: "var(--sosa-bg)", border: "1.5px solid var(--glass-border)",
        width: 300, padding: 20,
        boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
      }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 16 }}>
          Filtri avanzati
        </p>

        {/* Categories multi-select */}
        {uniqueCategories.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>
              Categoria
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    const next = filterCategories.includes(cat)
                      ? filterCategories.filter((c) => c !== cat)
                      : [...filterCategories, cat];
                    setMultiParam("cat", next);
                  }}
                  style={{
                    padding: "3px 8px",
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
                    background: filterCategories.includes(cat) ? "var(--accent-primary)" : "transparent",
                    border: `1px solid ${filterCategories.includes(cat) ? "var(--accent-primary)" : "var(--glass-border)"}`,
                    color: filterCategories.includes(cat) ? "#000" : "var(--text-tertiary)",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rating range */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>
            Rating (min – max)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number" min={0} max={5} step={0.1}
              value={minRating || ""}
              onChange={(e) => setParam("minRating", e.target.value)}
              placeholder="0.0"
              className="glass-input" style={{ width: 70, fontSize: 11 }}
            />
            <span style={{ alignSelf: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>—</span>
            <input
              type="number" min={0} max={5} step={0.1}
              value={maxRating === 5 ? "" : maxRating}
              onChange={(e) => setParam("maxRating", e.target.value)}
              placeholder="5.0"
              className="glass-input" style={{ width: 70, fontSize: 11 }}
            />
          </div>
        </div>

        {/* Reviews range */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>
            N. recensioni (min – max)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number" min={0}
              value={minReviews || ""}
              onChange={(e) => setParam("minReviews", e.target.value)}
              placeholder="0"
              className="glass-input" style={{ width: 80, fontSize: 11 }}
            />
            <span style={{ alignSelf: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>—</span>
            <input
              type="number" min={0}
              value={maxReviews === 999999 ? "" : maxReviews}
              onChange={(e) => setParam("maxReviews", e.target.value)}
              placeholder="∞"
              className="glass-input" style={{ width: 80, fontSize: 11 }}
            />
          </div>
        </div>

        {/* Toggles */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
            <input
              type="checkbox" checked={onlyWithEmail}
              onChange={(e) => setParam("email", e.target.checked ? "1" : null)}
              style={{ accentColor: "var(--accent-primary)" }}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>Solo con email</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox" checked={onlyWithPhone}
              onChange={(e) => setParam("phone", e.target.checked ? "1" : null)}
              style={{ accentColor: "var(--accent-primary)" }}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>Solo con telefono</span>
          </label>
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button" onClick={resetFilters}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Reset filtri
          </button>
        )}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 8: Update `leads` reference in JSX**

The JSX currently uses `leads` from the hook. After Step 3, the hook returns `rawLeads` and we define `leads` from the `useMemo`. Ensure the `<LeadTable leads={leads} ...>` line uses the memoized version.

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/
git commit -m "feat(leadgen): multi-category PMI search, blacklist filter pipeline, advanced lead filters"
```

---

## Self-Review

**Spec coverage:**
- ✅ §1 Schema changes — Task 1
- ✅ §2 Seed defaults — Task 7 Step 2 (`seedDefaults` called in Settings `useEffect`)
- ✅ §3 PMI presets — Task 3 Step 1
- ✅ §4 LeadgenSearch rebuild — Task 6
- ✅ §5 multi-category Apify payload — Task 6 Step 6 (`searchStringsArray: categories`)
- ✅ `countries.ts` — Task 3 Step 2
- ✅ §6 Filter pipeline — Tasks 3 Step 3 + Task 5
- ✅ §7 History exclusion stats — Task 8
- ✅ §8 Blacklist management — Task 7
- ✅ §9 Filter panel on lead lists — Task 9
- ✅ §10 Defaults (PMI_DEFAULT 6 cats, maxPlaces 30, scrapeContacts true) — Tasks 3 + 6
- ✅ §11 Testing checklist — manual verification post-deploy
- ✅ §12 DOD checklist — tasks enforce portal_id filter, type-check run per task

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:**
- `BlacklistRules` (in `leadgenFilter.ts`) vs hook usage in `useLeadgenSearches.ts`: both use `titleKeywords`, `websiteDomains`, `categories`, `minReviews` ✅
- `createSearch` payload in `LeadgenSearch.tsx` (Task 6 Step 6) uses `categories: string[]` matching the updated hook signature (Task 5 Step 1) ✅
- `LeadgenSearch.categories` is `string[]` (Task 2) used in `s.categories?.length` (Task 8) ✅
- `countryName()` (Task 3 Step 2) called with `countryCode` string in Task 6 Step 6 ✅
