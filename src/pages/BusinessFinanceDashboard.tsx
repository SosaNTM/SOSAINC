import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { useBusinessSummary, useWaterfallData } from "@/portals/finance/hooks/useBusinessFinance";
import { WaterfallChart } from "@/portals/finance/components/WaterfallChart";

type PeriodType = "monthly" | "quarterly" | "annual";

const PERIOD_LABELS: { value: PeriodType; label: string }[] = [
  { value: "monthly", label: "Mensile" },
  { value: "quarterly", label: "Trimestrale" },
  { value: "annual", label: "Annuale" },
];

function currentPeriod(type: PeriodType): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  if (type === "monthly") return `${y}-${m}`;
  if (type === "quarterly") return `${y}-Q${Math.ceil(now.getMonth() / 3 + 0.01)}`;
  return String(y);
}

function formatEUR(v: number): string {
  return `€${v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BusinessFinanceDashboard() {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [period, setPeriod] = useState(() => currentPeriod("monthly"));

  // Keep period in sync when changing period type
  const handlePeriodTypeChange = (pt: PeriodType) => {
    setPeriodType(pt);
    setPeriod(currentPeriod(pt));
  };

  const summary = useBusinessSummary(period, periodType);
  const waterfallData = useWaterfallData(period, periodType);

  const hasData = summary.grossRevenue > 0 || summary.totalCogs > 0 || summary.totalOpex > 0;

  const kpis = useMemo(() => [
    {
      label: "Ricavi Lordi",
      value: formatEUR(summary.grossRevenue),
      color: "#22c55e",
    },
    {
      label: "Ricavi Netti",
      value: formatEUR(summary.netRevenue),
      color: "#3b82f6",
    },
    {
      label: "Utile Lordo",
      sub: `Margine ${summary.grossMarginPct.toFixed(1)}%`,
      value: formatEUR(summary.grossProfit),
      color: summary.grossProfit >= 0 ? "#22c55e" : "#ef4444",
      isPositive: summary.grossProfit >= 0,
    },
    {
      label: "EBITDA",
      sub: `Margine ${summary.ebitdaMarginPct.toFixed(1)}%`,
      value: formatEUR(summary.ebitda),
      color: summary.ebitda >= 0 ? "#22c55e" : "#ef4444",
      isPositive: summary.ebitda >= 0,
    },
    {
      label: "COGS Totale",
      value: formatEUR(summary.totalCogs),
      color: "#ef4444",
    },
    {
      label: "OPEX Totale",
      value: formatEUR(summary.totalOpex),
      color: "#f59e0b",
    },
  ], [summary]);

  const periodInput = useMemo(() => {
    if (periodType === "monthly") {
      return (
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="glass-input"
          style={{ fontSize: 13, padding: "6px 12px", borderRadius: "var(--radius-md)", width: 170 }}
        />
      );
    }
    if (periodType === "quarterly") {
      const y = parseInt(period.slice(0, 4)) || new Date().getFullYear();
      const q = parseInt(period.slice(6)) || 1;
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={y}
            onChange={(e) => setPeriod(`${e.target.value}-Q${q}`)}
            className="glass-input"
            style={{ fontSize: 13, padding: "6px 10px", borderRadius: "var(--radius-md)", width: 90 }}
            min={2020}
            max={2099}
          />
          <select
            value={q}
            onChange={(e) => setPeriod(`${y}-Q${e.target.value}`)}
            className="glass-input"
            style={{ fontSize: 13, padding: "6px 10px", borderRadius: "var(--radius-md)", width: 80 }}
          >
            <option value={1}>Q1</option>
            <option value={2}>Q2</option>
            <option value={3}>Q3</option>
            <option value={4}>Q4</option>
          </select>
        </div>
      );
    }
    return (
      <input
        type="number"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className="glass-input"
        style={{ fontSize: 13, padding: "6px 12px", borderRadius: "var(--radius-md)", width: 100 }}
        min={2020}
        max={2099}
      />
    );
  }, [periodType, period]);

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* Period selector */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "rgba(201,169,110,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart3 style={{ width: 16, height: 16, color: "#c9a96e" }} />
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            P&L Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Period type segment */}
          <div className="glass-segment flex" style={{ borderRadius: "var(--radius-md)" }}>
            {PERIOD_LABELS.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => handlePeriodTypeChange(pt.value)}
                className={`glass-segment-item ${periodType === pt.value ? "active" : ""}`}
                style={{
                  fontSize: 12,
                  padding: "6px 14px",
                  fontWeight: periodType === pt.value ? 600 : 500,
                }}
              >
                {pt.label}
              </button>
            ))}
          </div>
          {periodInput}
        </div>
      </motion.div>

      {!hasData ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="glass-card-static"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <BarChart3
            style={{ width: 40, height: 40, color: "var(--text-quaternary)", margin: "0 auto 16px" }}
          />
          <p style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 500 }}>
            Nessun dato finanziario.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 6 }}>
            Aggiungi ricavi, costi o spese operative per visualizzare il P&L.
          </p>
        </motion.div>
      ) : (
        <>
          {/* KPI Cards */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="glass-card-static"
                style={{
                  padding: "16px 18px",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-quaternary)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {kpi.label}
                </p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: kpi.color,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {kpi.value}
                </p>
                {kpi.sub && (
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.isPositive ? (
                      <TrendingUp style={{ width: 12, height: 12, color: "#22c55e" }} />
                    ) : (
                      <TrendingDown style={{ width: 12, height: 12, color: "#ef4444" }} />
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: kpi.isPositive ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {kpi.sub}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          {/* Waterfall Chart */}
          <motion.div
            className="glass-card-static"
            style={{ padding: "20px 16px", borderRadius: "var(--radius-lg)" }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 12,
                paddingLeft: 4,
              }}
            >
              Waterfall P&L
            </h3>
            <WaterfallChart data={waterfallData} netRevenue={summary.netRevenue} />
          </motion.div>
        </>
      )}
    </div>
  );
}
