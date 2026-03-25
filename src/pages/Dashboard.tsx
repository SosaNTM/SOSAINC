import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Target, CreditCard, Zap,
  Check, Pause, Play,
  Calendar, ChevronDown, X, Plus, Pencil, Trash2, Bitcoin, Gift,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { type DashboardPeriod } from "@/portals/finance/services/financialData";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { useDashboardSubscriptions } from "@/hooks/useDashboardSubscriptions";
import { useDashboardTransactions } from "@/hooks/useDashboardTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useInvestments } from "@/hooks/useInvestments";
import { useNetWorth } from "@/hooks/useNetWorth";
import { useCryptoChart } from "@/portals/finance/hooks/useCryptoChart";
import { useCryptoPortfolio } from "@/portals/finance/hooks/useCryptoPortfolio";
import { formatEUR } from "@/portals/finance/utils/currency";
import { InvestmentModal } from "@/components/InvestmentModal";
import { calcCurrentValue, calcPnL, calcROI, type Investment, INVESTMENT_TYPE_LABELS } from "@/lib/investmentStore";
import { usePortal } from "@/lib/portalContext";
import { WaterfallChart } from "@/portals/finance/components/WaterfallChart";
import type { WaterfallDataPoint } from "@/portals/finance/types/businessFinance";

/* ── Period filter ────────────────────────────────────────────────── */

type Period = DashboardPeriod;

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "1d",  label: "Today" },
  { value: "7d",  label: "Last 7 days" },
  { value: "1m",  label: "Last month" },
  { value: "3m",  label: "Last 3 months" },
  { value: "1y",  label: "Last year" },
  { value: "all", label: "All" },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function cutoffForPeriod(period: Period): Date | null {
  if (period === "all") return null;
  if (period === "1d")  return daysAgo(0);
  if (period === "7d")  return daysAgo(7);
  if (period === "1m")  return daysAgo(30);
  if (period === "3m")  return daysAgo(90);
  return daysAgo(365);
}

/* ── Animation variants ──────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: (delay = 0) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── Sub-components ──────────────────────────────────────────────── */

function SparklineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "6px 12px" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>€{payload[0].value.toLocaleString("en-US")}</p>
    </div>
  );
}

