import { useMemo, useState } from "react";
import type { DateRange } from "@/hooks/useFinanceSummary";

interface DayData {
  date: string;   // YYYY-MM-DD
  amount: number;
}

interface Props {
  data: DayData[];
  range: DateRange;
  formatAmount: (n: number) => string;
  onDayClick: (date: string) => void;
}

const DAYS_OF_WEEK = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];

// Returns index 0 (Mon) … 6 (Sun) matching DAYS_OF_WEEK
function dowIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

interface WeekColumn {
  monthLabel: string | null; // first week of a new month gets the label
  days: ({ date: string; amount: number; inRange: boolean } | null)[];
}

export function CalendarHeatmap({ data, range, formatAmount, onDayClick }: Props) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const { weeks, maxAmount } = useMemo(() => {
    const amountMap: Record<string, number> = {};
    data.forEach(d => { amountMap[d.date] = d.amount; });

    const rangeFrom = new Date(range.from + "T00:00:00");
    const rangeTo   = new Date(range.to   + "T00:00:00");

    // Start from the Monday of the week containing range.from
    const startDay = new Date(rangeFrom);
    startDay.setDate(startDay.getDate() - dowIndex(startDay));

    // End at the Sunday of the week containing range.to
    const endDay = new Date(rangeTo);
    endDay.setDate(endDay.getDate() + (6 - dowIndex(endDay)));

    const cols: WeekColumn[] = [];
    const cur = new Date(startDay);
    let lastMonth = -1;

    while (cur <= endDay) {
      // Start of a new week column
      const weekDays: WeekColumn["days"] = [];
      let monthLabel: string | null = null;

      for (let d = 0; d < 7; d++) {
        const dateStr = cur.toISOString().slice(0, 10);
        const inRange = cur >= rangeFrom && cur <= rangeTo;

        if (inRange && cur.getMonth() !== lastMonth) {
          monthLabel = cur.toLocaleDateString("it-IT", { month: "short" });
          lastMonth  = cur.getMonth();
        }

        weekDays.push({
          date:     dateStr,
          amount:   amountMap[dateStr] ?? 0,
          inRange,
        });

        cur.setDate(cur.getDate() + 1);
      }

      cols.push({ monthLabel, days: weekDays });
    }

    // Clamp max at 95th percentile to prevent one outlier washing out all colors
    const amounts = data.map(d => d.amount).filter(a => a > 0).sort((a, b) => a - b);
    const p95 = amounts.length > 0
      ? amounts[Math.floor(amounts.length * 0.95)]
      : 1;

    return { weeks: cols, maxAmount: Math.max(p95, 1) };
  }, [data, range]);

  function cellOpacity(amount: number, inRange: boolean): number {
    if (!inRange) return 0;
    if (amount === 0) return 0;
    return Math.min(1, 0.15 + (amount / maxAmount) * 0.85);
  }

  const hoveredEntry = hoveredDate ? data.find(d => d.date === hoveredDate) : null;

  return (
    <div style={{ position: "relative" }}>
      {/* Tooltip */}
      {hoveredDate && (
        <div style={{
          position: "absolute", top: -40, left: 0,
          background: "var(--glass-bg-elevated)", border: "1px solid var(--glass-border)",
          borderRadius: 8, padding: "5px 10px",
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--text-primary)", pointerEvents: "none", zIndex: 10,
          whiteSpace: "nowrap",
        }}>
          <span style={{ color: "var(--text-tertiary)", marginRight: 6 }}>
            {new Date(hoveredDate + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <span style={{ color: hoveredEntry && hoveredEntry.amount > 0 ? "var(--color-error)" : "var(--text-tertiary)" }}>
            {hoveredEntry && hoveredEntry.amount > 0 ? formatAmount(hoveredEntry.amount) : "Nessuna spesa"}
          </span>
        </div>
      )}

      {/* Scroll wrapper for mobile */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          {/* Day-of-week labels column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 18, marginRight: 4 }}>
            {DAYS_OF_WEEK.map(dow => (
              <div key={dow} style={{
                width: 24, height: 14,
                fontSize: 9, fontFamily: "var(--font-mono)",
                color: "var(--text-tertiary)", textAlign: "right",
                lineHeight: "14px", userSelect: "none",
              }}>
                {/* Show only Mon, Wed, Fri to avoid crowding */}
                {dow === "Lu" || dow === "Me" || dow === "Ve" ? dow : ""}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 2 }}>
              {/* Month label */}
              <div style={{
                height: 16, fontSize: 9, fontFamily: "var(--font-mono)",
                color: week.monthLabel ? "var(--text-secondary)" : "transparent",
                userSelect: "none", letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}>
                {week.monthLabel ?? ""}
              </div>
              {/* Day cells */}
              {week.days.map((day, di) => {
                if (!day) return <div key={di} style={{ width: 14, height: 14 }} />;
                const opacity = cellOpacity(day.amount, day.inRange);
                const isHovered = hoveredDate === day.date;
                return (
                  <div
                    key={di}
                    title={day.inRange ? `${day.date}: ${day.amount > 0 ? formatAmount(day.amount) : "—"}` : undefined}
                    onClick={() => { if (day.inRange && day.amount > 0) onDayClick(day.date); }}
                    onMouseEnter={() => { if (day.inRange) setHoveredDate(day.date); }}
                    onMouseLeave={() => setHoveredDate(null)}
                    style={{
                      width: 14, height: 14,
                      borderRadius: 3,
                      cursor: day.inRange && day.amount > 0 ? "pointer" : "default",
                      transition: "transform 0.1s",
                      transform: isHovered ? "scale(1.25)" : "scale(1)",
                      background: !day.inRange
                        ? "var(--glass-border)"
                        : day.amount === 0
                          ? "rgba(255,255,255,0.04)"
                          : `rgba(248,113,113,${opacity})`, // red tint, variable intensity
                      border: isHovered && day.inRange ? "1px solid rgba(248,113,113,0.7)" : "1px solid transparent",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", marginRight: 4 }}>Meno</span>
        {[0.05, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: 2,
            background: v === 0.05 ? "rgba(255,255,255,0.04)" : `rgba(248,113,113,${0.15 + v * 0.85})`,
          }} />
        ))}
        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", marginLeft: 4 }}>Di più</span>
      </div>
    </div>
  );
}
