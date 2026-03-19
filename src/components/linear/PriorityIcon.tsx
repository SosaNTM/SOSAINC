import type { IssuePriority } from "@/lib/linearStore";

export function PriorityIcon({ priority, size = 14 }: { priority: IssuePriority; size?: number }) {
  const barW = 2;
  const gap = 1.5;
  const totalBars = 4;
  const totalW = totalBars * barW + (totalBars - 1) * gap;
  const offsetX = (size - totalW) / 2;
  const maxH = size * 0.7;
  const baseY = size * 0.85;

  const activeBars =
    priority === "urgent" ? 4 :
    priority === "high" ? 3 :
    priority === "medium" ? 2 :
    priority === "low" ? 1 : 0;

  const color =
    priority === "urgent" ? "#ef4444" :
    priority === "high" ? "#f97316" :
    priority === "medium" ? "#eab308" :
    priority === "low" ? "#3b82f6" : "#6b7280";

  if (priority === "none") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <line x1={size * 0.2} y1={size / 2} x2={size * 0.8} y2={size / 2} stroke="#6b7280" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }

  if (priority === "urgent") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <path d={`M ${size/2} ${size*0.15} L ${size*0.85} ${size*0.75} L ${size*0.15} ${size*0.75} Z`} fill="#ef4444" />
        <line x1={size/2} y1={size*0.38} x2={size/2} y2={size*0.55} stroke="white" strokeWidth={1.2} strokeLinecap="round" />
        <circle cx={size/2} cy={size*0.63} r={0.8} fill="white" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {Array.from({ length: totalBars }).map((_, i) => {
        const h = maxH * ((i + 1) / totalBars);
        const x = offsetX + i * (barW + gap);
        const active = i < activeBars;
        return (
          <rect
            key={i}
            x={x}
            y={baseY - h}
            width={barW}
            height={h}
            rx={0.5}
            fill={active ? color : "rgba(255,255,255,0.1)"}
          />
        );
      })}
    </svg>
  );
}
