import React from "react";

interface GlassTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}

export function GlassTooltip({ active, payload, label, formatter }: GlassTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(10, 10, 10, 0.9)",
        border: "0.5px solid rgba(232, 255, 0, 0.2)",
        borderRadius: 8,
        padding: "7px 12px",
        fontSize: 12,
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {label && (
        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4, fontSize: 10 }}>
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || "#e8ff00", margin: 0 }}>
          {entry.name}: {formatter ? formatter(entry.value, entry.name) : entry.value}
        </p>
      ))}
    </div>
  );
}
