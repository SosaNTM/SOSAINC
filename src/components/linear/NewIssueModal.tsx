import { useState, useEffect } from "react";
import { ALL_USERS } from "@/lib/authContext";
import {
  ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_LABELS, ESTIMATE_OPTIONS,
  type Issue, type IssueStatus, type IssuePriority, type Project,
} from "@/lib/linearStore";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onCreate: (data: Omit<Issue, "id" | "createdAt" | "updatedAt" | "comments" | "subIssueIds">) => void;
  projects: Project[];
  creatorId: string;
  defaultProjectId?: string | null;
  defaultStatus?: IssueStatus;
}

export function NewIssueModal({ onClose, onCreate, projects, creatorId, defaultProjectId, defaultStatus }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<IssueStatus>(defaultStatus || "todo");
  const [priority, setPriority] = useState<IssuePriority>("none");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>(defaultProjectId || "");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [estimate, setEstimate] = useState<string>("");

  const selectedProject = projects.find(p => p.id === projectId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleCreate();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [title, description, status, priority, assigneeId, labels, projectId, milestoneId, dueDate, estimate]);

  const toggleLabel = (l: string) => setLabels(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(), description, status, priority,
      assigneeId: assigneeId || null, creatorId, labels,
      projectId: projectId || null,
      milestoneId: milestoneId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimate: estimate ? Number(estimate) : null,
      parentId: null,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[80]" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[580px] max-h-[85vh] overflow-y-auto animate-scale-in"
        style={{
          background: "var(--modal-bg)",
          backdropFilter: "var(--glass-blur)",
          border: "1px solid var(--modal-border)",
          borderRadius: 16, padding: 0,
          boxShadow: "var(--modal-shadow)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>New Issue</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Title */}
          <input
            className="w-full"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Issue title"
            autoFocus
            style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", background: "transparent", border: "none", outline: "none", padding: 0 }}
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a description... (supports markdown)"
            rows={4}
            style={{ fontSize: 14, color: "var(--text-secondary)", background: "transparent", border: "none", outline: "none", padding: 0, resize: "none", lineHeight: 1.6 }}
          />

          {/* Divider */}
          <div style={{ height: 1, background: "var(--glass-border)" }} />

          {/* Property pills row */}
          <div className="flex flex-wrap gap-2">
            {/* Status */}
            <div className="flex items-center gap-1.5" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, padding: "4px 8px" }}>
              <StatusIcon status={status} size={12} />
              <select value={status} onChange={e => setStatus(e.target.value as IssueStatus)} style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}>
                {ISSUE_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-1.5" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, padding: "4px 8px" }}>
              <PriorityIcon priority={priority} size={12} />
              <select value={priority} onChange={e => setPriority(e.target.value as IssuePriority)} style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}>
                {ISSUE_PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-1.5" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, padding: "4px 8px" }}>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}>
                <option value="">Assignee</option>
                {ALL_USERS.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
            </div>

            {/* Project */}
            <div className="flex items-center gap-1.5" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, padding: "4px 8px" }}>
              <select value={projectId} onChange={e => { setProjectId(e.target.value); setMilestoneId(""); }} style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}>
                <option value="">Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
            </div>

            {/* Milestone */}
            {selectedProject && (
              <div className="flex items-center gap-1.5" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, padding: "4px 8px" }}>
                <select value={milestoneId} onChange={e => setMilestoneId(e.target.value)} style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}>
                  <option value="">Milestone</option>
                  {selectedProject.milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}

            {/* Due Date */}
            <div className="flex items-center gap-1.5" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, padding: "4px 8px" }}>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }} />
            </div>

            {/* Estimate */}
            <div className="flex items-center gap-1.5" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, padding: "4px 8px" }}>
              <select value={estimate} onChange={e => setEstimate(e.target.value)} style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}>
                <option value="">Estimate</option>
                {ESTIMATE_OPTIONS.map(e => <option key={e} value={e}>{e} pts</option>)}
              </select>
            </div>
          </div>

          {/* Labels */}
          <div className="flex flex-wrap gap-1.5">
            {ISSUE_LABELS.map(l => (
              <button type="button" key={l.name} onClick={() => toggleLabel(l.name)} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 99, cursor: "pointer", border: "none",
                background: labels.includes(l.name) ? `${l.color}20` : "var(--glass-bg)",
                color: labels.includes(l.name) ? l.color : "var(--text-quaternary)",
                fontWeight: labels.includes(l.name) ? 600 : 400,
                outline: labels.includes(l.name) ? `1px solid ${l.color}40` : "0.5px solid var(--glass-border)",
              }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: l.color, marginRight: 4, verticalAlign: "middle" }} />
                {l.name}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>⌘Enter to save</span>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="glass-btn" style={{ fontSize: 13, padding: "8px 16px", borderRadius: 8 }}>Cancel</button>
              <button type="button" onClick={handleCreate} disabled={!title.trim()} className="glass-btn-primary" style={{ fontSize: 13, padding: "8px 16px", borderRadius: 8, opacity: title.trim() ? 1 : 0.5 }}>
                Create Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
