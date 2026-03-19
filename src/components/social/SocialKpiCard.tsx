import { useState } from "react";
import { Expand } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

interface SocialKpiCardProps {
  label: string;
  sublabel?: string;
  value: string;
  change: number;
  changePercent: number;
  changeSuffix?: string;   // " pts" for engagement rate
  sparkline: number[];
  accentColor?: string;
  icon?: string;
  onClick?: () => void;
}

export function SocialKpiCard({
  label,
  sublabel,
  value,
  change,
  changePercent,
  changeSuffix = "",
  sparkline,
  accentColor = "#10b981",
  icon,
  onClick,
}: SocialKpiCardProps) {
  const [hovered, setHovered] = useState(false);

  const isPos = change > 0;
  const isNeg = change < 0;
  const changeColor  = isPos ? "#10b981"              : isNeg ? "#ef4444"              : "rgba(255,255,255,0.3)";
  const changeBg     = isPos ? "rgba(16,185,129,0.1)" : isNeg ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)";
  const arrow        = isPos ? "↑" : isNeg ? "↓" : "→";
  const gradId       = `kpi-${label.replace(/\W/g, "")}`;
  const data         = sparkline.map((v, i) => ({ i, v }));

  const fmtChange = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${(abs / 1_000).toFixed(1)}K`;
    return abs.toLocaleString();
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 14,
        padding: "20px 20px 52px",
        position: "relative",
        overflow: "hidden",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.4)" : "none",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease",
        cursor: onClick ? "pointer" : "default",
        minHeight: 148,
      }}
    >
      {/* Expand icon — only when clickable */}
      {onClick && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: icon ? 48 : 10,
            opacity: hovered ? 0.5 : 0,
            transition: "opacity 0.18s ease",
            pointerEvents: "none",
          }}
        >
          <Expand size={13} color="rgba(255,255,255,0.6)" />
        </div>
      )}

      {/* Corner glow */}
      <div style={{
        position: "absolute", top: -24, right: -24,
        width: 80, height: 80, borderRadius: "50%",
        background: accentColor, opacity: hovered ? 0.1 : 0.055,
        filter: "blur(22px)", pointerEvents: "none",
        transition: "opacity 0.18s ease",
      }} />

      {/* Label row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: sublabel ? 2 : 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.1px", color: "rgba(255,255,255,0.35)" }}>
          {label}
        </p>
        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `${accentColor}18`, border: `1px solid ${accentColor}28`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}>
            {icon}
          </div>
        )}
      </div>

      {sublabel && (
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>{sublabel}</p>
      )}

      {/* Big value */}
      <p style={{ fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.8px", lineHeight: 1, marginBottom: 10 }}>
        {value}
      </p>

      {/* Change row */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontSize: 12, fontWeight: 700, color: changeColor,
          background: changeBg, padding: "3px 8px", borderRadius: 20,
        }}>
          {isPos ? "+" : isNeg ? "-" : ""}{fmtChange(change)}{changeSuffix}
        </span>
        <span style={{ fontSize: 11, color: changeColor, opacity: 0.7 }}>
          {arrow} {Math.abs(changePercent).toFixed(1)}% vs prev
        </span>
      </div>

      {/* Sparkline — bleeds to card edges */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 44, opacity: hovered ? 0.8 : 0.55, transition: "opacity 0.18s ease" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ display: "none" }}
              cursor={{ stroke: accentColor, strokeOpacity: 0.3, strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={accentColor}
              strokeWidth={1.5}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 3, fill: accentColor, stroke: "#0d1117", strokeWidth: 1.5 }}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
