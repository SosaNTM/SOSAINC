import { useState } from "react";
import { ALL_USERS, getUserById } from "@/lib/authContext";
import { useAuth } from "@/lib/authContext";
import { STATUSES, PRIORITIES, LABEL_OPTIONS, LABEL_COLORS, type Task, type TaskStatus, type TaskPriority } from "@/lib/tasksStore";
import { X, Paperclip, Send, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

export function TaskDetailModal({ task, onClose, onUpdate, onDelete, canDelete }: TaskDetailModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [comment, setComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const creator = getUserById(task.creatorId);
  const assignee = task.assigneeId ? getUserById(task.assigneeId) : null;
  const priority = PRIORITIES.find((p) => p.key === task.priority)!;

  const handleAddComment = () => {
    if (!comment.trim() || !user) return;
    const newComment = { id: `c_${Date.now()}`, authorId: user.id, content: comment.trim(), createdAt: new Date() };
    onUpdate(task.id, { comments: [...task.comments, newComment] });
    setComment("");
  };

  const toggleLabel = (l: string) => {
    onUpdate(task.id, { labels: task.labels.includes(l) ? task.labels.filter((x) => x !== l) : [...task.labels, l] });
  };

  return (
    <>
      <div className="fixed inset-0 z-[80]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div
        className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[640px] max-h-[85vh] overflow-y-auto"
        style={{
          background: "var(--glass-bg-opaque, var(--glass-bg))",
          backdropFilter: "blur(40px)",
          border: "0.5px solid var(--glass-border)",
          borderRadius: 16, padding: 0,
          boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <span style={{ fontSize: 12, color: "var(--text-quaternary)", fontFamily: "monospace" }}>{task.id}</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title !== task.title) onUpdate(task.id, { title }); }}
            style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", background: "transparent", border: "none", outline: "none", width: "100%", padding: 0 }}
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => { if (description !== task.description) onUpdate(task.id, { description }); }}
            placeholder="Add a description..."
            rows={3}
            style={{ fontSize: 14, color: "var(--text-secondary)", background: "transparent", border: "none", outline: "none", width: "100%", padding: 0, resize: "none", lineHeight: 1.6 }}
          />

          {/* Status / Priority / Due */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Status</span>
              <select className="glass-input" value={task.status} onChange={(e) => onUpdate(task.id, { status: e.target.value as TaskStatus, ...(e.target.value === "done" ? { completedAt: new Date() } : { completedAt: null }) })} style={{ fontSize: 12, padding: "6px 8px" }}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Priority</span>
              <select className="glass-input" value={task.priority} onChange={(e) => onUpdate(task.id, { priority: e.target.value as TaskPriority })} style={{ fontSize: 12, padding: "6px 8px" }}>
                {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Due Date</span>
              <input type="date" className="glass-input" value={task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : ""} onChange={(e) => onUpdate(task.id, { dueDate: e.target.value ? new Date(e.target.value) : null })} style={{ fontSize: 12, padding: "6px 8px" }} />
            </div>
          </div>

          {/* Assignee / Creator */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Assignee</span>
              <select className="glass-input" value={task.assigneeId || ""} onChange={(e) => onUpdate(task.id, { assigneeId: e.target.value || null })} style={{ fontSize: 12, padding: "6px 8px" }}>
                <option value="">Unassigned</option>
                {ALL_USERS.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Creator</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", padding: "6px 0" }}>{creator?.displayName || "Unknown"}</span>
            </div>
          </div>

          {/* Labels */}
          <div className="flex flex-col gap-1.5">
            <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Labels</span>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_OPTIONS.map((l) => (
                <button type="button" key={l} onClick={() => toggleLabel(l)} style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 99, cursor: "pointer", border: "none",
                  background: task.labels.includes(l) ? `${LABEL_COLORS[l]}30` : "transparent",
                  color: task.labels.includes(l) ? LABEL_COLORS[l] : "var(--text-quaternary)",
                  outline: task.labels.includes(l) ? `1px solid ${LABEL_COLORS[l]}50` : "1px solid var(--glass-border)",
                }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Watchers */}
          <div className="flex flex-col gap-1.5">
            <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Watchers</span>
            <div className="flex flex-wrap gap-1.5">
              {task.watcherIds.map((id) => {
                const w = getUserById(id);
                return w ? <span key={id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--glass-bg)", color: "var(--text-tertiary)" }}>{w.displayName}</span> : null;
              })}
              {task.watcherIds.length === 0 && <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>None</span>}
            </div>
          </div>

          {/* Attachments */}
          {task.attachments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Attachments</span>
              {task.attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  <Paperclip className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-quaternary)" }} />
                  <span>{a.filename}</span>
                  <span style={{ color: "var(--text-quaternary)" }}>({(a.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ))}
            </div>
          )}

          {/* Comments */}
          <div style={{ borderTop: "0.5px solid var(--glass-border)", paddingTop: 16, marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, display: "block" }}>Activity & Comments</span>

            <div className="flex flex-col gap-3 mb-4">
              {task.comments.map((c) => {
                const author = getUserById(c.authorId);
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--accent-color-dim, rgba(110,231,183,0.15))", fontSize: 10, fontWeight: 700, color: "var(--accent-color)" }}>
                      {author?.displayName.charAt(0) || "?"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{author?.displayName}</span>
                        <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>{formatDistanceToNow(c.createdAt, { addSuffix: true })}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.5 }}>{c.content}</p>
                    </div>
                  </div>
                );
              })}
              {task.comments.length === 0 && <p style={{ fontSize: 12, color: "var(--text-quaternary)" }}>No comments yet</p>}
            </div>

            {/* Add comment */}
            <div className="flex gap-2">
              <input
                className="glass-input flex-1"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                placeholder="Write a comment..."
                style={{ fontSize: 13, padding: "8px 12px" }}
              />
              <button type="button" onClick={handleAddComment} className="glass-btn-primary" style={{ padding: "8px 12px", borderRadius: 8 }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        {canDelete && (
          <div className="p-5 pt-0">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12, color: "#ef4444" }}>Are you sure?</span>
                <button type="button" onClick={() => { onDelete(task.id); onClose(); }} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, background: "#ef4444", color: "white", border: "none", cursor: "pointer" }}>Delete</button>
                <button type="button" onClick={() => setShowDeleteConfirm(false)} className="glass-btn" style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6 }}>Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete Task
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
