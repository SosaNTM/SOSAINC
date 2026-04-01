import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { type DashboardPeriod } from "@/portals/finance/services/financialData";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { useDashboardSubscriptions } from "@/hooks/useDashboardSubscriptions";
import { useDashboardTransactions } from "@/hooks/useDashboardTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useInvestments } from "@/hooks/useInvestments";
import { useNetWorth } from "@/hooks/useNetWorth";
import { useCryptoChart } from "@/portals/finance/hooks/useCryptoChart";
import { useCryptoPortfolio } from "@/portals/finance/hooks/useCryptoPortfolio";
import { usePortal } from "@/lib/portalContext";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import type { WaterfallDataPoint } from "@/portals/finance/types/businessFinance";

import { KpiCards } from "./KpiCards";
import { RevenueChart } from "./RevenueChart";
import { GoalsWidget } from "./GoalsWidget";
import { CryptoWidget } from "./CryptoWidget";
import { SubscriptionsWidget } from "./SubscriptionsWidget";
import { RecentTransactions } from "./RecentTransactions";

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

/* ── Main orchestrator ──────────────────────────────────────────── */

const Dashboard = () => {
  const [period, setPeriod]           = useState<Period>("1m");
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

  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { setIsLoading(false); }, []);

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

  if (isLoading) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );

  return (
    <ModuleErrorBoundary moduleName="Dashboard">
      <div className="space-y-5">
        <LiquidGlassFilter />

        {/* ══ BUSINESS DASHBOARD (Keylo / RedX / TrustMe) ══════════ */}
        {isBusinessPortal && (
          <RevenueChart waterfallMetrics={waterfallMetrics} period={period} />
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
        <KpiCards
          nw={nw}
          liveNetWorth={liveNetWorth}
          liveInvestments={liveInvestments}
          isBusinessPortal={isBusinessPortal}
          periodIncome={periodIncome}
          periodExpenses={periodExpenses}
          balanceTrend={balanceTrend}
          trendDelta={trendDelta}
          trendUp={trendUp}
        />

        {/* ── 2. Goals ─────────────────────────────────────────────── */}
        <GoalsWidget goals={GOALS} />

        {/* ── 3. Investments (SOSA only) ──────────────────────────── */}
        {!isBusinessPortal && (
          <CryptoWidget
            investments={investments}
            totalValue={totalValue}
            totalCost={totalCost}
            totalPnL={totalPnL}
            totalROI={totalROI}
            addInvestment={addInvestment}
            updateInvestment={updateInvestment}
            deleteInvestment={deleteInvestment}
          />
        )}

        {/* ── 4. Subscriptions ─────────────────────────────────────── */}
        <SubscriptionsWidget
          subs={subs}
          totalMonthly={totalMonthly}
          toggleSub={toggleSub}
        />

        {/* ── 5. Recent transactions ────────────────────────────────── */}
        <RecentTransactions
          transactions={filteredTransactions}
          getCategoryColor={getCategoryColor}
          getCategoryIcon={getCategoryIcon}
        />
      </div>
    </ModuleErrorBoundary>
  );
};

export default Dashboard;
