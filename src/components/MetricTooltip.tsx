import { useState, useRef } from "react";
import { CircleHelp } from "lucide-react";
import { useRules } from "@/lib/rulesStore";

export interface MetricInfo {
  title: string;
  text: string;
  formula?: string;
  formulaColor?: string;
  iconTint?: string;
}

export const metricDefinitions: Record<string, MetricInfo> = {
  period: { title: "Period", text: "The time period for this row. Depending on your selected view, this could be a specific day, month, or year.", iconTint: "var(--text-quaternary)" },
  revenue: { title: "Revenue", text: "Total income generated from all sales, services, consulting, and licensing before any costs are subtracted.", iconTint: "var(--color-emerald)" },
  cogs: { title: "COGS — Cost of Goods Sold", text: "Direct costs tied to producing your product or delivering your service.", iconTint: "var(--color-orange)" },
  grossProfit: { title: "Gross Profit", text: "Revenue minus COGS. Shows how much money is left after paying the direct costs of delivery.", formula: "Gross Profit = Revenue − COGS", formulaColor: "var(--color-emerald)", iconTint: "var(--color-emerald)" },
  grossMargin: { title: "Gross Margin %", text: "Gross Profit as a percentage of Revenue. Above 50% is generally strong.", formula: "GM% = (Gross Profit ÷ Revenue) × 100", formulaColor: "var(--color-emerald)", iconTint: "var(--color-emerald)" },
  opex: { title: "OPEX — Operating Expenses", text: "Indirect overhead costs your company pays regardless of sales volume.", iconTint: "var(--color-amber)" },
  ebit: { title: "EBIT — Earnings Before Interest & Taxes", text: "Gross Profit minus OPEX. The truest measure of operational performance.", formula: "EBIT = Gross Profit − OPEX", formulaColor: "var(--color-blue)", iconTint: "var(--color-blue)" },
  taxes: { title: "Corporate Taxes", text: "Tax amount calculated on your EBIT at your configured corporate tax rate.", formula: "Taxes = EBIT × Tax Rate", formulaColor: "var(--color-rose)", iconTint: "var(--color-rose)" },
  netProfit: { title: "Net Profit", text: "The bottom line — what your company actually keeps after ALL costs and taxes.", formula: "Net Profit = EBIT − Taxes", formulaColor: "var(--color-violet)", iconTint: "var(--color-violet)" },
  netMargin: { title: "Net Margin %", text: "Net Profit as a percentage of Revenue. The ultimate profitability metric.", formula: "NM% = (Net Profit ÷ Revenue) × 100", formulaColor: "var(--color-violet)", iconTint: "var(--color-violet)" },
  totalRevenue: { title: "Total Revenue", text: "Total income generated from all sales, services, consulting, and licensing.", iconTint: "var(--color-emerald)" },
  directCosts: { title: "Direct Costs (COGS)", text: "Direct costs tied to producing your product or delivering your service.", iconTint: "var(--color-orange)" },
  indirectCosts: { title: "Indirect Costs (OPEX)", text: "Indirect overhead costs your company pays regardless of sales volume.", iconTint: "var(--color-amber)" },
  operatingProfit: { title: "Operating Profit (EBIT)", text: "Gross Profit minus OPEX. Shows how profitable your core business operations are.", formula: "EBIT = Gross Profit − OPEX", formulaColor: "var(--color-blue)", iconTint: "var(--color-blue)" },
};

interface MetricTooltipProps {
  metricKey: string;
  size?: number;
  className?: string;
  dynamicText?: string;
}

export function MetricTooltip({ metricKey, size = 14, className = "", dynamicText }: MetricTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("above");
  const triggerRef = useRef<HTMLSpanElement>(null);
  const rules = useRules();

  const info = metricDefinitions[metricKey];
  if (!info) return null;

  let displayText = dynamicText || info.text;
  if (metricKey === "taxes") {
    displayText = `Tax amount calculated on your EBIT at your configured corporate tax rate. Current rate: ${rules.taxRate}%.`;
  }

  const handleMouseEnter = () => {
    setVisible(true);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition(rect.top < 200 ? "below" : "above");
    }
  };

  return (
    <span ref={triggerRef} className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter} onMouseLeave={() => setVisible(false)}
      onClick={(e) => { e.stopPropagation(); setVisible(!visible); }} style={{ cursor: "help" }}>
      <CircleHelp style={{ width: size, height: size, strokeWidth: 1.6, color: visible ? "var(--text-secondary)" : "var(--text-quaternary)", transition: "color 0.2s" }} />

      {/* Tooltip — conditionally rendered to prevent bleed-through */}
      {visible && (
        <div
          className="absolute pointer-events-none"
          style={{
            zIndex: 9999,
            animation: "fadeIn 0.2s ease",
            ...(position === "above"
              ? { bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)" }
              : { top: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)" }),
          }}>
          <div className="glass-tooltip" style={{ maxWidth: 320, minWidth: 200 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{info.title}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{displayText}</p>
            {info.formula && (
              <div style={{ marginTop: 8, background: "var(--surface-hover)", borderRadius: "var(--radius-xs)", padding: "6px 10px", fontFamily: "monospace", fontSize: 12, color: info.formulaColor || "var(--text-secondary)", fontWeight: 600 }}>
                {info.formula}
              </div>
            )}
          </div>
          <div style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            ...(position === "above" ? { bottom: -6, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid var(--tooltip-bg)" }
              : { top: -6, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "6px solid var(--tooltip-bg)" }),
          }} />
        </div>
      )}
    </span>
  );
}

interface TableHeaderWithTooltipProps {
  label: string;
  metricKey: string;
  className?: string;
  style?: React.CSSProperties;
}

export function TableHeaderWithTooltip({ label, metricKey, className = "", style }: TableHeaderWithTooltipProps) {
  return (
    <th className={`text-left py-3 px-3 whitespace-nowrap ${className}`}
      style={{ borderBottom: "0.5px solid var(--table-header-border)", ...style }}>
      <span className="inline-flex items-center gap-1.5">{label}<MetricTooltip metricKey={metricKey} /></span>
    </th>
  );
}
