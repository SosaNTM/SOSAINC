import { getUserById } from "@/lib/authContext";
import { ISSUE_LABELS, ISSUE_PRIORITIES, type Issue, type IssueStatus, type IssuePriority } from "@/lib/linearStore";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { format, isPast, isToday } from "date-fns";

interface Props {
  issue: Issue;
  onClick: () => void;
  onQuickStatus?: (status: IssueStatus) => void;
  onQuickPriority?: (priority: IssuePriority) => void;
  showId?: boolean;
  showAssignee?: boolean;
  showLabels?: boolean;
  showDueDate?: boolean;
  showEstimate?: boolean;
}

export function IssueRow({ issue, onClick, showId = true, showAssignee = true, showLabels = true, showDueDate = true, showEstimate = true }: Props) {
  const assignee = issue.assigneeId ? getUserById(issue.assigneeId) : null;
  const overdue = !!issue.dueDate && issue.status !== "done" && issue.status !== "cancelled" && isPast(issue.dueDate) && !isToday(issue.dueDate);

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 cursor-pointer transition-colors"
      style={{
        padding: "8px 12px",
        borderBottom: "0.5px solid var(--glass-border-subtle)",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <StatusIcon status={issue.status} size={14} />

      <PriorityIcon priority={issue.priority} size={14} />

      {showId && (
        <span style={{ fontSize: 11, color: "var(--text-quaternary)", fontFamily: "'JetBrains Mono', monospace", minWidth: 52 }}>{issue.id}</span>
      )}

      <span className="flex-1 truncate" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
        {issue.title}
      </span>

      {showLabels && issue.labels.length > 0 && (
        <div className="hidden sm:flex gap-1 shrink-0">
          {issue.labels.slice(0, 2).map(l => {
            const lbl = ISSUE_LABELS.find(x => x.name === l);
            return (
              <span key={l} style={{
                fontSize: 10, padding: "1px 7px", borderRadius: 99,
                background: `${lbl?.color || "#888"}15`,
                color: lbl?.color || "#888",
              }}>
                <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: lbl?.color, marginRight: 3, verticalAlign: "middle" }} />
                {l}
              </span>
            );
          })}
        </div>
      )}

      {showEstimate && issue.estimate && (
        <span style={{ fontSize: 10, color: "var(--text-quaternary)", minWidth: 24, textAlign: "right" }}>{issue.estimate}p</span>
      )}

      {showDueDate && issue.dueDate && (
        <span style={{ fontSize: 11, color: overdue ? "#ef4444" : "var(--text-quaternary)", minWidth: 52, textAlign: "right" }}>
          {format(issue.dueDate, "MMM dd")}
        </span>
      )}

      {showAssignee && (
        <div className="shrink-0" style={{ minWidth: 22 }}>
          {assignee ? (
            <div
              title={assignee.displayName}
              className="flex items-center justify-center"
              style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--glass-bg-hover)", fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)" }}
            >
              {assignee.displayName.charAt(0)}
            </div>
          ) : (
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1px dashed var(--glass-border)" }} />
          )}
        </div>
      )}
    </div>
  );
}