function CategoryTag({ category, color, icon }: { category: string; color?: string; icon?: string }) {
  const col = color ?? "#8b8b8b";
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: `${col}20`, color: col, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
      {category}
    </span>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

const Dashboard = () => {
  const [period, setPeriod]           = useState<Period>("1m");
  const navigate = useNavigate();
  const { portal } = usePortal();
  const isBusinessPortal = portal?.id !== "sosa";
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { goals: GOALS } = useFinancialGoals();
  const { subs, totalMonthly, toggleSub } = useDashboardSubscriptions();
  const { transactions: allTransactions, rawTransactions } = useDashboardTransactions();
  const { getCategoryColor, getCategoryIcon } = useCategories();
  const { investments, totalValue, totalCost, totalPnL, totalROI, addInvestment, updateInvestment, deleteInvestment } = useInvestments();

  const nw = useNetWorth();
  const { enrichedHoldings } = useCryptoPortfolio();
  const { chartData: cryptoChartData } = useCryptoChart(enrichedHoldings, 30);

  const [invModalOpen, setInvModalOpen]     = useState(false);
  const [editingInv,   setEditingInv]       = useState<Investment | undefined>(undefined);
  const [deleteInvId,  setDeleteInvId]      = useState<string | null>(null);

  function openAddInv()            { setEditingInv(undefined); setInvModalOpen(true); }
  function openEditInv(inv: Investment) { setEditingInv(inv); setInvModalOpen(true); }
  function handleInvSave(data: Omit<Investment, "id">) {
    if (editingInv) updateInvestment(editingInv.id, data);
    else addInvestment(data);
  }

  const isCustomActive = period === ("custom" as Period);

  function selectPeriod(p: Period) { setPeriod(p); setCustomRange(undefined); }

  function applyCustomRange(range: DateRange | undefined) {
    setCustomRange(range);
    if (range?.from) setPeriod("custom" as Period);
  }

  function clearCustom() { setCustomRange(undefined); setPeriod("1m"); setCalendarOpen(false); }

  const customLabel = useMemo(() => {
    if (!customRange?.from) return "Custom";
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    if (!customRange.to) return fmt(customRange.from);
    return `${fmt(customRange.from)} - ${fmt(customRange.to)}`;
  }, [customRange]);

  const filteredTransactions = useMemo(() => {
    if (isCustomActive && customRange?.from) {
      const from  = customRange.from;
      const to    = customRange.to ?? customRange.from;
      const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999);
      return allTransactions.filter((tx) => tx.date >= from && tx.date <= toEnd);
    }
    const cutoff = cutoffForPeriod(period);
    if (!cutoff) return allTransactions;
    return allTransactions.filter((tx) => tx.date >= cutoff);
  }, [period, customRange, isCustomActive, allTransactions]);

  const liveNetWorth    = nw.netWorth;
  const liveInvestments = nw.portfolioValue;

  // Use transaction-based trend if available, otherwise fall back to crypto chart
  const rawBalanceTrend = nw.balanceTrend;
  const balanceTrend = rawBalanceTrend.length > 1
    ? rawBalanceTrend
    : cryptoChartData.length > 1
      ? cryptoChartData.map((p) => ({ label: p.date, balance: p.value }))
      : [];
  const trendStart   = balanceTrend[0]?.balance ?? liveNetWorth;
  const trendEnd     = balanceTrend[balanceTrend.length - 1]?.balance ?? liveNetWorth;
  const trendDelta   = trendEnd - trendStart;
  const trendUp      = trendDelta >= 0;

  const periodIncome   = filteredTransactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const periodExpenses = filteredTransactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  /* ── Business waterfall data (non-sosa portals) ───────────── */
  const waterfallMetrics = useMemo(() => {
    if (!isBusinessPortal) return null;
    const classified = rawTransactions.filter((tx) => !!tx.cost_classification);
    if (classified.length === 0) return null;
    const revenue    = classified.filter((tx) => tx.cost_classification === "revenue").reduce((s, tx) => s + tx.amount, 0);
    const cogs       = classified.filter((tx) => tx.cost_classification === "cogs").reduce((s, tx) => s + tx.amount, 0);
    const opex       = classified.filter((tx) => tx.cost_classification === "opex").reduce((s, tx) => s + tx.amount, 0);
    const grossProfit = revenue - cogs;
    const ebitda      = grossProfit - opex;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMarginPct   = revenue > 0 ? (ebitda / revenue) * 100 : 0;

    const waterfallData: WaterfallDataPoint[] = [
      { name: "Ricavi",          value: revenue,      start: 0,           end: revenue,      isTotal: true  },
      { name: "COGS",            value: -cogs,        start: revenue,     end: revenue - cogs, isNegative: true },
      { name: "Margine Lordo",   value: grossProfit,  start: 0,           end: grossProfit,  isTotal: true  },
      { name: "OPEX",            value: -opex,        start: grossProfit, end: grossProfit - opex, isNegative: true },
      { name: "EBITDA",          value: ebitda,       start: 0,           end: ebitda,       isTotal: true  },
    ];

    return { revenue, cogs, opex, grossProfit, ebitda, grossMarginPct, netMarginPct, waterfallData };
  }, [isBusinessPortal, rawTransactions]);

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* ══ BUSINESS DASHBOARD (Keylo / RedX / TrustMe) ══════════ */}
      {isBusinessPortal && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5"
        >
          {/* ── Hero KPI row: 3 headline numbers ──────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Revenue",
                value: waterfallMetrics?.revenue ?? 0,
                color: "#22c55e",
                accent: "rgba(34,197,94,0.10)",
                border: "rgba(34,197,94,0.18)",
                icon: <TrendingUp style={{ width: 18, height: 18 }} />,
              },
              {
                label: "Margine Lordo",
                value: waterfallMetrics?.grossProfit ?? 0,
                color: "#c9a96e",
                accent: "rgba(201,169,110,0.10)",
                border: "rgba(201,169,110,0.18)",
                icon: <Wallet style={{ width: 18, height: 18 }} />,
                sub: waterfallMetrics ? `${waterfallMetrics.grossMarginPct.toFixed(1)}%` : undefined,
              },
              {
                label: "Utile Netto (EBITDA)",
                value: waterfallMetrics?.ebitda ?? 0,
                color: (waterfallMetrics?.ebitda ?? 0) >= 0 ? "#22c55e" : "#ef4444",
                accent: (waterfallMetrics?.ebitda ?? 0) >= 0 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                border: (waterfallMetrics?.ebitda ?? 0) >= 0 ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                icon: <Target style={{ width: 18, height: 18 }} />,
                sub: waterfallMetrics ? `${waterfallMetrics.netMarginPct.toFixed(1)}%` : undefined,
              },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  padding: "20px 22px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--glass-bg)",
                  border: `1px solid ${kpi.border}`,
                  backdropFilter: "blur(16px)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Subtle accent glow */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${kpi.color}60, transparent)`, borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }} />
                <div className="flex items-center justify-between mb-3">
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>
                    {kpi.label}
                  </p>
                  <span style={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</span>
                </div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, color: kpi.color, letterSpacing: "-0.5px", lineHeight: 1 }}>
                  {formatEUR(kpi.value)}
                </p>
                {kpi.sub && (
                  <p style={{ fontSize: 12, fontWeight: 600, color: kpi.color, opacity: 0.75, marginTop: 6 }}>
                    {kpi.sub} margine
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          {/* ── Waterfall + Cost breakdown side-by-side ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Waterfall chart — spans 2 cols */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(16px)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-lg)",
                padding: "22px 24px",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
                    Struttura Profitto
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                    {PERIOD_LABELS.find((p) => p.value === period)?.label ?? "Periodo corrente"}
                  </p>
                </div>
              </div>
              {waterfallMetrics ? (
                <WaterfallChart data={waterfallMetrics.waterfallData} netRevenue={waterfallMetrics.revenue} />
              ) : (
                <div style={{
                  height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                  borderRadius: 12, background: "var(--glass-bg-subtle, rgba(255,255,255,0.02))",
                  border: "0.5px dashed var(--glass-border)",
                }}>
                  <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>Nessuna transazione classificata</p>
                  <p style={{ fontSize: 11, color: "var(--text-quaternary)", opacity: 0.6 }}>Classifica le transazioni per vedere il waterfall</p>
                </div>
              )}
            </motion.div>

            {/* Cost breakdown cards — stacked on the right */}
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {[
                {
                  label: "COGS",
                  sub: "Costo del Venduto",
                  value: waterfallMetrics?.cogs ?? 0,
                  pct: waterfallMetrics && waterfallMetrics.revenue > 0
                    ? ((waterfallMetrics.cogs / waterfallMetrics.revenue) * 100).toFixed(1)
                    : "0.0",
                  color: "#f97316",
                  barBg: "rgba(249,115,22,0.08)",
                  barFill: "rgba(249,115,22,0.55)",
                },
                {
                  label: "OPEX",
                  sub: "Spese Operative",
                  value: waterfallMetrics?.opex ?? 0,
                  pct: waterfallMetrics && waterfallMetrics.revenue > 0
                    ? ((waterfallMetrics.opex / waterfallMetrics.revenue) * 100).toFixed(1)
                    : "0.0",
                  color: "#f87171",
                  barBg: "rgba(248,113,113,0.08)",
                  barFill: "rgba(248,113,113,0.55)",
                },
                {
                  label: "Margine Lordo %",
                  sub: "Revenue − COGS",
                  value: null,
                  pct: waterfallMetrics ? waterfallMetrics.grossMarginPct.toFixed(1) : "0.0",
                  color: "#c9a96e",
                  barBg: "rgba(201,169,110,0.08)",
                  barFill: "rgba(201,169,110,0.55)",
                },
                {
                  label: "Margine Netto %",
                  sub: "EBITDA / Revenue",
                  value: null,
                  pct: waterfallMetrics ? waterfallMetrics.netMarginPct.toFixed(1) : "0.0",
                  color: (waterfallMetrics?.ebitda ?? 0) >= 0 ? "#22c55e" : "#ef4444",
                  barBg: (waterfallMetrics?.ebitda ?? 0) >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  barFill: (waterfallMetrics?.ebitda ?? 0) >= 0 ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)",
                },
              ].map((item, i) => (
                <div
                  key={item.label}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    backdropFilter: "blur(16px)",
                    flex: 1,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.label}</p>
                      <p style={{ fontSize: 9, color: "var(--text-quaternary)", marginTop: 1 }}>{item.sub}</p>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: "var(--font-display)", letterSpacing: "-0.3px" }}>
                      {item.value !== null ? formatEUR(item.value) : `${item.pct}%`}
                    </p>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ height: 4, borderRadius: 99, background: item.barBg, marginTop: 8, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.abs(parseFloat(item.pct)))}%` }}
                      transition={{ delay: 0.3 + 0.08 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: "100%", borderRadius: 99, background: item.barFill }}
                    />
                  </div>
                  {item.value !== null && (
                    <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginTop: 4, textAlign: "right" }}>
                      {item.pct}% dei ricavi
                    </p>
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ── Period filter bar ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <Calendar style={{ width: 16, height: 16, color: "var(--text-quaternary)" }} />
          <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500 }}>Period:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--segment-bg)", border: "1px solid var(--segment-border)", borderRadius: "var(--radius-sm)", padding: 3, flexWrap: "wrap" }}>
            {PERIOD_LABELS.map((p) => (
              <button key={p.value} type="button" onClick={() => selectPeriod(p.value)}
                style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: period === p.value && !isCustomActive ? "var(--segment-active-bg)" : "transparent", color: period === p.value && !isCustomActive ? "var(--segment-active-text)" : "var(--segment-text)", boxShadow: period === p.value && !isCustomActive ? "var(--glass-shadow)" : "none", transition: "all 0.15s" }}>
                {p.label}
              </button>
            ))}
          </div>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button type="button"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid var(--segment-border)", cursor: "pointer", whiteSpace: "nowrap", background: isCustomActive ? "var(--segment-active-bg)" : "var(--segment-bg)", color: isCustomActive ? "var(--segment-active-text)" : "var(--segment-text)", boxShadow: isCustomActive ? "var(--glass-shadow)" : "none", transition: "all 0.15s" }}>
                <Calendar style={{ width: 12, height: 12 }} />
                {customLabel}
                <ChevronDown style={{ width: 12, height: 12, opacity: 0.6 }} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: 0, width: "auto", boxShadow: "var(--glass-shadow)" }}>
              <CalendarPicker mode="range" selected={customRange} onSelect={(r) => applyCustomRange(r)} numberOfMonths={2} disabled={{ after: new Date() }} toDate={new Date()} />
              <div style={{ padding: "8px 12px", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={clearCustom} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <X style={{ width: 10, height: 10 }} /> Cancel
                </button>
                <button type="button" onClick={() => setCalendarOpen(false)} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "none", background: "var(--segment-active-bg)", color: "var(--segment-active-text)", cursor: "pointer" }}>
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      {/* ── 1. Net Worth + Quick stats ────────────────────────────── */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        <motion.div className="lg:col-span-2 group relative rounded-2xl overflow-hidden p-[0.5px]" variants={fadeUp} custom={0}
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 40%, transparent 60%, rgba(255,255,255,0.04))" }}>
          <div className="relative rounded-2xl p-5 sm:p-7 h-full" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)" }}>
            <BorderBeam size={200} duration={14} colorFrom="#C9A84C" colorTo="transparent" borderWidth={1} className="opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* Top: Net Worth value + trend badge */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 6 }}>Net Worth</p>
                <p style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  €{liveNetWorth === 0 ? "0.00" : <NumberTicker value={liveNetWorth} decimalPlaces={2} className="text-[clamp(28px,5vw,44px)] font-bold" style={{ color: "var(--text-primary)" } as React.CSSProperties} />}
                </p>
              </div>
              {trendDelta !== 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: trendUp ? "rgba(46,204,113,0.12)" : "rgba(255,90,90,0.12)", color: trendUp ? "#2ECC71" : "#FF5A5A", flexShrink: 0, marginTop: 4 }}>
                  {trendUp ? <TrendingUp style={{ width: 10, height: 10 }} /> : <TrendingDown style={{ width: 10, height: 10 }} />}
                  {trendUp ? "+" : ""}€{Math.abs(trendDelta).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Chart: full-width sparkline */}
            {balanceTrend.length > 1 ? (
              <div style={{ margin: "0 -8px" }}>
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={balanceTrend} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide />
                    <YAxis hide domain={["dataMin * 0.95", "dataMax * 1.05"]} />
                    <Tooltip content={<SparklineTooltip />} />
                    <Area type="monotone" dataKey="balance" stroke="#C9A84C" strokeWidth={2} fill="url(#balGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "var(--glass-bg-subtle, rgba(255,255,255,0.02))", border: "0.5px dashed var(--glass-border)", margin: "0 -4px" }}>
                <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Add holdings to see your trend</p>
              </div>
            )}

            {/* Bottom: stats row */}
            <div className="flex gap-0 mt-4" style={{ borderTop: "0.5px solid var(--glass-border)", paddingTop: 14 }}>
              {[
                ...(nw.cryptoValue > 0 ? [{ label: "Crypto", value: formatEUR(nw.cryptoValue), sub: nw.cryptoChange24h !== 0 ? `${nw.cryptoChange24hPercent >= 0 ? "+" : ""}${nw.cryptoChange24hPercent.toFixed(1)}%` : undefined, color: "#f7931a" }] : []),
                ...(!isBusinessPortal && liveInvestments > 0 ? [{ label: "Portfolio", value: formatEUR(liveInvestments), color: "#2ECC71" }] : []),
                ...(nw.giftCardsValue > 0 ? [{ label: "Gift Cards", value: formatEUR(nw.giftCardsValue), sub: `${nw.giftCardsActiveCount} attive`, color: "#c9a96e" }] : []),
                ...(periodIncome > 0 ? [{ label: "Income", value: `€${periodIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "#2ECC71" }] : []),
                ...(periodExpenses > 0 ? [{ label: "Expenses", value: `€${periodExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "#FF5A5A" }] : []),
                ...(nw.savingsRate > 0 ? [{ label: "Savings", value: `${nw.savingsRate}%`, color: "#4A9EFF" }] : []),
                ...(nw.subscriptionsCost > 0 ? [{ label: "Subs", value: formatEUR(nw.subscriptionsCost), color: "#8b5cf6" }] : []),
              ].map((stat, i, arr) => (
                <React.Fragment key={stat.label}>
                  <div className="flex-1 text-center" style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginBottom: 3 }}>{stat.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: stat.color, fontVariantNumeric: "tabular-nums" }}>{stat.value}</p>
                    {"sub" in stat && stat.sub && (
                      <p style={{ fontSize: 9, fontWeight: 600, color: stat.sub.startsWith("+") ? "#22c55e" : "#ef4444", marginTop: 1 }}>{stat.sub}</p>
                    )}
                  </div>
                  {i < arr.length - 1 && <div style={{ width: 1, background: "var(--glass-border)", alignSelf: "stretch", margin: "2px 0" }} />}
                </React.Fragment>
              ))}
              {/* Fallback when no stats at all */}
              {nw.cryptoValue === 0 && liveInvestments === 0 && periodIncome === 0 && periodExpenses === 0 && (
                <div className="flex-1 text-center">
                  <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Add transactions or crypto to see stats</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Assets / Liabilities */}
        <div className="flex flex-col gap-4">
          {[
            ...(!isBusinessPortal ? [{ label: "Portfolio", value: formatEUR(liveInvestments), sub: "Investment portfolio", color: "#2ECC71", icon: <Wallet style={{ width: 16, height: 16 }} /> }] : []),
            { label: "Crypto",         value: formatEUR(nw.cryptoValue), sub: nw.cryptoChange24h !== 0 ? `${nw.cryptoChange24hPercent >= 0 ? "+" : ""}${nw.cryptoChange24hPercent.toFixed(1)}% (24h)` : "Crypto portfolio", color: "#f7931a", icon: <Bitcoin style={{ width: 16, height: 16 }} />, link: "crypto" },
            { label: "Gift Cards",     value: formatEUR(nw.giftCardsValue), sub: nw.giftCardsActiveCount > 0 ? `${nw.giftCardsActiveCount} attive` : "Nessuna card", color: "#c9a96e", icon: <Gift style={{ width: 16, height: 16 }} />, link: "gift-cards", badge: nw.giftCardsExpiringSoon },
            { label: "Subscriptions",  value: formatEUR(nw.subscriptionsCost), sub: "Monthly active cost", color: "#8b5cf6", icon: <Zap style={{ width: 16, height: 16 }} /> },
          ].map((item, i) => (
            <motion.div key={item.label} variants={fadeUp} custom={0.1 + i * 0.08} className="group relative rounded-2xl p-[0.5px] overflow-hidden flex-1"
              style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.07), transparent 70%)", cursor: "link" in item && item.link ? "pointer" : "default" }}
              onClick={() => { if ("link" in item && item.link) navigate(item.link); }}>
              <div className="relative rounded-2xl p-4 h-full" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)" }}>
                <div className="flex items-center justify-between mb-1">
                  <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{item.label}</p>
                  <span style={{ color: item.color }}>{item.icon}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{item.value}</p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── 2. Goals ─────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} custom={0.3} initial="hidden" animate="visible">
        <LiquidGlassCard accentColor="#2ECC71" hover={false}>
          <div className="flex items-center gap-2.5 mb-4">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(46,204,113,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target style={{ width: 16, height: 16, color: "#2ECC71" }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Goals</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {GOALS.map((goal, i) => {
              const pct       = Math.min(100, Math.round((goal.saved / goal.target) * 100));
              const remaining = goal.target - goal.saved;
              return (
                <motion.div key={goal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: `0.5px solid ${goal.color}25` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{goal.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CategoryTag category={goal.category} color={goal.color} />
                        <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>by {goal.deadline}</span>
                      </div>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${goal.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {pct >= 100 ? <Check style={{ width: 16, height: 16, color: goal.color }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: goal.color }}>{pct}%</span>}
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 10 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, delay: 0.15 + 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${goal.color}99, ${goal.color})` }} />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Saved</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: goal.color }}>€{goal.saved.toLocaleString("en-US")}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Remaining</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>€{remaining.toLocaleString("en-US")}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Target</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)" }}>€{goal.target.toLocaleString("en-US")}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </LiquidGlassCard>
      </motion.div>

      {/* ── 3. Investments (SOSA only) ──────────────────────────── */}
      {!isBusinessPortal && (
      <motion.div variants={fadeUp} custom={0.38} initial="hidden" animate="visible">
        <LiquidGlassCard accentColor="#22d3ee" hover={false}>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp style={{ width: 16, height: 16, color: "#22d3ee" }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Portfolio</h3>
            </div>
            <button type="button" onClick={openAddInv} className="glass-btn-primary flex items-center gap-1.5" style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total Value",  value: formatEUR(totalValue), color: "#22d3ee" },
              { label: "Invested",     value: formatEUR(totalCost),  color: "var(--text-primary)" },
              { label: "P&L",          value: formatEUR(totalPnL, { sign: true }), color: totalPnL >= 0 ? "#2ECC71" : "#FF5A5A" },
              { label: "Return",       value: `${totalROI >= 0 ? "+" : ""}${totalROI.toFixed(1)}%`, color: totalROI >= 0 ? "#2ECC71" : "#FF5A5A" },
            ].map((s) => (
              <div key={s.label} style={{ padding: "12px 16px", borderRadius: 12, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: "0.5px solid var(--glass-border)" }}>
                <p style={{ fontSize: 10, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: s.color, letterSpacing: "-0.4px", marginTop: 4 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Holdings + donut */}
          <div className="flex gap-5 items-start">
            {/* Holdings list */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <AnimatePresence>
                {investments.map((inv, i) => {
                  const value  = calcCurrentValue(inv);
                  const pnl    = calcPnL(inv);
                  const roi    = calcROI(inv);
                  const isConfirm = deleteInvId === inv.id;
                  return (
                    <motion.div key={inv.id} layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: 0.04 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: `0.5px solid ${inv.color}22` }}>
                      {/* Icon */}
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${inv.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 16 }}>{inv.emoji}</span>
                      </div>
                      {/* Name + type */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.name}</p>
                          {inv.ticker && inv.ticker !== "—" && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: `${inv.color}18`, color: inv.color }}>{inv.ticker}</span>
                          )}
                        </div>
                        <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginTop: 2 }}>{INVESTMENT_TYPE_LABELS[inv.type]} · {inv.units} units</p>
                      </div>
                      {/* Value + P&L */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>€{value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p style={{ fontSize: 11, fontWeight: 600, color: pnl >= 0 ? "#2ECC71" : "#FF5A5A" }}>
                          {pnl >= 0 ? "+" : ""}€{Math.abs(pnl).toFixed(0)} ({roi >= 0 ? "+" : ""}{roi.toFixed(1)}%)
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!isConfirm ? (
                          <>
                            <button type="button" title="Edit" onClick={() => openEditInv(inv)}
                              style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.05)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Pencil style={{ width: 11, height: 11 }} />
                            </button>
                            <button type="button" title="Delete" onClick={() => setDeleteInvId(inv.id)}
                              style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,90,90,0.08)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Trash2 style={{ width: 11, height: 11 }} />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span style={{ fontSize: 10, color: "#FF5A5A", marginRight: 2 }}>Delete?</span>
                            <button type="button" onClick={() => { deleteInvestment(inv.id); setDeleteInvId(null); }}
                              style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,90,90,0.2)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Check style={{ width: 11, height: 11 }} />
                            </button>
                            <button type="button" onClick={() => setDeleteInvId(null)}
                              style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✕</button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {investments.length === 0 && (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>No holdings yet — add your first investment</p>
                </div>
              )}
            </div>

            {/* Donut allocation chart */}
            {investments.length > 0 && (
              <div style={{ flexShrink: 0, width: 140 }} className="hidden sm:block">
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, textAlign: "center" }}>Allocation</p>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={investments.map(inv => ({ name: inv.name, value: calcCurrentValue(inv), color: inv.color }))}
                      cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {investments.map((inv) => <Cell key={inv.id} fill={inv.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 mt-2">
                  {investments.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-1.5">
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: inv.color, flexShrink: 0 }} />
                      <p style={{ fontSize: 10, color: "var(--text-quaternary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.name}</p>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", marginLeft: "auto", flexShrink: 0 }}>
                        {totalValue > 0 ? Math.round((calcCurrentValue(inv) / totalValue) * 100) : 0}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </LiquidGlassCard>
      </motion.div>
      )}

      {/* ── 4. Subscriptions ─────────────────────────────────────── */}
      <motion.div variants={fadeUp} custom={0.45} initial="hidden" animate="visible">
        <LiquidGlassCard accentColor="#8b5cf6" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap style={{ width: 16, height: 16, color: "#8b5cf6" }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Subscriptions</h3>
            </div>
            <div className="text-right">
              <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Monthly active total</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{formatEUR(totalMonthly)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
            {subs.map((sub, i) => (
              <motion.div key={sub.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: `0.5px solid ${sub.active ? sub.color + "30" : "var(--glass-border)"}`, opacity: sub.active ? 1 : 0.5, transition: "all 0.2s ease" }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${sub.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14 }}>{sub.emoji}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.name}</p>
                    <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginTop: 1 }}>{sub.billingDay}th · {sub.category}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{formatEUR(sub.cost)}</p>
                  <button type="button" onClick={() => toggleSub(sub.id)} title={sub.active ? "Pause" : "Resume"}
                    style={{ width: 22, height: 22, borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: sub.active ? "rgba(46,204,113,0.12)" : "rgba(255,255,255,0.05)", color: sub.active ? "#2ECC71" : "var(--text-quaternary)", transition: "all 0.15s" }}>
                    {sub.active ? <Pause style={{ width: 10, height: 10 }} /> : <Play style={{ width: 10, height: 10 }} />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </LiquidGlassCard>
      </motion.div>

      {/* ── 4. Recent transactions ────────────────────────────────── */}
      <motion.div variants={fadeUp} custom={0.6} initial="hidden" animate="visible">
        <LiquidGlassCard accentColor="#C9A84C" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(201,168,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CreditCard style={{ width: 16, height: 16, color: "#C9A84C" }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Recent Transactions</h3>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-quaternary)", background: "var(--glass-bg-subtle)", padding: "3px 10px", borderRadius: 20, border: "0.5px solid var(--glass-border)" }}>
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>No transactions in this period</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-1">
              {filteredTransactions.map((tx, i) => {
                const isIncome = tx.amount > 0;
                const catColor = getCategoryColor(tx.category);
                const catIcon = getCategoryIcon(tx.category);
                return (
                  <motion.div key={tx.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-between"
                    style={{ padding: "9px 10px", borderRadius: 10, transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${catColor}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                        {catIcon}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{tx.merchant}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>
                            {tx.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                          <CategoryTag category={tx.category} color={catColor} icon={catIcon} />
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.3px", flexShrink: 0, color: isIncome ? "#2ECC71" : "#FF5A5A" }}>
                      {isIncome ? "+" : "-"}€{Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </LiquidGlassCard>
      </motion.div>

      <InvestmentModal
        open={invModalOpen}
        onClose={() => { setInvModalOpen(false); setEditingInv(undefined); }}
        onSave={handleInvSave}
        initial={editingInv}
      />
    </div>
  );
};

export default Dashboard;
