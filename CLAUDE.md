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
