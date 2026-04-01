import { useEffect, useCallback } from "react";
import { X, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  type ComputedMonth, fmtEur, fmtEurShort, TAX_RATE,
  directCostCategories, indirectCostCategories,
} from "@/lib/financialCalculations";

/* ─── Types ─── */
export type DrillDownType =
  | { kind: "month"; data: ComputedMonth; allData: ComputedMonth[] }
  | { kind: "summary"; metric: string; allData: ComputedMonth[]; summary: SummaryData }
  | { kind: "tableRow"; row: ComputedMonth; allData: ComputedMonth[] };

interface SummaryData {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  avg: number;
}

interface Props {
  drillDown: DrillDownType;
  onClose: () => void;
}

/* ─── Revenue source distribution (simulated proportional breakdown) ─── */
const revenueSources = [
  { name: "Consulting", pct: 0.45, color: "#34d399" },
  { name: "Product Sales", pct: 0.30, color: "#60a5fa" },
  { name: "Services", pct: 0.17, color: "#a78bfa" },
  { name: "Licensing", pct: 0.08, color: "#fbbf24" },
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

// NOTE: Custom tooltip — too specialized for GlassTooltip (mixed percentage/EUR formatting based on value magnitude)
const MiniTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)",
      borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600,
      backdropFilter: "blur(20px)",
    }}>
      <p style={{ color: "var(--text-primary)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke }}>{p.name}: {typeof p.value === "number" && p.value < 200 ? `${p.value.toFixed(1)}%` : fmtEur(p.value)}</p>
      ))}
    </div>
  );
};

/* ─── Change Badge ─── */
function ChangeBadge({ value, label }: { value: number; label: string }) {
  const positive = value >= 0;
  return (
    <div className="flex items-center gap-2">
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
        background: positive ? "var(--color-positive-bg)" : "var(--color-negative-bg)",
        color: positive ? "var(--color-positive)" : "var(--color-negative)",
      }}>
        {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {positive ? "+" : ""}{value.toFixed(1)}%
      </span>
      <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>{label}</span>
    </div>
  );
}

