import { useState } from "react";
import { ALL_USERS, getUserById } from "@/lib/authContext";
import { LABEL_OPTIONS, LABEL_COLORS, STATUSES, PRIORITIES, type Task, type TaskStatus, type TaskPriority } from "@/lib/tasksStore";
import { X, Calendar } from "lucide-react";

interface NewTaskModalProps {
  onClose: () => void;
  onCreate: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments" | "attachments" | "completedAt">) => void;
  creatorId: string;
}

export function NewTaskModal({ onClose, onCreate, creatorId }: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [watcherIds, setWatcherIds] = useState<string[]>([]);

  const toggleLabel = (l: string) => setLabels((p) => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]);
  const toggleWatcher = (id: string) => setWatcherIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      creatorId,
      watcherIds,
      labels,
      dueDate: dueDate ? new Date(dueDate) : null,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[80]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div
        className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[520px] max-h-[85vh] overflow-y-auto"
        style={{
          background: "var(--glass-bg-opaque, var(--glass-bg))",
          backdropFilter: "blur(40px)",
          border: "0.5px solid var(--glass-border)",
          borderRadius: 16, padding: 24,
          boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>+ New Task</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Title *</label>
            <input className="glass-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" style={{ fontSize: 14, padding: "10px 14px" }} autoFocus />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Description</label>
            <textarea className="glass-input w-full" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details..." rows={3} style={{ fontSize: 14, padding: "10px 14px", resize: "vertical" }} />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Status</label>
              <select className="glass-input w-full" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} style={{ fontSize: 13, padding: "8px 10px" }}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Priority</label>
              <select className="glass-input w-full" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} style={{ fontSize: 13, padding: "8px 10px" }}>
                {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Assignee + Due */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Assignee</label>
              <select className="glass-input w-full" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={{ fontSize: 13, padding: "8px 10px" }}>
                <option value="">Unassigned</option>
                {ALL_USERS.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Due Date</label>
              <input type="date" className="glass-input w-full" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ fontSize: 13, padding: "8px 10px" }} />
            </div>
          </div>

          {/* Labels */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_OPTIONS.map((l) => (
                <button type="button"
                  key={l}
                  onClick={() => toggleLabel(l)}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 99, cursor: "pointer", border: "none",
                    background: labels.includes(l) ? `${LABEL_COLORS[l]}30` : "var(--glass-bg)",
                    color: labels.includes(l) ? LABEL_COLORS[l] : "var(--text-tertiary)",
                    fontWeight: labels.includes(l) ? 600 : 400,
                    outline: labels.includes(l) ? `1px solid ${LABEL_COLORS[l]}50` : "1px solid var(--glass-border)",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Watchers */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Watchers</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_USERS.map((u) => (
                <button type="button"
                  key={u.id}
                  onClick={() => toggleWatcher(u.id)}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 99, cursor: "pointer", border: "none",
                    background: watcherIds.includes(u.id) ? "var(--accent-color-dim, rgba(110,231,183,0.15))" : "var(--glass-bg)",
                    color: watcherIds.includes(u.id) ? "var(--accent-color)" : "var(--text-tertiary)",
                    fontWeight: watcherIds.includes(u.id) ? 600 : 400,
                    outline: watcherIds.includes(u.id) ? "1px solid var(--accent-color)" : "1px solid var(--glass-border)",
                  }}
                >
                  {u.displayName}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="glass-btn" style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8 }}>Cancel</button>
            <button type="button" onClick={handleCreate} disabled={!title.trim()} className="glass-btn-primary" style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, opacity: title.trim() ? 1 : 0.5 }}>Create Task</button>
          </div>
        </div>
      </div>
    </>
  );
}
