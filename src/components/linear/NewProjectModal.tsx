import { useState } from "react";
import { ALL_USERS } from "@/lib/authContext";
import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@/lib/linearStore";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onCreate: (project: Omit<Project, "id" | "milestones">) => void;
}

const EMOJIS = ["🎨", "📢", "⚙️", "🚀", "📊", "🔒", "💡", "🎯", "📱", "🏗️"];
const COLORS = ["#8b5cf6", "#f97316", "#22c55e", "#3b82f6", "#ef4444", "#ec4899", "#14b8a6", "#eab308"];

export function NewProjectModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🚀");
  const [color, setColor] = useState("#3b82f6");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [leadId, setLeadId] = useState(ALL_USERS[0]?.id || "");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(), emoji, color, status, leadId,
      targetDate: targetDate ? new Date(targetDate) : null,
      description,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[80]" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[480px] animate-scale-in"
        style={{
          background: "var(--sosa-bg-3)",
          border: "1px solid var(--sosa-border)",
          borderRadius: 0, padding: 24,
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>New Project</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Emoji + Name */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Icon</span>
              <div className="flex flex-wrap gap-1" style={{ maxWidth: 120 }}>
                {EMOJIS.map(e => (
                  <button type="button" key={e} onClick={() => setEmoji(e)} style={{
                    fontSize: 16, padding: 4, borderRadius: 6, border: "none", cursor: "pointer",
                    background: emoji === e ? "var(--nav-item-active-bg)" : "transparent",
                  }}>{e}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Name *</span>
              <input className="glass-input w-full" value={name} onChange={e => setName(e.target.value)} placeholder="Project name" style={{ fontSize: 14, padding: "8px 12px" }} autoFocus />
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Color</span>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button type="button" key={c} onClick={() => setColor(c)} style={{
                  width: 20, height: 20, borderRadius: "50%", border: color === c ? "2px solid white" : "2px solid transparent",
                  background: c, cursor: "pointer",
                }} />
              ))}
            </div>
          </div>

          {/* Status + Lead */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Status</span>
              <select className="glass-input w-full" value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} style={{ fontSize: 12, padding: "6px 8px" }}>
                {PROJECT_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Lead</span>
              <select className="glass-input w-full" value={leadId} onChange={e => setLeadId(e.target.value)} style={{ fontSize: 12, padding: "6px 8px" }}>
                {ALL_USERS.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
            </div>
          </div>

          {/* Target Date */}
          <div className="flex flex-col gap-1.5">
            <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Target Date</span>
            <input type="date" className="glass-input w-full" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ fontSize: 12, padding: "6px 8px" }} />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Description</span>
            <textarea className="glass-input w-full" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" rows={2} style={{ fontSize: 13, padding: "8px 12px", resize: "vertical" }} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="glass-btn" style={{ fontSize: 13, padding: "8px 16px", borderRadius: 8 }}>Cancel</button>
            <button type="button" onClick={handleCreate} disabled={!name.trim()} className="glass-btn-primary" style={{ fontSize: 13, padding: "8px 16px", borderRadius: 8, opacity: name.trim() ? 1 : 0.5 }}>Create Project</button>
          </div>
        </div>
      </div>
    </>
  );
}