/* ─── Progress Row ─── */
function ProgressRow({ name, value, total, color }: { name: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{name}</span>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{fmtEur(value)}</span>
          <span style={{ fontSize: 11, color: "var(--text-quaternary)", width: 36, textAlign: "right" }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div style={{ height: 5, background: "var(--glass-bg-active)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

/* ─── Stat Row ─── */
function StatRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: "0.5px solid var(--divider)" }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 600, color: color || "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

/* ─── Sub Row (indented) ─── */
function SubRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center" style={{ padding: "5px 0 5px 20px", borderBottom: "0.5px solid var(--divider)" }}>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>├─ {label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: color || "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}

/* ─── Divider ─── */
function Divider() {
  return <div style={{ height: 1, background: "var(--divider-strong)", margin: "8px 0" }} />;
}

/* ════════════════════════════════════════════════════════ */
/*                  MONTH DETAIL VIEW                       */
/* ════════════════════════════════════════════════════════ */
function MonthDetail({ data, allData }: { data: ComputedMonth; allData: ComputedMonth[] }) {
  const idx = allData.findIndex(d => d.month === data.month);
  const prev = idx > 0 ? allData[idx - 1] : null;
  const revChange = prev ? ((data.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const costChange = prev ? ((data.totalCosts - prev.totalCosts) / prev.totalCosts) * 100 : 0;
  const npChange = prev ? ((data.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100 : 0;

  return (
    <div className="space-y-1">
      <StatRow label="Revenue" value={fmtEur(data.revenue)} color="#34d399" bold />
      {revenueSources.map(s => (
        <SubRow key={s.name} label={s.name} value={fmtEur(data.revenue * s.pct)} />
      ))}

      <div className="pt-2" />
      <StatRow label="Direct Costs (COGS)" value={`-${fmtEur(data.directCosts)}`} color="#f97316" bold />
      {cogsBreakdown.map(s => (
        <SubRow key={s.name} label={s.name} value={`-${fmtEur(data.directCosts * s.pct)}`} />
      ))}

      <Divider />
      <StatRow label="Gross Profit" value={fmtEur(data.grossProfit)} color="#34d399" bold />
      <StatRow label="Gross Margin" value={`${data.grossMargin.toFixed(1)}%`} color="#34d399" />

      <div className="pt-2" />
      <StatRow label="Indirect Costs (OPEX)" value={`-${fmtEur(data.indirectCosts)}`} color="#f59e0b" bold />
      {opexBreakdown.map(s => (
        <SubRow key={s.name} label={s.name} value={`-${fmtEur(data.indirectCosts * s.pct)}`} />
      ))}

      <Divider />
      <StatRow label="EBIT" value={fmtEur(data.operatingProfit)} color="#60a5fa" bold />
      <StatRow label="EBIT Margin" value={`${data.operatingMargin.toFixed(1)}%`} color="#60a5fa" />

      <div className="pt-1" />
      <StatRow label="Taxes (24%)" value={`-${fmtEur(data.taxes)}`} color="#fb7185" />

      <div style={{ height: 2, background: "var(--divider-strong)", margin: "10px 0" }} />
      <StatRow label="Net Profit" value={fmtEur(data.netProfit)} color="#a78bfa" bold />
      <StatRow label="Net Margin" value={`${data.netMargin.toFixed(1)}%`} color="#a78bfa" />

      {prev && (
        <div className="pt-4 space-y-2">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5 }}>vs Previous Period</p>
          <ChangeBadge value={revChange} label="Revenue" />
          <ChangeBadge value={-costChange} label="Costs" />
          <ChangeBadge value={npChange} label="Net Profit" />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
/*                  SUMMARY STAT VIEWS                      */
/* ════════════════════════════════════════════════════════ */
function RevenueSummary({ allData, summary }: { allData: ComputedMonth[]; summary: SummaryData }) {
  const best = allData.reduce((a, b) => a.revenue > b.revenue ? a : b);
  const worst = allData.reduce((a, b) => a.revenue < b.revenue ? a : b);
  const avg = summary.totalRevenue / allData.length;

  return (
    <div className="space-y-4">
      <StatRow label="Total" value={fmtEur(summary.totalRevenue)} color="#34d399" bold />
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5 }}>By Category</p>
      {revenueSources.map(s => (
        <ProgressRow key={s.name} name={s.name} value={summary.totalRevenue * s.pct} total={summary.totalRevenue} color={s.color} />
      ))}
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16 }}>Monthly Trend</p>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={allData}>
            <XAxis dataKey="month" tick={{ fill: "var(--text-quaternary)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<MiniTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="revenue" fill="#34d399" radius={[3, 3, 0, 0]} opacity={0.8} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <StatRow label="Best Month" value={`${best.month} (${fmtEur(best.revenue)})`} />
      <StatRow label="Worst Month" value={`${worst.month} (${fmtEur(worst.revenue)})`} />
      <StatRow label="Avg Monthly" value={fmtEur(avg)} />
    </div>
  );
}

function CostsSummary({ allData, summary }: { allData: ComputedMonth[]; summary: SummaryData }) {
  const totalDirect = allData.reduce((s, d) => s + d.directCosts, 0);
  const totalIndirect = allData.reduce((s, d) => s + d.indirectCosts, 0);

  return (
    <div className="space-y-4">
      <StatRow label="Total Costs" value={fmtEur(summary.totalCosts)} color="#fb7185" bold />
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5 }}>COGS vs OPEX</p>
      <ProgressRow name="Direct Costs (COGS)" value={totalDirect} total={summary.totalCosts} color="#f97316" />
      <ProgressRow name="Indirect Costs (OPEX)" value={totalIndirect} total={summary.totalCosts} color="#f59e0b" />
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16 }}>Monthly Trend</p>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={allData}>
            <XAxis dataKey="month" tick={{ fill: "var(--text-quaternary)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<MiniTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="directCosts" name="COGS" stackId="a" fill="#f97316" opacity={0.8} animationDuration={800} />
            <Bar dataKey="indirectCosts" name="OPEX" stackId="a" fill="#f59e0b" opacity={0.7} radius={[3, 3, 0, 0]} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GrossProfitSummary({ allData, summary }: { allData: ComputedMonth[]; summary: SummaryData }) {
  return (
    <div className="space-y-4">
      <StatRow label="Total Revenue" value={fmtEur(summary.totalRevenue)} color="#34d399" />
      <StatRow label="− COGS" value={`-${fmtEur(allData.reduce((s, d) => s + d.directCosts, 0))}`} color="#f97316" />
      <Divider />
      <StatRow label="= Gross Profit" value={fmtEur(summary.grossProfit)} color="#34d399" bold />
      <StatRow label="Gross Margin" value={`${(summary.grossProfit / summary.totalRevenue * 100).toFixed(1)}%`} color="#34d399" />
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16 }}>Margin Trend</p>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={allData}>
            <XAxis dataKey="month" tick={{ fill: "var(--text-quaternary)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<MiniTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Area type="monotone" dataKey="grossMargin" name="Gross Margin %" stroke="#34d399" fill="#34d399" fillOpacity={0.1} activeDot={{ r: 4, fill: "#34d399", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Monthly Breakdown</p>
      {allData.map(m => (
        <StatRow key={m.month} label={m.month} value={`${fmtEur(m.grossProfit)} (${m.grossMargin.toFixed(1)}%)`} />
      ))}
    </div>
  );
}

function EBITSummary({ allData }: { allData: ComputedMonth[] }) {
  const totalEbit = allData.reduce((s, d) => s + d.operatingProfit, 0);
  const totalRev = allData.reduce((s, d) => s + d.revenue, 0);
  const ebitMargin = totalRev > 0 ? (totalEbit / totalRev) * 100 : 0;

  return (
    <div className="space-y-4">
      <StatRow label="Revenue" value={fmtEur(totalRev)} color="#34d399" />
      <StatRow label="− COGS" value={`-${fmtEur(allData.reduce((s, d) => s + d.directCosts, 0))}`} color="#f97316" />
      <StatRow label="− OPEX" value={`-${fmtEur(allData.reduce((s, d) => s + d.indirectCosts, 0))}`} color="#f59e0b" />
      <Divider />
      <StatRow label="= EBIT" value={fmtEur(totalEbit)} color="#60a5fa" bold />
      <StatRow label="EBIT Margin" value={`${ebitMargin.toFixed(1)}%`} color="#60a5fa" />
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16 }}>EBIT Trend</p>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={allData}>
            <XAxis dataKey="month" tick={{ fill: "var(--text-quaternary)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<MiniTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="operatingProfit" name="EBIT" fill="#60a5fa" radius={[3, 3, 0, 0]} opacity={0.8} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function NetProfitSummary({ allData, summary }: { allData: ComputedMonth[]; summary: SummaryData }) {
  const totalRev = summary.totalRevenue;
  const totalCogs = allData.reduce((s, d) => s + d.directCosts, 0);
  const totalOpex = allData.reduce((s, d) => s + d.indirectCosts, 0);
  const totalTax = allData.reduce((s, d) => s + d.taxes, 0);
  const nm = totalRev > 0 ? (summary.netProfit / totalRev) * 100 : 0;

  return (
    <div className="space-y-4">
      <StatRow label="Revenue" value={fmtEur(totalRev)} color="#34d399" />
      <StatRow label="− COGS" value={`-${fmtEur(totalCogs)}`} color="#f97316" />
      <StatRow label="− OPEX" value={`-${fmtEur(totalOpex)}`} color="#f59e0b" />
      <StatRow label="− Taxes" value={`-${fmtEur(totalTax)}`} color="#fb7185" />
      <div style={{ height: 2, background: "var(--divider-strong)", margin: "8px 0" }} />
      <StatRow label="= Net Profit" value={fmtEur(summary.netProfit)} color="#a78bfa" bold />
      <StatRow label="Net Margin" value={`${nm.toFixed(1)}%`} color="#a78bfa" />
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16 }}>Net Margin Trend</p>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={allData}>
            <XAxis dataKey="month" tick={{ fill: "var(--text-quaternary)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<MiniTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Area type="monotone" dataKey="netMargin" name="Net Margin %" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.1} activeDot={{ r: 4, fill: "#a78bfa", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
/*                  TABLE ROW DETAIL                        */
/* ════════════════════════════════════════════════════════ */
function TableRowDetail({ row, allData }: { row: ComputedMonth; allData: ComputedMonth[] }) {
  // Same as month detail for individual rows
  return <MonthDetail data={row} allData={allData} />;
}

/* ════════════════════════════════════════════════════════ */
/*                  MODAL WRAPPER                           */
/* ════════════════════════════════════════════════════════ */
export function RevenueCostsDrillDown({ drillDown, onClose }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getTitle = () => {
    switch (drillDown.kind) {
      case "month": return `📅 ${drillDown.data.month} 2025`;
      case "tableRow": return `📅 ${drillDown.row.month} — Detail`;
      case "summary":
        switch (drillDown.metric) {
          case "Total Revenue": return "💰 Total Revenue — Breakdown";
          case "Total Costs": return "📊 Total Costs — Breakdown";
          case "Gross Profit": return "📈 Gross Profit — Analysis";
          case "Net Profit": return "🟣 Net Profit — Full P&L";
          default:
            if (drillDown.metric.includes("EBIT") || drillDown.metric.includes("Operating")) return "🔵 EBIT — Waterfall";
            return `📊 ${drillDown.metric}`;
        }
    }
  };

  const renderContent = () => {
    switch (drillDown.kind) {
      case "month":
        return <MonthDetail data={drillDown.data} allData={drillDown.allData} />;
      case "tableRow":
        return <TableRowDetail row={drillDown.row} allData={drillDown.allData} />;
      case "summary": {
        const { metric, allData, summary } = drillDown;
        if (metric === "Total Revenue") return <RevenueSummary allData={allData} summary={summary} />;
        if (metric === "Total Costs") return <CostsSummary allData={allData} summary={summary} />;
        if (metric === "Gross Profit") return <GrossProfitSummary allData={allData} summary={summary} />;
        if (metric === "Net Profit") return <NetProfitSummary allData={allData} summary={summary} />;
        // EBIT / avg / operating profit
        return <EBITSummary allData={allData} />;
      }
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease",
        }}
      />
      {/* Side Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1000,
          width: "min(460px, 92vw)",
          background: "var(--modal-bg)",
          backdropFilter: "var(--glass-blur-heavy)",
          borderLeft: "0.5px solid var(--modal-border)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.3)",
          display: "flex", flexDirection: "column",
          animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{
          padding: "20px 24px", borderBottom: "0.5px solid var(--divider)",
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{getTitle()}</h3>
          <button type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
              color: "var(--text-tertiary)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--glass-bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--glass-bg)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
          >
            <X size={16} />
          </button>
        </div>
        {/* Content */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    </>
  );
}
