import { type SocialGoal } from "@/lib/socialStore";

function barColor(pct: number, completed: boolean): string {
  if (completed) return "#10b981";
  if (pct >= 80)  return "rgba(16,185,129,0.75)";
  if (pct >= 50)  return "rgba(245,158,11,0.8)";
  return "rgba(239,68,68,0.65)";
}

function displayValue(g: SocialGoal): string {
  if (g.metric === "engagement_rate") return `${g.currentValue.toFixed(1)}% / ${g.targetValue}%`;
  if (g.metric === "posts_per_month")  return `${g.currentValue} / ${g.targetValue}`;
  if (g.metric === "website_clicks")   return `${g.currentValue.toLocaleString()} / ${g.targetValue.toLocaleString()}`;
  return `${g.currentValue.toLocaleString()} / ${g.targetValue.toLocaleString()}`;
}

export function GoalsProgress({ goals }: { goals: SocialGoal[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {goals.map((g) => {
        const pct       = Math.min((g.currentValue / g.targetValue) * 100, 100);
        const completed = g.status === "completed" || pct >= 100;
        const color     = barColor(pct, completed);

        return (
          <div key={g.id}>
            {/* Label row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{g.label}</p>
              {completed ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                  ✅ Complete
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>
                  {Math.round(pct)}%
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div
              style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden", marginBottom: 5, cursor: "default" }}
              title={`${Math.round(pct)}% — ${displayValue(g)}`}
            >
              <div style={{
                height: "100%", borderRadius: 4, width: `${pct}%`, background: color,
                transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: pct > 0 ? `0 0 8px ${color}` : "none",
              }} />
            </div>

            {/* Sub-label */}
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{displayValue(g)}</p>
          </div>
        );
      })}
    </div>
  );
}
