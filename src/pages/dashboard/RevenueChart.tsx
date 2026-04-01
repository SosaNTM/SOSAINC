import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Target } from "lucide-react";
import { formatEUR } from "@/portals/finance/utils/currency";
import { WaterfallChart } from "@/portals/finance/components/WaterfallChart";
import type { WaterfallDataPoint } from "@/portals/finance/types/businessFinance";
import type { DashboardPeriod } from "@/portals/finance/services/financialData";

/* ── Period labels (shared constant) ─────────────────────────────── */

const PERIOD_LABELS: { value: DashboardPeriod; label: string }[] = [
  { value: "1d",  label: "Today" },
  { value: "7d",  label: "Last 7 days" },
  { value: "1m",  label: "Last month" },
  { value: "3m",  label: "Last 3 months" },
  { value: "1y",  label: "Last year" },
  { value: "all", label: "All" },
];

/* ── Props ───────────────────────────────────────────────────────── */

interface WaterfallMetrics {
  readonly revenue: number;
  readonly cogs: number;
  readonly opex: number;
  readonly grossProfit: number;
  readonly ebitda: number;
  readonly grossMarginPct: number;
  readonly netMarginPct: number;
  readonly waterfallData: WaterfallDataPoint[];
}

interface RevenueChartProps {
  readonly waterfallMetrics: WaterfallMetrics | null;
  readonly period: DashboardPeriod;
}

/* ── Component ───────────────────────────────────────────────────── */

export function RevenueChart({ waterfallMetrics, period }: RevenueChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {/* Hero KPI row: 3 headline numbers */}
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
            color: "#e8ff00",
            accent: "rgba(232,255,0,0.10)",
            border: "rgba(232,255,0,0.18)",
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

      {/* Waterfall + Cost breakdown side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Waterfall chart -- spans 2 cols */}
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

        {/* Cost breakdown cards -- stacked on the right */}
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
              sub: "Revenue - COGS",
              value: null,
              pct: waterfallMetrics ? waterfallMetrics.grossMarginPct.toFixed(1) : "0.0",
              color: "#e8ff00",
              barBg: "rgba(232,255,0,0.08)",
              barFill: "rgba(232,255,0,0.55)",
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
  );
}
