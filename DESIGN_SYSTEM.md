# SOSA INC — Design System
> Brutalist hustle aesthetic. Terminal meets Cyberpunk 2077 meets Linear.
> Single source of truth for KEYLO, REDX, TRUST ME, and SOSA portals.

---

## §1. Vision & Aesthetic

**Mood:** Dark ops terminal. Industrial. No softness. Every pixel earned.

**References:**
- Terminal / CLI interfaces — monospace grids, command prompts, system readouts
- Cyberpunk 2077 UI — neon on black, aggressive contrast, data-dense
- Linear — tight spacing, sharp corners, information hierarchy without decoration

**Rules:**
- Black backgrounds only. No gradients on surfaces.
- Neon yellow (#d4ff00) is the system accent. One accent. No alternatives.
- Sharp corners everywhere. `border-radius: 0` as default.
- Monospace for labels, metadata, tags, values. Proportional only for long-form body copy.
- Grain texture on all major surfaces — not a texture pack, an SVG filter at 4% opacity.
- Corner brackets (L-markers) frame content zones. They are not decorative — they are structural.
- No shadows on primary surfaces. Depth via layering and contrast, not shadow.
- No emoji in UI. Use monospace symbols: `→ ↗ ◆ ● ✕ ⌃ ⌄`

---

## §2. Color Tokens

### CSS Variables — add to `:root` in global stylesheet

```css
:root {
  /* === Core palette === */
  --sosa-bg:          #000000;
  --sosa-bg-2:        #0a0a0a;
  --sosa-bg-3:        #111111;
  --sosa-border:      #1a1a1a;
  --sosa-border-dim:  #0f0f0f;

  --sosa-yellow:      #d4ff00;
  --sosa-yellow-dim:  rgba(212, 255, 0, 0.15);
  --sosa-yellow-glow: rgba(212, 255, 0, 0.06);

  --sosa-white:       #ffffff;
  --sosa-white-70:    rgba(255, 255, 255, 0.70);
  --sosa-white-40:    rgba(255, 255, 255, 0.40);
  --sosa-white-20:    rgba(255, 255, 255, 0.20);
  --sosa-white-10:    rgba(255, 255, 255, 0.10);
  --sosa-white-05:    rgba(255, 255, 255, 0.05);

  /* === Portal accent (overridden per portal) === */
  --portal-accent:    #d4ff00;
  --portal-accent-dim: rgba(212, 255, 0, 0.15);

  /* === Semantic === */
  --color-success:    #39ff14;   /* neon green */
  --color-error:      #ff2d55;   /* hot red */
  --color-warning:    #ff9f00;   /* amber */
  --color-info:       #00d4ff;   /* cyan */

  /* === Typography === */
  --font-mono:    'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-display: 'Inter', system-ui, sans-serif;

  /* === Spacing (8px grid) === */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* === Motion === */
  --ease-sharp:  cubic-bezier(0.25, 0, 0, 1);
  --duration-fast:   80ms;
  --duration-normal: 160ms;
  --duration-slow:   280ms;
}
```

### Per-portal accent overrides

```css
[data-portal="sosa"] {
  --portal-accent:    #d4ff00;
  --portal-accent-dim: rgba(212, 255, 0, 0.15);
}

[data-portal="keylo"] {
  --portal-accent:    #00d4ff;
  --portal-accent-dim: rgba(0, 212, 255, 0.15);
}

[data-portal="redx"] {
  --portal-accent:    #ff2d55;
  --portal-accent-dim: rgba(255, 45, 85, 0.15);
}

[data-portal="trustme"] {
  --portal-accent:    #39ff14;
  --portal-accent-dim: rgba(57, 255, 20, 0.15);
}
```

---

## §3. Typography

### Scale

| Role          | Font        | Size  | Weight | Transform  | Tracking    |
|---------------|-------------|-------|--------|------------|-------------|
| Display       | Inter       | 48px  | 700    | uppercase  | -0.02em     |
| Heading 1     | Inter       | 32px  | 700    | —          | -0.01em     |
| Heading 2     | Inter       | 24px  | 600    | —          | -0.01em     |
| Heading 3     | Inter       | 18px  | 600    | —          | 0           |
| Body          | Inter       | 14px  | 400    | —          | 0           |
| Mono label    | JetBrains   | 11px  | 500    | uppercase  | 0.12em      |
| Mono value    | JetBrains   | 13px  | 400    | —          | 0           |
| Mono sm       | JetBrains   | 10px  | 400    | uppercase  | 0.10em      |
| Caption       | Inter       | 12px  | 400    | —          | 0           |

### Rules
- All metadata, tags, labels, status indicators: JetBrains Mono, uppercase, `tracking-widest`
- Numeric values in tables/cards: JetBrains Mono
- Long-form content (descriptions, notes): Inter
- No font mixing within a single label — mono OR proportional, not both

---

## §4. Layout Primitives

### 4.1 Grain Overlay
Fixed full-viewport SVG noise at 4% opacity. Applied once at layout root.

```tsx
// GrainOverlay.tsx
export function GrainOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.04,
      }}
    />
  );
}
```

`@media (prefers-reduced-motion: reduce)` → opacity: 0.

### 4.2 Corner Brackets
Fixed L-shaped markers at viewport corners. 1px yellow, ~40px arms.

```tsx
// CornerBrackets.tsx
const arm = 40;
const corners = [
  { top: 12, left: 12, rotate: '0deg' },
  { top: 12, right: 12, rotate: '90deg' },
  { bottom: 12, right: 12, rotate: '180deg' },
  { bottom: 12, left: 12, rotate: '270deg' },
];
// Each corner: two 1px lines (horizontal + vertical) using border on an L-shaped div
// Color: var(--sosa-yellow), opacity: 0.6
```

### 4.3 Page Shell

Every authenticated page must render inside `<PortalShell>`:

```
┌─────────────────────────────────┐  ← CornerBrackets (fixed)
│ [LOGO LOCKUP]     [NAV...]      │  ← top bar, 48px tall
├─────────────────────────────────┤
│                                 │
│          {children}             │  ← main content
│                                 │
├─────────────────────────────────┤
│ #NOSLEEP × #HUSTLE   © 2026 ●  │  ← HashtagFooter + StatusDot
└─────────────────────────────────┘
   GrainOverlay (fixed, z:9999)
```

---

## §5. Component Patterns

### 5.1 Card

```
┌──────────────────────────────────┐
│▌ CARD TITLE          ↗ ACTION   │  ← top: 3px accent bar left edge, mono title, arrow CTA
├──────────────────────────────────┤
│                                  │
│  {content}                       │
│                                  │
├──────────────────────────────────┤
│ #TAG1 × #TAG2        VALUE MONO  │  ← mono footer row
└──────────────────────────────────┘
```

CSS:
```css
background: var(--sosa-bg-2);
border: 1px solid var(--sosa-border);
border-radius: 0;
border-left: 3px solid var(--portal-accent);
```

### 5.2 Button — Primary

```css
background: var(--sosa-yellow);
color: #000000;
font-family: var(--font-mono);
font-size: 11px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.12em;
border: none;
border-radius: 0;
padding: 10px 16px;
cursor: pointer;
transition: opacity var(--duration-fast) var(--ease-sharp);
```
Label always ends with `↗`. No hover shadow — opacity 0.85 on hover.

### 5.3 Button — Outline / Portal

```css
background: transparent;
color: var(--portal-accent);
border: 1px solid var(--portal-accent);
/* rest same as primary */
```
Label ends with `→`.

### 5.4 Input

```css
background: var(--sosa-bg-2);
border: 1px solid var(--sosa-border);
border-radius: 0;
color: var(--sosa-white);
font-family: var(--font-mono);
font-size: 13px;
padding: 10px 12px 10px 32px; /* left pad for leading symbol */
```
Leading glyph `→` in `var(--sosa-yellow)`, positioned absolute left 12px.
Focus: `border-color: var(--sosa-yellow)`. No box-shadow on focus.

### 5.5 Mono Label

```css
font-family: var(--font-mono);
font-size: 10px;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.12em;
color: var(--sosa-white-40); /* tone="dim" */
/* tone="accent": color: var(--portal-accent) */
```

### 5.6 Status Dot

```
● SYSTEM ACTIVE
```
6px dot, color from tone (`portal` = `--portal-accent`, `system` = `--color-success`).
Mono label uppercase tracking-widest. No animation (no pulse).

### 5.7 Logo Lockup

```
[■] KEYLO
```
6×6 yellow filled square + workspace name uppercase mono. Used in top-left nav.

### 5.8 Hashtag Footer

```
#NOSLEEP × #NOEXCUSES × #HUSTLE
```
Mono, 10px, `--sosa-white-20`. Sits bottom-left of PortalShell.

---

## §6. Tailwind Config Extension

Add to `tailwind.config.js` / `tailwind.config.ts`:

```js
theme: {
  extend: {
    fontFamily: {
      mono:    ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      body:    ['Inter', 'system-ui', 'sans-serif'],
      display: ['Inter', 'system-ui', 'sans-serif'],
    },
    colors: {
      sosa: {
        yellow:  '#d4ff00',
        bg:      '#000000',
        'bg-2':  '#0a0a0a',
        'bg-3':  '#111111',
        border:  '#1a1a1a',
        white:   '#ffffff',
      },
    },
    letterSpacing: {
      widest: '0.12em',
      'extra-wide': '0.16em',
    },
    borderRadius: {
      DEFAULT: '0',
      none:    '0',
      sm:      '0',
      md:      '2px',
      lg:      '2px',
      xl:      '2px',
      '2xl':   '2px',
      full:    '9999px',
    },
    boxShadow: {
      none:    'none',
      DEFAULT: 'none',
    },
  },
},
```

---

## §7. Motion Rules

Motion is optional, purposeful, and fast.

| Trigger           | Property    | Duration | Easing    |
|-------------------|-------------|----------|-----------|
| Button hover/focus | opacity     | 80ms     | ease-sharp |
| Input focus        | border-color| 80ms     | ease-sharp |
| Modal open         | opacity + y transform | 160ms | ease-sharp |
| Page transition    | opacity     | 160ms    | ease-sharp |
| Skeleton pulse     | opacity     | 1200ms   | ease-in-out |

No spring animations. No bounce. No scale transforms on UI elements (scale only for micro-interactions on icon buttons, max 1.05).

`@media (prefers-reduced-motion: reduce)`:
- All transitions: `duration: 0ms`
- GrainOverlay: `opacity: 0`
- Skeleton: static

---

## §8. Microcopy Patterns

- All UI labels in **Italian** (per project convention)
- Error messages: direct, no apology — "Operazione non riuscita" not "Siamo spiacenti..."
- Success: "Salvato" / "Eliminato" / "Aggiornato" — no exclamation marks
- Placeholders use `→` prefix: `→ inserisci importo`
- CTA labels: imperative verb + arrow — "Salva ↗" / "Aggiungi ↗"
- Portal-scoped actions: outline button with `→` — "Visualizza →"
- Empty states: mono uppercase — "NESSUN DATO" not "Nessun risultato trovato qui"

---

## §9. Page Shell Template

```tsx
// PortalShell.tsx
import { GrainOverlay } from './GrainOverlay';
import { CornerBrackets } from './CornerBrackets';
import { LogoLockup } from './LogoLockup';
import { HashtagFooter } from './HashtagFooter';
import { StatusDot } from './StatusDot';

interface PortalShellProps {
  workspace: 'sosa' | 'keylo' | 'redx' | 'trustme';
  children: React.ReactNode;
  className?: string;
}

export function PortalShell({ workspace, children, className }: PortalShellProps) {
  return (
    <div
      data-portal={workspace}
      style={{ background: 'var(--sosa-bg)', minHeight: '100dvh', position: 'relative' }}
      className={className}
    >
      <GrainOverlay />
      <CornerBrackets />

      {/* Top bar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 48, display: 'flex', alignItems: 'center',
        padding: '0 24px', borderBottom: '1px solid var(--sosa-border)',
        background: 'var(--sosa-bg)',
      }}>
        <LogoLockup workspace={workspace} />
        {/* Nav slot */}
      </header>

      {/* Main content */}
      <main style={{ paddingTop: 48, paddingBottom: 48 }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderTop: '1px solid var(--sosa-border)',
        background: 'var(--sosa-bg)',
      }}>
        <HashtagFooter tags={['NOSLEEP', 'NOEXCUSES', 'HUSTLE']} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sosa-white-20)' }}>
            © {new Date().getFullYear()}
          </span>
          <StatusDot label="SYSTEM ACTIVE" tone="system" />
        </div>
      </footer>
    </div>
  );
}
```

---

## §10. Per-Portal Theming

| Portal   | `data-portal` | Accent    | Use Case              |
|----------|--------------|-----------|----------------------|
| SOSA     | `sosa`       | `#d4ff00` | Main / default        |
| KEYLO    | `keylo`      | `#00d4ff` | Logistics / keys      |
| REDX     | `redx`       | `#ff2d55` | High-urgency / alerts |
| TRUST ME | `trustme`    | `#39ff14` | Finance / compliance  |

Set `data-portal` at the `<PortalShell>` root. All components use `var(--portal-accent)` — never hardcode portal hex values in components.

---

## §11. Mobile Rules

Breakpoint: `768px` (md in Tailwind).

- CornerBrackets: arms shrink to 24px, opacity 0.4
- GrainOverlay: unchanged
- Top bar: 48px → 44px, logo left only (no nav — hamburger or bottom nav)
- HashtagFooter: hidden on mobile (< md)
- StatusDot in footer: hidden on mobile
- Cards: full-width, remove left accent bar on < sm
- Mono label size: 10px → 9px on mobile
- All touch targets: minimum 44×44px

---

## §12. Accessibility

- Color contrast: yellow `#d4ff00` on black `#000000` = 13.5:1 (AAA)
- Portal accents (cyan, red, green) all pass AA on black at sizes ≥ 14px
- Focus indicators: 1px `var(--sosa-yellow)` outline, offset 2px — never `outline: none`
- `aria-hidden` on decorative elements (GrainOverlay, CornerBrackets, DiagonalAccent)
- All interactive elements have `aria-label` if icon-only
- `prefers-reduced-motion`: all transitions 0ms, grain hidden
- Semantic HTML: `<header>`, `<main>`, `<footer>`, `<nav>`, `<button>`, `<a>`

---

## §13. Anti-patterns (never do)

| ❌ Don't                                 | ✅ Do instead                          |
|------------------------------------------|----------------------------------------|
| `border-radius: 8px` or higher           | `border-radius: 0` or max `2px`       |
| `box-shadow: 0 4px 24px rgba(...)`       | Layered borders, contrast             |
| Gradient backgrounds (`linear-gradient`) | Solid black + grain overlay           |
| Hardcoded `#d4ff00` in components        | `var(--sosa-yellow)` or `var(--portal-accent)` |
| Emoji in UI (`✅ 🔥 💰`)                 | Mono symbols (`● ◆ → ↗ ✕`)           |
| `rounded-xl`, `rounded-2xl` classes      | No rounding classes                   |
| `shadow-lg`, `shadow-xl` classes         | No shadow classes                     |
| `font-sans` for labels/metadata          | `font-mono`                           |
| Animated SVG loaders / spinners          | Static mono `...` or skeleton lines  |
| Color not from CSS variable              | Always use design tokens              |
