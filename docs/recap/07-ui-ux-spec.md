# 07 — UI/UX Spec

## Layout ASCII — Desktop (>1280px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [BarChart2] Recap          [Oggi][7g][30g][Mese][Mese prev][3m][YTD][Anno prev][Custom]   [⇄ Confronta]  │
│  Riepilogo finanziario · Apr 2026                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Entrate     │  │ Uscite      │  │ Saldo Netto │  │ Risparmio   │       │
│  │ €3.200      │  │ €1.850      │  │ €1.350      │  │ 42%         │       │
│  │ ▲+8% prev   │  │ ▼-3% prev   │  │ ▲+18% prev  │  │ ▲+4pp       │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐        │
│  │  Spese per categoria         │  │  Entrate per fonte           │        │
│  │                              │  │                              │        │
│  │         (donut)              │  │         (donut)              │        │
│  │    €1.850 al centro          │  │    €3.200 al centro          │        │
│  │  ● Shopping 32%              │  │  ● Salary 70%                │        │
│  │  ● Rent 28%                  │  │  ● Freelance 20%             │        │
│  │  ● Dining 15%                │  │  ● Other 10%                 │        │
│  └──────────────────────────────┘  └──────────────────────────────┘        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Trend Entrate vs Uscite                                             │  │
│  │                                                                      │  │
│  │  (Area chart smooth, 2 aree sovrapposte)                             │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Cashflow nel tempo                                                  │  │
│  │                                                                      │  │
│  │  (Area waveform: verde sopra zero, rosso sotto zero)                 │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐        │
│  │  Top Spese                   │  │  Top Entrate                 │        │
│  │  1 ● Shopping  €590  32%  ↑5%│  │  1 ● Salary   €2.240  70%  =│        │
│  │  2 ● Rent      €520  28% —   │  │  2 ● Freelance €640  20% ▲12%│        │
│  │  3 ● Dining    €278  15% ▼2% │  │  3 ● Other     €320  10% ▲3% │        │
│  └──────────────────────────────┘  └──────────────────────────────┘        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Heatmap Calendario                                                  │  │
│  │  L  M  M  G  V  S  D                                               │  │
│  │  [][][][][][][] Gennaio                                              │  │
│  │  ...                                                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Transazioni     [Filtro attivo: Shopping ×]                        │  │
│  │  [Tutto▾] [Categoria▾] [Metodo▾] [🔍 Cerca...]   [+ Aggiungi]      │  │
│  │  ─────────────────────────────────────────────────────────────────  │  │
│  │  Data     Tipo   Categoria    Titolo         Importo  Metodo  Azioni│  │
│  │  01 Apr   Uscita Shopping     Nike Shoes     €120     Carta   ✏ 🗑  │  │
│  │  ...                                                                 │  │
│  │  [← Prev] Pagina 1 di 3 [Next →]                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Griglia responsive

### Desktop (> 1280px)
- Colonne: 2 per row (donut, top liste) o full-width (trend, cashflow, heatmap, tabella)
- KPI: 4 in riga
- Grid: `display: grid; grid-template-columns: 1fr 1fr; gap: 16px`

### Tablet (768–1280px)
- KPI: 2×2
- Donut: 1fr 1fr (mantiene)
- Top liste: stack verticale (1 colonna)
- Heatmap: scroll orizzontale

### Mobile (< 768px)
- Tutto: single column stack
- KPI: 2×2 con font ridotto (value: 18px invece di 22px)
- Donut: full width, altezza ridotta (height=160)
- Trend/Cashflow: full width, altezza ridotta (height=160)
- Top liste: full width
- Heatmap: scroll orizzontale con scroll indicator
- Tabella: colonne ridotte (nasconde Metodo, Tags; mantiene Data, Tipo, Titolo, Importo, Azioni)
- Period selector: dropdown select invece di pill row

---

## Palette categorie

### Sistema esistente (da financeCategoryStore)

Le categorie hanno colori fissi definiti nel sistema. Il Recap non definisce nuovi colori — usa sempre i colori dalla color map.

