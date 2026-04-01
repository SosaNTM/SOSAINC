import { useState } from "react";
import { FileText, Users, CreditCard, Package, CheckSquare, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityItem } from "@/lib/profileStore";

const ITEMS_PER_PAGE = 5;

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
  const [page, setPage] = useState(0);

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No recent activity</p>
      </div>
    );
  }

  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);
  const pageItems = activities.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col flex-1">
      <div className="relative flex-1">
        {/* Vertical line */}
        <div
          className="absolute left-[15px] top-2 bottom-2 w-px"
          style={{ background: "var(--divider-strong)" }}
        />
        <div className="flex flex-col gap-0.5">
          {pageItems.map((item) => {
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
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>{item.description}</p>
                    {item.portal && (
                      <span className="shrink-0 text-[10px] font-700 px-2 py-0.5 rounded-full" style={{ background: "rgba(74,158,255,0.12)", color: "#4A9EFF", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {item.portal}
                      </span>
                    )}
                  </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: "1px solid var(--divider)" }}>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] transition-opacity disabled:opacity-30"
            style={{ background: "var(--glass-bg-subtle)", color: "var(--text-secondary)", border: "0.5px solid var(--glass-border)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] transition-opacity disabled:opacity-30"
            style={{ background: "var(--glass-bg-subtle)", color: "var(--text-secondary)", border: "0.5px solid var(--glass-border)" }}
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
