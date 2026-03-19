import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { useNumberFormat } from "@/lib/numberFormat";
import type { AnnualTotals } from "@/lib/financialCalculations";

interface BarDef {
  name: string;
  visible: number;
  top: number;
  bottom: number;
  color1: string;
  color2: string;
  isSubtraction: boolean;
  gradientId: string;
  metricKey: string;
}

interface ConnectorDef {
  fromIdx: number;
  toIdx: number;
  yValue: number;
}

interface Props {
  totals: AnnualTotals;
}

export function PLWaterfallChart({ totals }: Props) {
  const { theme } = useTheme();
  const { formatCurrency } = useNumberFormat();
  const fmtShort = (v: number) => formatCurrency(v, true);
  const isLight = theme === "light";

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setAnimProgress(0);
    let start: number | null = null;
    const duration = 900;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setAnimProgress(p);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [totals]);

  const chartTop = 50;
  const chartBottom = 310;
  const chartLeft = 60;
  const chartRight = width - 20;
  const chartH = chartBottom - chartTop;
  const maxValue = totals.totalRevenue * 1.08;
  const barWidth = Math.min(64, (chartRight - chartLeft) / 9);

  const y = useCallback((v: number) => chartTop + ((maxValue - v) / maxValue) * chartH, [maxValue, chartH, chartTop]);

  const bars: BarDef[] = [
    { name: "Revenue", visible: totals.totalRevenue, top: y(totals.totalRevenue), bottom: y(0), color1: "#6ee7b7", color2: isLight ? "#059669" : "#34d399", isSubtraction: false, gradientId: "gRevenue", metricKey: "totalRevenue" },
    { name: "COGS", visible: totals.totalDirectCosts, top: y(totals.totalRevenue), bottom: y(totals.totalRevenue - totals.totalDirectCosts), color1: "#fdba74", color2: isLight ? "#ea580c" : "#f97316", isSubtraction: true, gradientId: "gCOGS", metricKey: "directCosts" },
    { name: "Gross Profit", visible: totals.totalGrossProfit, top: y(totals.totalGrossProfit), bottom: y(0), color1: "#6ee7b7", color2: isLight ? "#059669" : "#10b981", isSubtraction: false, gradientId: "gGP", metricKey: "grossProfit" },
    { name: "OPEX", visible: totals.totalIndirectCosts, top: y(totals.totalGrossProfit), bottom: y(totals.totalGrossProfit - totals.totalIndirectCosts), color1: "#fde68a", color2: isLight ? "#d97706" : "#f59e0b", isSubtraction: true, gradientId: "gOPEX", metricKey: "indirectCosts" },
    { name: "EBIT", visible: totals.totalOperatingProfit, top: y(totals.totalOperatingProfit), bottom: y(0), color1: "#93c5fd", color2: isLight ? "#2563eb" : "#3b82f6", isSubtraction: false, gradientId: "gEBIT", metricKey: "operatingProfit" },
    { name: "Taxes", visible: totals.totalTaxes, top: y(totals.totalOperatingProfit), bottom: y(totals.totalOperatingProfit - totals.totalTaxes), color1: "#fda4af", color2: isLight ? "#e11d48" : "#f43f5e", isSubtraction: true, gradientId: "gTaxes", metricKey: "taxes" },
    { name: "Net Profit", visible: totals.totalNetProfit, top: y(totals.totalNetProfit), bottom: y(0), color1: "#c4b5fd", color2: isLight ? "#7c3aed" : "#8b5cf6", isSubtraction: false, gradientId: "gNP", metricKey: "netProfit" },
  ];

  const connectors: ConnectorDef[] = [
    { fromIdx: 0, toIdx: 1, yValue: totals.totalRevenue },
    { fromIdx: 1, toIdx: 2, yValue: totals.totalGrossProfit },
    { fromIdx: 2, toIdx: 3, yValue: totals.totalGrossProfit },
    { fromIdx: 3, toIdx: 4, yValue: totals.totalOperatingProfit },
    { fromIdx: 4, toIdx: 5, yValue: totals.totalOperatingProfit },
    { fromIdx: 5, toIdx: 6, yValue: totals.totalNetProfit },
  ];

  const totalBars = bars.length;
  const spacing = (chartRight - chartLeft) / totalBars;
  const getBarX = (i: number) => chartLeft + spacing * i + (spacing - barWidth) / 2;

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (maxValue / tickCount) * i);

  const ease = (t: number) => {
    const c4 = (2 * Math.PI) / 4.5;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((1 + c4) * 2 * t - c4)) / 2
      : (Math.pow(2 * t - 2, 2) * ((1 + c4) * (t * 2 - 2) + c4) + 2) / 2;
  };

  const getBarProgress = (idx: number) => {
    const staggerDelay = 0.08;
    const barDuration = 0.55;
    const barStart = staggerDelay * idx;
    const normalizedTime = animProgress * (staggerDelay * (totalBars - 1) + barDuration);
    const barTime = Math.max(0, Math.min(1, (normalizedTime - barStart) / barDuration));
    return ease(barTime);
  };

  const summaryItems = [
    { label: "Revenue", value: totals.totalRevenue, color: isLight ? "#059669" : "#34d399", pct: null as number | null },
    { label: "Gross Profit", value: totals.totalGrossProfit, color: isLight ? "#059669" : "#10b981", pct: totals.annualGrossMargin },
    { label: "EBIT", value: totals.totalOperatingProfit, color: isLight ? "#2563eb" : "#3b82f6", pct: totals.annualOperatingMargin },
    { label: "Net Profit", value: totals.totalNetProfit, color: isLight ? "#7c3aed" : "#8b5cf6", pct: totals.annualNetMargin },
  ];

  return (
    <div>
      <div ref={containerRef} className="overflow-x-auto">
        <div style={{ minWidth: 600, position: "relative" }}>
          <svg width={width} height={370} viewBox={`0 0 ${width} 370`} style={{ display: "block", overflow: "visible" }}>
            <defs>
              {bars.map((b) => (
                <linearGradient key={b.gradientId} id={b.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={b.color1} />
                  <stop offset="100%" stopColor={b.color2} />
                </linearGradient>
              ))}
              <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.2" />
              </filter>
            </defs>

            {ticks.map((tv, i) => {
              const yy = y(tv);
              return (
                <g key={i}>
                  <line x1={chartLeft} y1={yy} x2={chartRight} y2={yy} stroke="var(--chart-grid)" strokeWidth={1} />
                  <text x={chartLeft - 8} y={yy + 4} textAnchor="end" fontSize={10} fill="var(--text-quaternary)" fontWeight={500}>
                    {fmtShort(tv)}
                  </text>
                </g>
              );
            })}

            {connectors.map((c, ci) => {
              const fromP = getBarProgress(c.fromIdx);
              const toP = getBarProgress(c.toIdx);
              const lineOpacity = Math.min(fromP, toP);
              if (lineOpacity < 0.01) return null;
              const yy = y(c.yValue);
              return (
                <line key={`c${ci}`} x1={getBarX(c.fromIdx) + barWidth} y1={yy} x2={getBarX(c.toIdx)} y2={yy}
                  stroke="var(--divider-strong)" strokeDasharray="4 4" strokeWidth={1} opacity={lineOpacity} />
              );
            })}

            {bars.map((bar, i) => {
              const progress = getBarProgress(i);
              const bx = getBarX(i);
              const fullHeight = bar.bottom - bar.top;
              const animatedHeight = fullHeight * progress;
              const barY = bar.isSubtraction ? bar.top : bar.bottom - animatedHeight;
              const isHovered = hoveredIdx === i;
              const isDimmed = hoveredIdx !== null && hoveredIdx !== i;
              const opacity = isDimmed ? 0.35 : 1;
              const scale = isHovered ? 1.03 : 1;
              const brightness = isHovered ? 1.15 : 1;

              return (
                <g key={bar.name} style={{ opacity, transition: "opacity 0.2s ease, filter 0.2s ease", filter: `brightness(${brightness})` }}
                  onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                  <rect x={bx + (barWidth * (1 - scale)) / 2} y={barY} width={barWidth * scale} height={Math.max(animatedHeight, 0)}
                    rx={4} ry={4} fill={`url(#${bar.gradientId})`} filter="url(#barShadow)" style={{ transition: "all 0.2s ease", cursor: "pointer" }} />
                  {progress > 0.5 && (
                    <g style={{ opacity: Math.min(1, (progress - 0.5) * 4) }}>
                      <rect x={bx + barWidth / 2 - 34} y={barY - 28} width={68} height={22} rx={6}
                        fill="var(--glass-bg-active)" stroke="var(--glass-border)" strokeWidth={0.5} />
                      <text x={bx + barWidth / 2} y={barY - 13} textAnchor="middle" fontSize={10} fontWeight={600} fill={bar.color2}>
                        {bar.isSubtraction ? "−" : ""}{fmtShort(bar.visible)}
                      </text>
                    </g>
                  )}
                  <text x={bx + barWidth / 2} y={chartBottom + 22} textAnchor="middle" fontSize={12} fontWeight={600}
                    fill={bar.isSubtraction ? "var(--text-tertiary)" : "var(--text-primary)"}>
                    {bar.isSubtraction ? "−" : ""}{bar.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredIdx !== null && (() => {
            const bar = bars[hoveredIdx];
            const bx = getBarX(hoveredIdx);
            const pct = totals.totalRevenue > 0 ? ((bar.visible / totals.totalRevenue) * 100).toFixed(1) : "0";
            return (
              <div style={{
                position: "absolute", left: bx + barWidth / 2, top: Math.max(0, bar.top - 120), transform: "translateX(-50%)",
                background: "var(--glass-bg-elevated)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)",
                border: "0.5px solid var(--glass-border-strong)", borderRadius: "var(--radius-xl)", padding: "14px 18px",
                boxShadow: "var(--glass-shadow-lg)", pointerEvents: "none", zIndex: 20, minWidth: 180, animation: "fadeInUp 0.15s ease-out",
              }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>{bar.name}</p>
                <p style={{ fontWeight: 700, fontSize: 18, color: bar.color2, marginBottom: 6 }}>{bar.isSubtraction ? "−" : ""}{formatCurrency(bar.visible)}</p>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{pct}% del fatturato</p>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                  {bar.isSubtraction ? `Riduce il profitto di ${formatCurrency(bar.visible)}` : `Margine: ${pct}%`}
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-5 px-5 py-3.5"
        style={{ background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-xl)", border: "0.5px solid var(--glass-border-subtle)" }}>
        {summaryItems.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <span style={{ fontSize: 16, color: "var(--text-quaternary)", fontWeight: 300 }}>→</span>}
            <div style={{ background: "var(--glass-bg)", borderRadius: "var(--radius-md)", padding: "8px 16px", border: "0.5px solid var(--glass-border)", textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 500, color: "var(--text-quaternary)", marginBottom: 2, textTransform: "uppercase" }}>{item.label}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{fmtShort(item.value)}</p>
              {item.pct !== null && <p style={{ fontSize: 11, fontWeight: 600, color: item.color, opacity: 0.6 }}>({item.pct.toFixed(1)}%)</p>}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
