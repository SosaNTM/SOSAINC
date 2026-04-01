import React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Target, Bitcoin, Gift, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatEUR } from "@/portals/finance/utils/currency";
import { GlassTooltip } from "@/components/ui/GlassTooltip";
import type { NetWorthBreakdown } from "@/hooks/useNetWorth";

/* ── Shared helpers ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: (delay = 0) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const fmtEurTooltip = (v: number) => `€${Number(v).toLocaleString("en-US")}`;

/* ── Props ───────────────────────────────────────────────────────── */

interface KpiCardsProps {
  readonly nw: NetWorthBreakdown;
  readonly liveNetWorth: number;
  readonly liveInvestments: number;
  readonly isBusinessPortal: boolean;
  readonly periodIncome: number;
  readonly periodExpenses: number;
  readonly balanceTrend: { label: string; balance: number }[];
  readonly trendDelta: number;
  readonly trendUp: boolean;
}

/* ── Component ───────────────────────────────────────────────────── */

export function KpiCards({
  nw,
  liveNetWorth,
  liveInvestments,
  isBusinessPortal,
  periodIncome,
  periodExpenses,
  balanceTrend,
  trendDelta,
  trendUp,
}: KpiCardsProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {/* Net Worth hero card with sparkline */}
      <motion.div
        className="lg:col-span-2 group relative rounded-2xl overflow-hidden p-[0.5px]"
        variants={fadeUp}
        custom={0}
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 40%, transparent 60%, rgba(255,255,255,0.04))" }}
      >
        <div
          className="relative rounded-2xl p-5 sm:p-7 h-full"
          style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)" }}
        >
          <BorderBeam
            size={200}
            duration={14}
            colorFrom="#e8ff00"
            colorTo="transparent"
            borderWidth={1}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          />

          {/* Top: Net Worth value + trend badge */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 6 }}>Net Worth</p>
              <p style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                €{liveNetWorth === 0 ? "0.00" : <NumberTicker value={liveNetWorth} decimalPlaces={2} className="text-[clamp(28px,5vw,44px)] font-bold" style={{ color: "var(--text-primary)" } as React.CSSProperties} />}
              </p>
              {nw.isCryptoStale && (
                <span style={{
                  color: "#e8ff00",
                  fontSize: 10,
                  fontFamily: "'Space Mono', monospace",
                  opacity: 0.7,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 4,
                }}>
                  ⚠ Crypto values may be outdated
                </span>
              )}
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
                      <stop offset="0%" stopColor="#e8ff00" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#e8ff00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" hide />
                  <YAxis hide domain={["dataMin * 0.95", "dataMax * 1.05"]} />
                  <Tooltip content={<GlassTooltip formatter={fmtEurTooltip} />} />
                  <Area type="monotone" dataKey="balance" stroke="#e8ff00" strokeWidth={2} fill="url(#balGrad)" dot={false} />
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
              ...(nw.giftCardsValue > 0 ? [{ label: "Gift Cards", value: formatEUR(nw.giftCardsValue), sub: `${nw.giftCardsActiveCount} attive`, color: "#e8ff00" }] : []),
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

      {/* Assets / Liabilities sidebar cards */}
      <div className="flex flex-col gap-4">
        {[
          ...(!isBusinessPortal ? [{ label: "Portfolio", value: formatEUR(liveInvestments), sub: "Investment portfolio", color: "#2ECC71", icon: <Wallet style={{ width: 16, height: 16 }} /> }] : []),
          { label: "Crypto", value: formatEUR(nw.cryptoValue), sub: nw.isCryptoStale ? "Crypto values may be outdated" : nw.cryptoChange24h !== 0 ? `${nw.cryptoChange24hPercent >= 0 ? "+" : ""}${nw.cryptoChange24hPercent.toFixed(1)}% (24h)` : "Crypto portfolio", color: nw.isCryptoStale ? "#e8ff00" : "#f7931a", icon: <Bitcoin style={{ width: 16, height: 16 }} />, link: "crypto" },
          { label: "Gift Cards", value: formatEUR(nw.giftCardsValue), sub: nw.giftCardsActiveCount > 0 ? `${nw.giftCardsActiveCount} attive` : "Nessuna card", color: "#e8ff00", icon: <Gift style={{ width: 16, height: 16 }} />, link: "gift-cards", badge: nw.giftCardsExpiringSoon },
          { label: "Subscriptions", value: formatEUR(nw.subscriptionsCost), sub: "Monthly active cost", color: "#8b5cf6", icon: <Zap style={{ width: 16, height: 16 }} /> },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            variants={fadeUp}
            custom={0.1 + i * 0.08}
            className="group relative rounded-2xl p-[0.5px] overflow-hidden flex-1"
            style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.07), transparent 70%)", cursor: "link" in item && item.link ? "pointer" : "default" }}
            onClick={() => { if ("link" in item && item.link) navigate(item.link); }}
          >
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
  );
}
