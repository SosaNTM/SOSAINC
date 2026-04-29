# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on port 8080
npm run build      # Production build
npm run lint       # ESLint
npm test           # Run tests once (Vitest)
npm run test:watch # Watch mode tests
npx tsc --noEmit   # Type-check without emitting (use after every code change)
```

## Architecture

**Stack:** Vite + React + TypeScript + Supabase + TailwindCSS + Radix UI + Framer Motion + Sonner (toasts) + Lucide icons

**Supabase project:** `ndudzfaisulnmbpnvkwo`

### Route structure

```
/                     → LoginPage
/hub                  → HubPage (portal selector)
/:portalId/*          → PortalLayout (protected, portal-scoped)
  /dashboard
  /budget, /transactions, /goals, /invoices, ...
  /settings/*         → AdminRoute → SettingsLayout → SettingsRoutes
```

All pages inside `/:portalId/*` are lazy-loaded via `React.lazy`. The Settings section is gated by `AdminRoute` (requires `role === "admin" | "owner"`).

### Provider tree (App.tsx top-down)

```
QueryClientProvider
ThemeProvider
AccentProvider        ← accent color (localStorage + appearance_settings table)
NumberFormatProvider  ← EU/US number format (localStorage)
AuthProvider          ← Supabase auth session
PortalDBProvider      ← current portal from DB, currentPortalId, isOwner, isAdmin
  PortalProvider      ← legacy portal context (use PortalDBProvider instead)
    PeriodProvider
      PortalLayout / Routes
```

Always use `usePortalDB()` (from `@/lib/portalContextDB`) — not the older `usePortal()` — when you need `currentPortalId`, `isOwner`, `isAdmin`.

### Data access pattern

**Generic list hook** (`src/hooks/usePortalData.ts`): all portal-scoped list tables go through this.
```ts
// Auto-scopes by portal_id, re-fetches when portal changes
const { data, loading, error, create, update, remove } = usePortalData<T>("table_name", { orderBy: "sort_order" });
```

**Singleton hook** (one row per portal): defined inline in `src/hooks/settings/index.ts`.
```ts
const { data, loading, upsert } = useSingleton<T>("table_name");
// upserts on portal_id conflict — safe to call without checking existence first
```

All settings hooks are exported from `src/hooks/settings/index.ts`. Add new ones there.

### Design system

CSS variables (not hardcoded hex values) drive all colors:
- `var(--text-primary/secondary/tertiary)` — text hierarchy
- `var(--accent-primary)`, `var(--accent-primary-soft)`, `var(--accent-primary-glow)`
- `var(--glass-bg)`, `var(--glass-border)` — glassmorphism surfaces
- `var(--color-success)`, `var(--color-error)`, `var(--color-warning)`, `var(--color-info)`
- `var(--font-body)`, `var(--font-mono)`, `var(--font-display)` — typography
- `var(--radius-md)`, `var(--radius-lg)`, `var(--radius-xl)` — border radii

CSS utility classes: `glass-input`, `glass-segment`, `glass-segment-item`, `btn-primary`, `btn-glass-ds`

Accent color is controlled by `data-color` attribute on `<html>`. Switch it via `useAccent().setAccent(id)` — do **not** write CSS variables directly.

### Settings section

Location: `src/pages/settings/` + `src/components/settings/`

Reusable components (all in `src/components/settings/`):
- `SettingsPageHeader` — page title + optional `[+ Add]` action button
- `SettingsCard` — glass card wrapper, accepts `title`, `description`, `danger` prop
- `SettingsTable<T>` — CRUD list with loading skeleton, empty state, item count footer
- `SettingsModal` — create/edit modal with Annulla + Salva footer
- `SettingsDeleteConfirm` — red destruction confirmation modal
- `SettingsFormField` — label + error + helper text wrapper
- `SettingsColorPicker` — 12 presets + custom hex
- `SettingsToggle` — on/off switch

All list-based settings pages follow this pattern:
1. `useXxx()` hook → `{ data, loading, create, update, remove }`
2. `errors` state (`Record<string, string>`) reset on modal open, validated before submit
3. `SettingsTable` with `loading` and `onAdd` props
4. `SettingsModal` for create/edit, `SettingsDeleteConfirm` for delete

Types live in `src/types/settings.ts`. Every DB table used by settings has a matching interface there.

### Toast notifications

Use `sonner`:
```ts
import { toast } from "sonner";
toast.success("Messaggio");
toast.error(errorString);
```

All UI labels are in **Italian**. Code, comments, and variable names are in English.

### Internationalization

Simple custom i18n system at `src/i18n`. `getStoredLanguage()` / `setLanguage(code)` / `SUPPORTED_LANGUAGES`. Not react-i18next.

### Multi-portal isolation

Every Supabase query for portal data must include `.eq("portal_id", currentPortalId)`. The `usePortalData` hook does this automatically. For raw `supabase` calls, always add the filter manually. RLS policies enforce this server-side as a second layer.

### localStorage vs Supabase

Most user data lives in Supabase. A small set of UI preferences remain in localStorage: accent color (`STORAGE_ACCENT`), number format (`STORAGE_NUMBER_FORMAT`), theme (`STORAGE_THEME`). All other state that was previously in localStorage has been migrated to Supabase. Do not add new localStorage state for anything that should be portal-scoped or user-profile data.

---

## Design System Brief — SOSA INC UI Unification

> **Status:** Planned. Not yet executed. Read `DESIGN_SYSTEM.md` at repo root before starting.
> **Branch:** `feat/sosa-design-system` — do NOT commit to `main`.

### Mission

Four portals (KEYLO, REDX, TRUST ME, SOSA). Login + hub already match target aesthetic: brutalist, terminal, neon yellow `#d4ff00`, monospace-heavy, sharp corners, grain texture, corner brackets. Inner portal pages are inconsistent. Goal: make every page match visually and structurally without touching routes, business logic, API calls, state, or auth.

### Execution order

**Step 1 — Tokens & config**
1. Add CSS variables from `DESIGN_SYSTEM.md §2` to global stylesheet on `:root` + `[data-portal="..."]` blocks.
2. Extend `tailwind.config.js` per `DESIGN_SYSTEM.md §6` — colors, fonts, tracking, border-radius default `0`.
3. Load fonts: Inter (display + body), JetBrains Mono (mono) via `<link>` tags or `@font-face`.
4. Add `data-portal` attribute at layout level so accent flips per portal route.

Commit: `chore(design): add SOSA design tokens and per-portal theming`

**Step 2 — Shared primitives** (create in `components/sosa/`)
- `<CornerBrackets />` — fixed L-markers, 1px `--sosa-yellow`, ~40px arms
- `<GrainOverlay />` — fixed full-viewport SVG noise, 4% opacity, pointer-events none
- `<DiagonalAccent />` — optional 1px yellow diagonal, 12% opacity
- `<LogoLockup workspace="keylo|redx|trust|sosa" />` — 6×6 yellow square + uppercase mono name
- `<MonoLabel tone="accent|dim" />` — uppercase, tracking-widest, mono
- `<StatusDot label="ACTIVE" tone="portal|system" />` — 6px dot + mono label
- `<HashtagFooter tags={[...]} />` — `#A × #B × #C` mono row
- `<Button variant="primary|outline" arrow="↗|→" />` — sharp, mono uppercase, arrow suffix
- `<Input leadingSymbol="→" />` — black bg, mono, yellow glyph, yellow focus border
- `<Card accent="portal" />` — black bg, top accent bar, brand box icon, mono footer

Rules: accept `className` prop, use CSS variables (no hardcoded hex), zero extra animation.

Commit: `feat(design): add SOSA shared primitives`

**Step 3 — PortalShell** (`components/sosa/PortalShell.tsx`)
Wrap every authenticated page. Contains: `<GrainOverlay>`, `<CornerBrackets>`, top-left `<LogoLockup>`, `{children}`, bottom-left `<HashtagFooter>`, bottom-right `© year + <StatusDot>`. Sets `data-portal={workspace}` on root.

Commit: `feat(design): add PortalShell layout wrapper`

**Step 4 — Refactor portals** (KEYLO → REDX → TRUST ME → SOSA)
Per portal: wrap routes in `<PortalShell>`, replace `rounded-xl/2xl/shadow-lg/gradients` with sharp equivalents, swap labels → `<MonoLabel>`, buttons → `<Button>`, badges → `<StatusDot>`, emoji → `→ ↗ ◆ ● ✕ ⌃ ⌄`, cards → `DESIGN_SYSTEM.md §5.1` pattern. Screenshot diff before moving to next portal.

Commit per portal: `refactor(<portal>): apply SOSA design system`

**Step 5 — Audit checklist**
- [ ] No border-radius > 2px unintentional
- [ ] No box-shadow on primary surfaces
- [ ] No gradients except grain
- [ ] All form labels use `<MonoLabel />`
- [ ] All primary CTAs: `--sosa-yellow` bg + `↗`
- [ ] All portal CTAs: `--portal-accent` outline + `→`
- [ ] Every auth page inside `<PortalShell>`
- [ ] Per-portal accent flips on navigation
- [ ] No emoji in UI
- [ ] `prefers-reduced-motion` respected on grain
- [ ] No hex scattered in components — tokens only
- [ ] Mobile: brackets + grain visible, type scales, layouts stack

Commit: `chore(design): audit cleanup pass`

### Hard constraints
- No new dependencies — Tailwind + React + existing `package.json` only
- Do not soften aesthetic — no rounding, no gradients, no shadows unless spec says so
- Visual refactor only — routes, logic, API, state, auth untouched
- Ask before deviating from `DESIGN_SYSTEM.md`

### Definition of done
- All routes inside `<PortalShell>`
- Login/hub and inner pages look like same product
- Tailwind config + CSS variables only source of truth for colors/fonts/spacing
- New dev can ship compliant page in <30 min after reading `DESIGN_SYSTEM.md`
