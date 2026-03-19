import { FileText, Users, CreditCard, Package, CheckSquare, FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityItem } from "@/lib/profileStore";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  invoice: { icon: <FileText className="w-3.5 h-3.5" />, color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
  client: { icon: <Users className="w-3.5 h-3.5" />, color: "#34d399", bg: "rgba(16,185,129,0.12)" },
  payment: { icon: <CreditCard className="w-3.5 h-3.5" />, color: "#fbbf24", bg: "rgba(245,158,11,0.12)" },
  product: { icon: <Package className="w-3.5 h-3.5" />, color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
  task: { icon: <CheckSquare className="w-3.5 h-3.5" />, color: "#f472b6", bg: "rgba(244,63,94,0.12)" },
  document: { icon: <FolderOpen className="w-3.5 h-3.5" />, color: "#9ca3af", bg: "rgba(107,114,128,0.12)" },
};

interface Props {
  activities: ActivityItem[];
}

export function ActivityTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute left-[15px] top-2 bottom-2 w-px"
        style={{ background: "var(--divider-strong)" }}
      />
      <div className="flex flex-col gap-0.5">
        {activities.map((item) => {
          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.document;
          return (
            <div key={item.id} className="flex items-start gap-3 relative py-2.5 pl-0">
              <div
                className="relative z-[1] flex items-center justify-center shrink-0"
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: config.bg, color: config.color,
                }}
              >
                {config.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>{item.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                  </span>
                  {item.amount && (
                    <span className="text-[11px] font-semibold" style={{ color: "#34d399" }}>
                      €{item.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