| Categoria (Expense) | Colore |
|--------------------|--------|
| Rent | `#8b5cf6` (viola) |
| Utilities | `#f59e0b` (giallo) |
| Groceries | `#10b981` (verde) |
| Transport | `#3b82f6` (blu) |
| Dining | `#ef4444` (rosso) |
| Shopping | `#f97316` (arancio) |
| Healthcare | `#ec4899` (rosa) |
| Entertainment | `#14b8a6` (teal) |
| Education | `#7c3aed` (indigo) |
| Other | `#94a3b8` (grigio) |

| Categoria (Income) | Colore |
|-------------------|--------|
| Salary | `#4ade80` (verde chiaro) |
| Freelance | `#34d399` (verde) |
| Investments | `#22d3ee` (cyan) |
| Sales | `#a78bfa` (lavanda) |
| Refunds | `#fbbf24` (ambra) |
| Rental Income | `#2dd4bf` (teal chiaro) |

Categorie custom create dall'utente usano il colore scelto in Settings.

**Consistency:** lo stesso `catColorMap` va passato come prop a tutti i widget (non ricalcolato in ogni componente).

---

## Animazioni

### Entrata widget (stagger)

```typescript
// Framer Motion — stagger delay incrementale
const widgetVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }
  })
};

// Uso:
<motion.div variants={widgetVariants} custom={0} initial="hidden" animate="visible">
  <KpiCards />
</motion.div>
<motion.div variants={widgetVariants} custom={1} initial="hidden" animate="visible">
  <DonutRow />
</motion.div>
// ...
```

### Transizione su cambio periodo

Quando `period` o `range` cambia:
- I widget mostrano skeleton (isLoading torna true)
- Al completamento fetch: fade-in di 200ms
- Non serve animazione di uscita — il skeleton serve come transizione implicita

### Selezione filtro attivo (donut/trend/heatmap)

Elemento selezionato:
- Donut slice: `stroke="#fff" strokeWidth={2}` via `activeIndex`
- Lista item: `background: var(--glass-bg-elevated)` + `border-left: 3px solid var(--accent-primary)`
- Tabella: banner filtro con `animation: slideDown 0.2s ease`

---

## Accessibilità

- Tutti i chart Recharts: `role="img"` + `aria-label="[descrizione]"` sul wrapper
- Tooltip: non richiede focus per screen reader (usare testo alternativo nell'aria-label)
- Bottoni pill periodo: `aria-pressed={isActive}`
- Tabella: `<table>` semantico con `scope="col"` sugli header
- Modal/Drawer: gestito da Radix (focus trap, escape key, aria-modal automatici)
- Contrast: tutti i colori testati su sfondo `var(--glass-bg)` — ratio minimo 4.5:1
- Keyboard nav: tab attraverso tutti i controlli interattivi, enter per attivare

---

## Loading states — pattern skeleton

Tutti i skeleton replicano la forma dell'elemento:

```tsx
// KPI card skeleton
<div style={{ height: 88, background: "var(--glass-bg)", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite" }} />

// Chart skeleton
<div style={{ height: 200, background: "var(--glass-bg)", borderRadius: 16, animation: "pulse 1.5s ease-in-out infinite" }} />

// Lista item skeleton
<div style={{ height: 40, background: "var(--glass-bg)", borderRadius: 9, marginBottom: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
```

Pulse animation definita in `index.css` (già presente o da aggiungere):
```css
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}
```

---

## Typography

| Elemento | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Titolo widget (label sopra) | `--font-mono` | 11px | 500 | `--text-tertiary` |
| Valore KPI | `--font-mono` | 22px | 700 | specifico (success/error/primary) |
| Delta KPI | `--font-mono` | 11px | 500 | success/error |
| Numero in lista | `--font-mono` | 13px | 600 | `--text-primary` |
| Label legenda | `--font-mono` | 11px | 400 | `--text-secondary` |
| Titolo sezione | `--font-display` | 20px | 700 | `--text-primary` |
| Sottotitolo | `--font-mono` | 12px | 400 | `--text-tertiary` |
| Valore tabella importo | `--font-mono` | 13px | 600 | success/error |
| Testo tabella normale | `--font-body` | 13px | 400 | `--text-primary` |
