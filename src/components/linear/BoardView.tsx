import { useState } from "react";
import { getUserById } from "@/lib/authContext";
import { ISSUE_STATUSES, ISSUE_LABELS, type Issue, type IssueStatus } from "@/lib/linearStore";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { toast } from "@/hooks/use-toast";

interface Props {
  issues: Issue[];
  onSelectIssue: (id: string) => void;
  onUpdateStatus: (id: string, status: IssueStatus) => void;
}

const BOARD_STATUSES: IssueStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"];

export function BoardView({ issues, onSelectIssue, onUpdateStatus }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);

  const topLevel = issues.filter(i => i.parentId === null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 300 }}>
      {BOARD_STATUSES.map(statusKey => {
        const status = ISSUE_STATUSES.find(s => s.key === statusKey)!;
        const colIssues = topLevel.filter(i => i.status === statusKey);

        return (
          <div
            key={statusKey}
            className="flex flex-col min-w-[240px] flex-1"
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (dragId) {
                try {
                  onUpdateStatus(dragId, statusKey);
                } catch (err) {
                  toast({ title: "Move failed", description: "Could not update issue status. Please try again." });
                }
                setDragId(null);
              }
            }}
            style={{
              background: "var(--glass-bg)",
              border: dragId ? "1.5px dashed var(--glass-border-hover)" : "0.5px solid var(--glass-border-subtle)",
              borderRadius: 12,
              padding: 10,
            }}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <StatusIcon status={statusKey} size={14} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{status.label}</span>
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 99, background: "var(--glass-bg)", color: "var(--text-quaternary)", fontWeight: 600 }}>{colIssues.length}</span>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {colIssues.map(issue => {
                const assignee = issue.assigneeId ? getUserById(issue.assigneeId) : null;
                const subCount = issues.filter(i => i.parentId === issue.id).length;

                return (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={() => setDragId(issue.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => onSelectIssue(issue.id)}
                    className="cursor-pointer transition-all"
                    style={{
                      background: "var(--glass-bg-subtle)",
                      border: `0.5px solid ${dragId === issue.id ? "var(--glass-border-hover)" : "var(--glass-border-subtle)"}`,
                      borderRadius: 8,
                      padding: 10,
                      opacity: dragId === issue.id ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--glass-bg)"; e.currentTarget.style.borderColor = "var(--glass-border-hover)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--glass-bg-subtle)"; e.currentTarget.style.borderColor = "var(--glass-border-subtle)"; }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <PriorityIcon priority={issue.priority} size={12} />
                      <span style={{ fontSize: 10, color: "var(--text-quaternary)", fontFamily: "monospace" }}>{issue.id}</span>
                    </div>
                    <p className="line-clamp-2" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 8 }}>{issue.title}</p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {issue.labels.slice(0, 2).map(l => {
                        const lbl = ISSUE_LABELS.find(x => x.name === l);
                        return (
                          <span key={l} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: `${lbl?.color || "#888"}15`, color: lbl?.color || "#888" }}>
                            {l}
                          </span>
                        );
                      })}
                      {subCount > 0 && (
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: "var(--glass-bg)", color: "var(--text-quaternary)" }}>
                          {subCount} sub
                        </span>
                      )}
                      <div className="ml-auto">
                        {assignee ? (
                          <div title={assignee.displayName} style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--glass-bg-hover)", fontSize: 8, fontWeight: 700, color: "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {assignee.displayName.charAt(0)}
                          </div>
                        ) : (
                          <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1px dashed var(--glass-border)" }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
