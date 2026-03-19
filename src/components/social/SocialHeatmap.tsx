import { useState } from "react";

interface SocialHeatmapProps {
  data: number[][]; // [dayIdx 0-6][timeIdx 0-5]  values 0-1
  accentColor?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = ["6am", "9am", "12pm", "3pm", "6pm", "9pm"];

// Convert 0-1 value to approximate engagement % (0.1→1%, 0.9→9%)
function toEngPct(val: number) {
  return (val * 10).toFixed(1);
}

export function SocialHeatmap({ data, accentColor = "#10b981" }: SocialHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ day: string; time: string; val: number; x: number; y: number } | null>(null);

  // Find top 3 best times
  type Cell = { day: string; time: string; val: number };
  const allCells: Cell[] = [];
  DAYS.forEach((day, dayIdx) => {
    TIMES.forEach((time, timeIdx) => {
      allCells.push({ day, time, val: data[dayIdx]?.[timeIdx] ?? 0 });
    });
  });
  const bestTimes = [...allCells].sort((a, b) => b.val - a.val).slice(0, 3);

  // Parse accentColor for rgba usage
  function cellBg(val: number) {
    const opacity = 0.06 + val * 0.56; // 0.06 to 0.62
    // Try to extract rgb from hex if it's a hex color
    if (accentColor.startsWith("#")) {
      const hex = accentColor.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
    }
    return `rgba(16,185,129,${opacity.toFixed(2)})`;
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px repeat(7, 1fr)", gap: 3 }}>
        {/* Header row */}
        <div />
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", padding: "4px 0" }}>
            {d}
          </div>
        ))}

        {/* Data rows */}
        {TIMES.map((time, timeIdx) => (
          <>
            <div key={`label-${time}`} style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
              {time}
            </div>
            {DAYS.map((day, dayIdx) => {
              const val = data[dayIdx]?.[timeIdx] ?? 0;
              return (
                <div
                  key={`${day}-${time}`}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 5,
                    background: cellBg(val),
                    border: "1px solid rgba(255,255,255,0.04)",
                    minHeight: 26,
                    cursor: "pointer",
                    transition: "transform 0.1s, box-shadow 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.15)";
                    e.currentTarget.style.boxShadow = `0 0 8px ${cellBg(val)}`;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ day, time, val, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                    setTooltip(null);
                  }}
                />
              );
            })}
          </>
        ))}
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 48,
            transform: "translateX(-50%)",
            background: "rgba(8,12,24,0.97)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 11,
            color: "rgba(255,255,255,0.8)",
            fontWeight: 600,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {tooltip.day} {tooltip.time} — Avg engagement: {toEngPct(tooltip.val)}%
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, justifyContent: "center" }}>
        {[{ label: "Low", v: 0.1 }, { label: "Medium", v: 0.35 }, { label: "High", v: 0.65 }, { label: "Peak", v: 0.9 }].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: cellBg(l.v) }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {bestTimes.length > 0 && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10, textAlign: "center" }}>
          Best times:{" "}
          {bestTimes.map((t, i) => (
            <span key={i} style={{ fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
              {t.day} {t.time}{i < bestTimes.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
