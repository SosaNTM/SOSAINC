#!/usr/bin/env node
// Visual-checklist generator for the Recap audit (2026-05-16).
// Prints copy-pasteable URL + expected values for each period.
// Run: node scripts/visual-checklist.mjs

const BASE = "http://localhost:8080/sosa";
const fmt = (n) => `€${n.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;

const lines = [];
const out  = (s) => lines.push(s);
const url  = (path) => { out(""); out(`${BASE}${path}`); };

out("# Recap visual checklist — 2026-05-16 (Saturday)");
out("");
out("Portal: sosa | Owner: sosa@sosainc.com");
out("");

// ── ?p=month ────────────────────────────────────────────────────────────────
out("==================================================");
out("[1] /recap?p=month (May 2026)");
out("==================================================");
url("/recap?p=month");
out("  KPI Entrate           → " + fmt(5070.00));
out("  KPI Uscite            → " + fmt(1958.50));
out("  KPI Saldo Netto       → " + fmt(3111.50) + "   (green, positive)");
out("  KPI Risparmio %       → 61%             (green, ≥20%)");
out("");
out("  Donut Spese (May):    6 slices, no 'Altro'");
out("    Casa        " + fmt(850.00) + "   44%");
out("    Spesa       " + fmt(725.00) + "   37%");
out("    Svago       " + fmt(156.50) + "    8%   (144 + F-01 12.50)");
out("    Trasporti   " + fmt(122.00) + "    6%");
out("    Salute      " + fmt(75.00)  + "     4%");
out("    Abbonamenti " + fmt(30.00)  + "     2%");
out("");
out("  Donut Entrate (May):  5 slices");
out("    Stipendio   " + fmt(3500.00) + "  69%");
out("    Bonus       " + fmt(1000.00) + "  20%");
out("    Freelance   " + fmt(370.00)  + "    7%");
out("    Vendite     " + fmt(105.00)  + "    2%");
out("    Rimborsi    " + fmt(95.00)   + "     2%");
out("");
out("  Trend chart:          daily (16 ticks); peak income day 01 = 3500, day 16 = 1000");
out("  Cashflow waveform:    ends at " + fmt(3111.50) + "; never crosses below 0 in May");
out("  Heatmap hottest cell: Sat 2 May (€850 Affitto)");
out("  Top 5 Spese:          Casa, Spesa (RED bar, 725>600 budget), Svago, Trasporti, Salute");
out("  Transaction Table:    20 rows (May), default sort = date desc, first = today (F-01 or E-24 or I-12)");
out("");

// ── ?p=month&cmp=1 ──────────────────────────────────────────────────────────
out("==================================================");
out("[2] /recap?p=month&cmp=1 (compare on)");
out("==================================================");
url("/recap?p=month&cmp=1");
out("  Δ Entrate:    +15,2 %  (green, up)");
out("  Δ Uscite:     +41,4 %  (red, up=bad)");
out("  Δ Saldo:      +3,2 %   (green, up)");
out("  Δ Risparmio:  −10,4 %  (red, down)");
out("");

// ── ?p=prevmonth ────────────────────────────────────────────────────────────
out("==================================================");
out("[3] /recap?p=prevmonth (April 2026)");
out("==================================================");
url("/recap?p=prevmonth");
out("  KPI Entrate:    " + fmt(4400.00));
out("  KPI Uscite:     " + fmt(1385.00));
out("  KPI Saldo:      " + fmt(3015.00) + "  (green)");
out("  KPI Risparmio:  69%             (green)");
out("  Transactions:   9 rows (3 income, 6 expense)");
out("");

// ── ?p=today ────────────────────────────────────────────────────────────────
out("==================================================");
out("[4] /recap?p=today (Sat 16 May 2026)");
out("==================================================");
url("/recap?p=today");
out("  KPI Entrate:    " + fmt(1000.00) + " (Bonus Q1)");
out("  KPI Uscite:     " + fmt(37.50)   + " (Parcheggio 25 + Caffè 12.50)");
out("  KPI Saldo:      " + fmt(962.50)  + "  (green)");
out("  Transactions:   3 rows");
out("");

// ── ?p=7days ────────────────────────────────────────────────────────────────
out("==================================================");
out("[5] /recap?p=7days (10–16 May 2026)");
out("==================================================");
url("/recap?p=7days");
out("  KPI Entrate:    " + fmt(1225.00) + "  (4 rows)");
out("  KPI Uscite:     " + fmt(485.50)  + "  (8 rows incl. F-01)");
out("  KPI Saldo:      " + fmt(739.50));
out("");

// ── ?p=3months ──────────────────────────────────────────────────────────────
out("==================================================");
out("[6] /recap?p=3months (Mar–May 2026)");
out("==================================================");
url("/recap?p=3months");
out("  KPI Entrate:    " + fmt(13420.00));
out("  KPI Uscite:     " + fmt(4773.50));
out("  KPI Saldo:      " + fmt(8646.50));
out("  Trend chart:    monthly (Mar/Apr/May)");
out("    Mar  income " + fmt(3950.00) + "  expense " + fmt(1430.00));
out("    Apr  income " + fmt(4400.00) + "  expense " + fmt(1385.00));
out("    May  income " + fmt(5070.00) + "  expense " + fmt(1958.50));
out("");

// ── ?p=year ─────────────────────────────────────────────────────────────────
out("==================================================");
out("[7] /recap?p=year (2026)");
out("==================================================");
url("/recap?p=year");
out("  Same totals as 3months (no data outside Mar-May)");
out("");

// ── ?p=prevyear ─────────────────────────────────────────────────────────────
out("==================================================");
out("[8] /recap?p=prevyear (2025)");
out("==================================================");
url("/recap?p=prevyear");
out("  All widgets → empty state (Italian copy: 'Nessun dato')");
out("");

// ── interactions ────────────────────────────────────────────────────────────
out("==================================================");
out("Interaction tests (manual)");
out("==================================================");
out("  Click KPI Entrate          → drill modal '7 tx, €5070'");
out("  Click KPI Uscite           → drill '13 tx, €1958.50'");
out("  Click donut Casa slice     → drill 'Spese — Casa, 1 tx, €850' + table filters to Casa");
out("  Click donut Bonus slice    → drill 'Entrate — Bonus, 1 tx, €1000'");
out("  Click trend day 02         → drill 1 tx (Affitto Maggio)");
out("  Click cashflow day 16      → drill all May 16 tx");
out("  Click heatmap May 2 cell   → drill 1 tx");
out("  Click Top5 Casa row        → drill same as donut Casa");
out("  Filter banner 'Casa ×'     → × clears filter");
out("  Modal close: ESC, X button, overlay click");
out("  Modal centering: panel centered via flex, NO translate(-50%,-50%) regression");
out("");

console.log(lines.join("\n"));
