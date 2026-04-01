// TODO: removed from navigation during audit — routes disabled in App.tsx. Re-enable when business finance module is ready.
import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Printer } from "lucide-react";
import { LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { usePLStatement } from "@/portals/finance/hooks/useBusinessFinance";

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

function fmtMoney(v: number, negative = false): string {
  if (negative || v < 0) {
    return `(€${Math.abs(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  return `€${v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const lineStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "5px 0",
} as const;

const labelStyle = {
  fontSize: 13,
  color: "var(--text-secondary)",
  fontWeight: 500 as const,
};

const amountStyle = {
  fontSize: 13,
  fontWeight: 600 as const,
  fontFamily: "var(--font-mono)",
  color: "var(--text-primary)",
  textAlign: "right" as const,
};

const totalLabelStyle = {
  fontSize: 14,
  fontWeight: 700 as const,
  color: "var(--text-primary)",
};

const totalAmountStyle = {
  fontSize: 14,
  fontWeight: 700 as const,
  fontFamily: "var(--font-mono)",
  textAlign: "right" as const,
};

const sectionDivider = {
  height: 1,
  background: "var(--divider)",
  margin: "6px 0",
};

const doubleDivider = (
  <div style={{ margin: "4px 0" }}>
    <div style={{ height: 1, background: "var(--text-primary)", opacity: 0.3 }} />
    <div style={{ height: 1, background: "var(--text-primary)", opacity: 0.3, marginTop: 2 }} />
  </div>
);

export default function BusinessPLPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [period, setPeriod] = useState(() => currentPeriod("monthly"));

  const handlePeriodTypeChange = (pt: PeriodType) => {
    setPeriodType(pt);
    setPeriod(currentPeriod(pt));
  };

  const pl = usePLStatement(period, periodType);

  const hasData =
    pl.revenueByCategory.length > 0 ||
    pl.cogsByCategory.length > 0 ||
    pl.opexByCategory.length > 0;

  const periodInput = (() => {
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
  })();

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "rgba(232,255,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileText style={{ width: 16, height: 16, color: "#e8ff00" }} />
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            Conto Economico (P&L)
          </h2>
        </div>
        <div className="flex items-center gap-3 ml-auto">
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
          <button
            type="button"
            onClick={() => window.print()}
            className="glass-btn flex items-center gap-1.5"
            style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8 }}
          >
            <Printer style={{ width: 14, height: 14 }} /> Esporta
          </button>
        </div>
      </motion.div>

      {!hasData ? (
        <motion.div
          className="glass-card-static"
          style={{ padding: "48px 24px", textAlign: "center", borderRadius: "var(--radius-lg)" }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <FileText style={{ width: 40, height: 40, color: "var(--text-quaternary)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 500 }}>
            Nessun dato per il periodo selezionato.
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="glass-card-static print-area"
          style={{
            padding: "28px 32px",
            borderRadius: "var(--radius-lg)",
            maxWidth: 680,
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Conto Economico
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
              Periodo: {period} ({PERIOD_LABELS.find((p) => p.value === periodType)?.label})
            </p>
          </div>

          {/* REVENUE SECTION */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent-gold, #e8ff00)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            Ricavi
          </p>
          {pl.revenueByCategory.map((r) => (
            <div key={r.category} style={lineStyle}>
              <span style={labelStyle}>{r.label}</span>
              <span style={amountStyle}>{fmtMoney(r.amount)}</span>
            </div>
          ))}
          {pl.totalDiscounts > 0 && (
            <div style={lineStyle}>
              <span style={{ ...labelStyle, color: "#ef4444" }}>Sconti</span>
              <span style={{ ...amountStyle, color: "#ef4444" }}>{fmtMoney(pl.totalDiscounts, true)}</span>
            </div>
          )}
          <div style={sectionDivider} />
          <div style={lineStyle}>
            <span style={totalLabelStyle}>RICAVI NETTI</span>
            <span style={{ ...totalAmountStyle, color: "#22c55e" }}>{fmtMoney(pl.netRevenue)}</span>
          </div>
          {doubleDivider}

          {/* COGS SECTION */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#ef4444",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: 16,
              marginBottom: 6,
            }}
          >
            Costo del Venduto (COGS)
          </p>
          {pl.cogsByCategory.map((c) => (
            <div key={c.category} style={lineStyle}>
              <span style={labelStyle}>{c.label}</span>
              <span style={{ ...amountStyle, color: "#ef4444" }}>{fmtMoney(c.amount, true)}</span>
            </div>
          ))}
          <div style={sectionDivider} />
          <div style={lineStyle}>
            <span style={totalLabelStyle}>TOTALE COGS</span>
            <span style={{ ...totalAmountStyle, color: "#ef4444" }}>{fmtMoney(pl.totalCogs, true)}</span>
          </div>
          {doubleDivider}

          {/* GROSS PROFIT */}
          <div style={{ ...lineStyle, marginTop: 8 }}>
            <span style={{ ...totalLabelStyle, fontSize: 15 }}>UTILE LORDO</span>
            <span
              style={{
                ...totalAmountStyle,
                fontSize: 15,
                color: pl.grossProfit >= 0 ? "#22c55e" : "#ef4444",
              }}
            >
              {pl.grossProfit < 0 ? fmtMoney(pl.grossProfit, true) : fmtMoney(pl.grossProfit)}
            </span>
          </div>
          <div style={lineStyle}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>Margine lordo</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {pl.grossMarginPct.toFixed(1)}%
            </span>
          </div>

          {/* OPEX SECTION */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#f59e0b",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: 16,
              marginBottom: 6,
            }}
          >
            Spese Operative (OPEX)
          </p>
          {pl.opexByCategory.map((o) => (
            <div key={o.category} style={lineStyle}>
              <span style={labelStyle}>{o.label}</span>
              <span style={{ ...amountStyle, color: "#f59e0b" }}>{fmtMoney(o.amount, true)}</span>
            </div>
          ))}
          <div style={sectionDivider} />
          <div style={lineStyle}>
            <span style={totalLabelStyle}>TOTALE OPEX</span>
            <span style={{ ...totalAmountStyle, color: "#f59e0b" }}>{fmtMoney(pl.totalOpex, true)}</span>
          </div>
          {doubleDivider}

          {/* EBITDA */}
          <div
            style={{
              ...lineStyle,
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              EBITDA
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: pl.ebitda >= 0 ? "#22c55e" : "#ef4444",
              }}
            >
              {pl.ebitda < 0 ? fmtMoney(pl.ebitda, true) : fmtMoney(pl.ebitda)}
            </span>
          </div>
          <div style={{ ...lineStyle, paddingLeft: 14 }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>Margine EBITDA</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {pl.ebitdaMarginPct.toFixed(1)}%
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
