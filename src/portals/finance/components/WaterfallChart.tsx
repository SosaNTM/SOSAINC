import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { WaterfallDataPoint } from "../types/businessFinance";

interface WaterfallChartProps {
  data: WaterfallDataPoint[];
  netRevenue: number;
}

function getFillColor(point: WaterfallDataPoint): string {
  if (point.isTotal) return "#e8ff00";
  if (point.isNegative) return "#ef4444";
  return "#22c55e";
}

// NOTE: Custom tooltip — too specialized for GlassTooltip (extra netRevenue prop, percentage calc, color by point type)
function WaterfallTooltipContent({ active, payload, netRevenue }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as WaterfallDataPoint | undefined;
  if (!point) return null;
  const pct = netRevenue !== 0 ? ((point.value / netRevenue) * 100).toFixed(1) : "0.0";
  return (
    <div
      style={{
        background: "var(--glass-bg-elevated, rgba(30,30,40,0.92))",
        border: "0.5px solid var(--glass-border)",
        borderRadius: 10,
        padding: "8px 14px",
        backdropFilter: "blur(12px)",
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
        {point.name}
      </p>
      <p style={{ fontSize: 13, fontWeight: 600, color: getFillColor(point) }}>
        {point.value < 0 ? "-" : ""}€{Math.abs(point.value).toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
        {pct}% dei ricavi netti
      </p>
    </div>
  );
}

export const WaterfallChart = React.memo(function WaterfallChart({ data, netRevenue }: WaterfallChartProps) {
  const chartData = data.map((d) => {
    const isNegativeBar = d.end < d.start;
    return {
      ...d,
      // For negative bars, start the invisible base at the lower value (end)
      // so the visible bar extends upward to start
      start: isNegativeBar ? d.end : d.start,
      visible: Math.abs(d.end - d.start),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--divider)"
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--divider)" }}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={70}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={<WaterfallTooltipContent netRevenue={netRevenue} />}
          cursor={{ fill: "var(--surface-hover, rgba(255,255,255,0.04))" }}
        />
        <Bar
          dataKey="start"
          stackId="stack"
          fill="transparent"
          isAnimationActive={false}
        />
        <Bar
          dataKey="visible"
          stackId="stack"
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        >
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getFillColor(entry)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});
