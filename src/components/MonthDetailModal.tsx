import { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  type ComputedMonth,
  fmtEur,
  monthlyRecords,
} from "@/lib/financialCalculations";

/* ── types ── */
interface Props {
  monthIndex: number;
  allData: ComputedMonth[];
  onClose: () => void;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ── helpers ── */
function pct(a: number, b: number) {
  if (b === 0) return 0;
  return ((a - b) / Math.abs(b)) * 100;
}

/* ── breakdown data proportions ── */
const revenueBreakdown = [
  { name: "Consulting", pct: 0.45 },
  { name: "Product Sales", pct: 0.30 },
  { name: "Services", pct: 0.17 },
  { name: "Licensing", pct: 0.08 },
];
const cogsBreakdown = [
  { name: "Production Staff", pct: 0.40 },
  { name: "Materials & Supplies", pct: 0.25 },
  { name: "Subcontractors", pct: 0.20 },
  { name: "Software Licenses", pct: 0.15 },
];
const opexBreakdown = [
  { name: "Rent", pct: 0.25 },
  { name: "Marketing & Ads", pct: 0.22 },
  { name: "Admin & Management", pct: 0.20 },
  { name: "Utilities & Insurance", pct: 0.18 },
  { name: "Other", pct: 0.15 },
];
const taxBreakdown = [
  { name: "Income Tax", pct: 0.80 },
  { name: "Regional Tax (IRAP)", pct: 0.20 },
];

/* ── Margin Ring (SVG) ── */
function MarginRing({ value, color, label, delay }: { value: number; color: string; label: string; delay: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const size = 90;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / 100, 1);
  const offset = animated ? circumference * (1 - percentage) : circumference;

  return (
    <div style={{
      backgroundColor: "#161b22", border: "0.5px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "20px 12px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "#fff",
        }}>
          {value.toFixed(1)}%
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
    </div>
  );
}

/* ── Waterfall Item type ── */
interface WaterfallItem {
  name: string;
  value: number;
  color: string;
  type: "total" | "deduction" | "subtotal";
  breakdown?: { name: string; value: number }[];
}

/* ── Expandable Waterfall Chart ── */
function WaterfallChart({ data, maxValue }: { data: WaterfallItem[]; maxValue: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {data.map((item, i) => {
        const hasBreakdown = item.breakdown && item.breakdown.length > 0;
        const isExpanded = expanded[item.name];
        const absValue = Math.abs(item.value);
        const barWidth = Math.max((absValue / maxValue) * 100, 2);
        const isDeduction = item.type === "deduction";

        return (
          <div key={item.name}>
            {/* Main row */}
            <div
              onClick={() => hasBreakdown && toggle(item.name)}
              style={{
                display: "grid", gridTemplateColumns: "120px 1fr 100px 20px",
                alignItems: "center", gap: 12,
                padding: "8px 8px", paddingLeft: isDeduction ? 20 : 8,
                borderRadius: 8, cursor: hasBreakdown ? "pointer" : "default",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (hasBreakdown) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: isDeduction ? 500 : 600,
                color: isDeduction ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.7)",
              }}>
                {isDeduction && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>▼</span>}
                {item.name}
              </div>
              <div style={{ height: 28, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                <div
                  className="waterfall-bar-animated"
                  style={{
                    height: "100%", borderRadius: 6, backgroundColor: item.color,
                    opacity: 0.85, width: `${barWidth}%`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                color: isDeduction ? "#ef4444" : "#fff",
              }}>
                {isDeduction ? "-" : ""}{fmtEur(absValue)}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                {hasBreakdown ? (isExpanded ? "▾" : "▸") : ""}
              </div>
            </div>

            {/* Expanded sub-items */}
            {hasBreakdown && isExpanded && (
              <div className="animate-slideDown" style={{ overflow: "hidden" }}>
                {item.breakdown!.map((sub, idx) => {
                  const isLast = idx === item.breakdown!.length - 1;
                  const subBarWidth = Math.max((sub.value / maxValue) * 100, 1);
                  return (
                    <div
                      key={sub.name}
                      style={{
                        display: "grid", gridTemplateColumns: "120px 1fr 100px 20px",
                        alignItems: "center", gap: 12,
                        padding: "6px 8px", paddingLeft: 40,
                        animation: `fadeSlideIn 0.2s ease forwards`,
                        animationDelay: `${idx * 50}ms`,
                        opacity: 0,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "rgba(255,255,255,0.2)" }}>{isLast ? "└─" : "├─"}</span>
                        {sub.name}
                      </div>
                      <div style={{ height: 20, background: "rgba(255,255,255,0.02)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 4,
                          backgroundColor: item.color, opacity: 0.5,
                          width: `${subBarWidth}%`,
                        }} />
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 600, textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: isDeduction ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.6)",
                      }}>
                        {isDeduction ? "-" : ""}{fmtEur(sub.value)}
                      </div>
                      <div />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Comparison Row ── */
function ComparisonRow({ metric, current, previous, invertGood }: {
  metric: string; current: number; previous: number; invertGood?: boolean;
}) {
  const change = pct(current, previous);
  const diff = current - previous;
  const good = invertGood ? change < 0 : change > 0;
  const arrow = change >= 0 ? "▲" : "▼";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{metric}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: good ? "#10b981" : "#ef4444" }}>
          {arrow} {change >= 0 ? "+" : ""}{change.toFixed(1)}%
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginLeft: 4 }}>
          ({diff >= 0 ? "+" : ""}{fmtEur(diff)})
        </span>
      </div>
    </div>
  );
}

/* ── MODAL ── */
export function MonthDetailModal({ monthIndex: initialIndex, allData, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const m = allData[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allData.length - 1;

  const monthLabel = useMemo(() => {
    const idx = monthlyRecords.findIndex(r => r.month === m.month);
    if (idx >= 0) return MONTH_NAMES[idx];
    return m.month;
  }, [m.month]);

  // Build waterfall with breakdowns
  const waterfallData: WaterfallItem[] = useMemo(() => [
    {
      name: "Revenue", value: m.revenue, color: "#10b981", type: "total",
      breakdown: revenueBreakdown.map(b => ({ name: b.name, value: Math.round(m.revenue * b.pct) })),
    },
    {
      name: "COGS", value: m.directCosts, color: "#ef4444", type: "deduction",
      breakdown: cogsBreakdown.map(b => ({ name: b.name, value: Math.round(m.directCosts * b.pct) })),
    },
    { name: "Gross Profit", value: m.grossProfit, color: "#10b981", type: "subtotal" },
    {
      name: "OPEX", value: m.indirectCosts, color: "#f97316", type: "deduction",
      breakdown: opexBreakdown.map(b => ({ name: b.name, value: Math.round(m.indirectCosts * b.pct) })),
    },
    { name: "EBIT", value: m.operatingProfit, color: "#3b82f6", type: "subtotal" },
    {
      name: "Taxes", value: m.taxes, color: "#a855f7", type: "deduction",
      breakdown: taxBreakdown.map(b => ({ name: b.name, value: Math.round(m.taxes * b.pct) })),
    },
    { name: "Net Profit", value: m.netProfit, color: "#10b981", type: "total" },
  ], [m]);

  const prevMonth = currentIndex > 0 ? allData[currentIndex - 1] : null;

  const yearAvg = useMemo(() => {
    const count = allData.length;
    if (count === 0) return null;
    return {
      revenue: allData.reduce((s, d) => s + d.revenue, 0) / count,
      directCosts: allData.reduce((s, d) => s + d.directCosts, 0) / count,
      grossProfit: allData.reduce((s, d) => s + d.grossProfit, 0) / count,
      indirectCosts: allData.reduce((s, d) => s + d.indirectCosts, 0) / count,
      netProfit: allData.reduce((s, d) => s + d.netProfit, 0) / count,
    };
  }, [allData]);

  const opexRatio = m.revenue > 0 ? (m.indirectCosts / m.revenue) * 100 : 0;
  const taxRate = m.operatingProfit > 0 ? (m.taxes / m.operatingProfit) * 100 : 0;

  const navigate = (dir: "left" | "right") => {
    const nextIdx = dir === "left" ? currentIndex - 1 : currentIndex + 1;
    if (nextIdx < 0 || nextIdx >= allData.length) return;
    setDirection(dir);
    setAnimKey(k => k + 1);
    setCurrentIndex(nextIdx);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const slideAnim = direction === "right"
    ? "month-slide-in-right 0.3s ease-out"
    : direction === "left"
      ? "month-slide-in-left 0.3s ease-out"
      : "modalContentEnter 0.3s ease-out";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fade-in 0.2s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 720, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto",
          backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20, padding: 32, position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          animation: "modalEnterScale 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <button type="button"
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, background: "transparent", border: "none",
            color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: 4, borderRadius: 8,
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
        >
          <X size={18} />
        </button>

        <div key={animKey} style={{ animation: slideAnim }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>
              📅 {monthLabel} 2025
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
              Monthly Financial Summary
            </div>
          </div>

          {/* Waterfall Chart */}
          <div style={{
            backgroundColor: "#161b22", border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "20px 24px", marginBottom: 24,
          }}>
            <WaterfallChart data={waterfallData} maxValue={m.revenue} />
          </div>

          {/* Margin Rings */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}
            className="month-modal-margins-grid"
          >
            <MarginRing value={m.grossMargin} color="#10b981" label="Gross Margin" delay={300} />
            <MarginRing value={m.netMargin} color="#3b82f6" label="Net Margin" delay={400} />
            <MarginRing value={opexRatio} color="#f97316" label="OPEX Ratio" delay={500} />
            <MarginRing value={taxRate} color="#a855f7" label="Tax Rate" delay={600} />
          </div>

          {/* Comparison Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}
            className="month-modal-comparison-grid"
          >
            <div style={{
              backgroundColor: "#161b22", border: "0.5px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "18px 20px",
              opacity: prevMonth ? 1 : 0.4,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
                vs Previous Month {prevMonth ? `(${prevMonth.month})` : ""}
              </div>
              {prevMonth ? (
                <>
                  <ComparisonRow metric="Revenue" current={m.revenue} previous={prevMonth.revenue} />
                  <ComparisonRow metric="COGS" current={m.directCosts} previous={prevMonth.directCosts} invertGood />
                  <ComparisonRow metric="Gross Profit" current={m.grossProfit} previous={prevMonth.grossProfit} />
                  <ComparisonRow metric="OPEX" current={m.indirectCosts} previous={prevMonth.indirectCosts} invertGood />
                  <ComparisonRow metric="Net Profit" current={m.netProfit} previous={prevMonth.netProfit} />
                </>
              ) : (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>No previous month data</div>
              )}
            </div>

            <div style={{
              backgroundColor: "#161b22", border: "0.5px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "18px 20px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
                vs Year Average
              </div>
              {yearAvg && (
                <>
                  <ComparisonRow metric="Revenue" current={m.revenue} previous={yearAvg.revenue} />
                  <ComparisonRow metric="COGS" current={m.directCosts} previous={yearAvg.directCosts} invertGood />
                  <ComparisonRow metric="Gross Profit" current={m.grossProfit} previous={yearAvg.grossProfit} />
                  <ComparisonRow metric="OPEX" current={m.indirectCosts} previous={yearAvg.indirectCosts} invertGood />
                  <ComparisonRow metric="Net Profit" current={m.netProfit} previous={yearAvg.netProfit} />
                </>
              )}
            </div>
          </div>

          {/* Month Navigation */}
          <div style={{
            display: "flex", justifyContent: "space-between", paddingTop: 20,
            borderTop: "0.5px solid rgba(255,255,255,0.08)",
          }}>
            <button type="button"
              onClick={() => hasPrev && navigate("left")}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.08)",
                background: "transparent", color: hasPrev ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)",
                fontSize: 13, fontWeight: 500, cursor: hasPrev ? "pointer" : "default",
                transition: "all 0.15s", opacity: hasPrev ? 1 : 0.3,
              }}
              onMouseEnter={e => { if (hasPrev) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <ChevronLeft size={14} /> {hasPrev ? allData[currentIndex - 1].month : ""}
            </button>
            <button type="button"
              onClick={() => hasNext && navigate("right")}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.08)",
                background: "transparent", color: hasNext ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)",
                fontSize: 13, fontWeight: 500, cursor: hasNext ? "pointer" : "default",
                transition: "all 0.15s", opacity: hasNext ? 1 : 0.3,
              }}
              onMouseEnter={e => { if (hasNext) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {hasNext ? allData[currentIndex + 1].month : ""} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
