import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Target, CreditCard, Zap,
  Check, Pause, Play,
  Calendar, ChevronDown, X,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  SNAPSHOT, NET_WORTH, ASSETS, SAVINGS_RATE,
  BALANCE_TRENDS,
  type DashboardPeriod,
} from "@/portals/finance/services/financialData";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { useDashboardSubscriptions } from "@/hooks/useDashboardSubscriptions";
import { useDashboardTransactions } from "@/hooks/useDashboardTransactions";
import { useCategories } from "@/hooks/useCategories";

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
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>${payload[0].value.toLocaleString("en-US")}</p>
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
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { goals: GOALS } = useFinancialGoals();
  const { subs, totalMonthly, toggleSub } = useDashboardSubscriptions();
  const { transactions: allTransactions } = useDashboardTransactions();
  const { getCategoryColor, getCategoryIcon } = useCategories();

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

  const balanceTrend = BALANCE_TRENDS[isCustomActive ? "all" : period] ?? BALANCE_TRENDS["all"];
  const trendStart   = balanceTrend[0]?.balance ?? NET_WORTH;
  const trendEnd     = balanceTrend[balanceTrend.length - 1]?.balance ?? NET_WORTH;
  const trendDelta   = trendEnd - trendStart;
  const trendUp      = trendDelta >= 0;

  const periodIncome   = filteredTransactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const periodExpenses = filteredTransactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

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
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 h-full">
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 8 }}>Net Worth</p>
                <p style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  $<NumberTicker value={NET_WORTH} className="text-[clamp(28px,5vw,44px)] font-bold" style={{ color: "var(--text-primary)" } as React.CSSProperties} />
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: trendUp ? "rgba(46,204,113,0.12)" : "rgba(255,90,90,0.12)", color: trendUp ? "#2ECC71" : "#FF5A5A" }}>
                    {trendUp ? <TrendingUp style={{ width: 10, height: 10 }} /> : <TrendingDown style={{ width: 10, height: 10 }} />}
                    {trendUp ? "+" : ""}${Math.abs(trendDelta).toLocaleString("en-US")} ({isCustomActive ? customLabel : PERIOD_LABELS.find((p) => p.value === period)?.label})
                  </span>
                </div>
                <div className="flex gap-6 mt-5 flex-wrap">
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 3 }}>Income</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#2ECC71" }}>${periodIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div style={{ width: 1, background: "var(--glass-border)" }} />
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 3 }}>Expenses</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#FF5A5A" }}>${periodExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div style={{ width: 1, background: "var(--glass-border)" }} />
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 3 }}>Savings Rate</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#4A9EFF" }}>{SAVINGS_RATE}%</p>
                  </div>
                </div>
              </div>
              <div style={{ minWidth: 160, height: 80, flexShrink: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 6 }}>Balance Trend</p>
                <ResponsiveContainer width="100%" height={64}>
                  <AreaChart data={balanceTrend} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide />
                    <YAxis hide domain={["dataMin - 2000", "dataMax + 1000"]} />
                    <Tooltip content={<SparklineTooltip />} />
                    <Area type="monotone" dataKey="balance" stroke="#C9A84C" strokeWidth={2} fill="url(#balGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Assets / Liabilities */}
        <div className="flex flex-col gap-4">
          {[
            { label: "Assets",      value: `$${ASSETS.toLocaleString("en-US")}`,         sub: "Cash + investments",  color: "#2ECC71", icon: <Wallet style={{ width: 16, height: 16 }} /> },
            { label: "Liabilities", value: `$${SNAPSHOT.debt.toLocaleString("en-US")}`,  sub: "Remaining debt",      color: "#FF5A5A", icon: <CreditCard style={{ width: 16, height: 16 }} /> },
          ].map((item, i) => (
            <motion.div key={item.label} variants={fadeUp} custom={0.1 + i * 0.08} className="group relative rounded-2xl p-[0.5px] overflow-hidden flex-1"
              style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.07), transparent 70%)" }}>
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
                      <p style={{ fontSize: 15, fontWeight: 700, color: goal.color }}>${goal.saved.toLocaleString("en-US")}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Remaining</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>${remaining.toLocaleString("en-US")}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Target</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)" }}>${goal.target.toLocaleString("en-US")}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </LiquidGlassCard>
      </motion.div>

      {/* ── 3. Subscriptions ─────────────────────────────────────── */}
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
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>${totalMonthly.toFixed(2)}</p>
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
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>${sub.cost.toFixed(2)}</p>
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
                      {isIncome ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </LiquidGlassCard>
      </motion.div>
    </div>
  );
};

export default Dashboard;
