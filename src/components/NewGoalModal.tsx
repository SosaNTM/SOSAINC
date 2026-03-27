import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const GOLD = "#c9a96e";

const CATEGORIES = [
  { value: "Savings",     emoji: "💰", color: "#2ECC71" },
  { value: "Investment",  emoji: "📈", color: "#4A9EFF" },
  { value: "Purchase",    emoji: "🛍️", color: "#f59e0b" },
  { value: "Other",       emoji: "🎯", color: "#C9A84C" },
];

export interface NewGoalData {
  name: string;
  target: number;
  saved: number;
  deadline: string;
  category: string;
  color: string;
  emoji: string;
}

interface NewGoalModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewGoalData) => void;
  initialData?: NewGoalData;
}

interface FormState {
  name: string;
  target: string;
  saved: string;
  deadline: string;
  category: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  target?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13.5,
  color: "#111827",
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "#6b7280",
  textTransform: "uppercase",
  marginBottom: 6,
};

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#FF5A5A",
  marginTop: 4,
};

export function NewGoalModal({ open, onClose, onSave, initialData }: NewGoalModalProps) {
  const isEditing = !!initialData;
  const [form, setForm] = useState<FormState>({
    name: "", target: "", saved: "0", deadline: "", category: "Savings", notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saved, setSaved] = useState(false);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset / pre-populate on open
  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          name: initialData.name,
          target: String(initialData.target),
          saved: String(initialData.saved),
          deadline: "",
          category: initialData.category,
          notes: "",
        });
      } else {
        setForm({ name: "", target: "", saved: "0", deadline: "", category: "Savings", notes: "" });
      }
      setErrors({});
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field in errors) setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.target.trim() || isNaN(Number(form.target)) || Number(form.target) <= 0)
      errs.target = "Enter a valid amount";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const cat = CATEGORIES.find(c => c.value === form.category) ?? CATEGORIES[3];

    // Format deadline: ISO date → "Mon YYYY", keep existing if not changed
    let deadlineStr = form.deadline;
    if (form.deadline) {
      const d = new Date(form.deadline + "T00:00:00");
      deadlineStr = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    onSave({
      name: form.name.trim(),
      target: Number(form.target),
      saved: Number(form.saved) || 0,
      deadline: deadlineStr || initialData?.deadline || "—",
      category: cat.value,
      color: cat.color,
      emoji: cat.emoji,
    });

    setSaved(true);
    setTimeout(() => onClose(), 900);
  }

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.18s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: "32px",
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "slideUp 0.2s ease-out",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: 22, fontWeight: 700, color: GOLD, letterSpacing: "0.03em",
          }}>
            {isEditing ? "Edit Goal" : "New Goal"}
          </h2>
          <button
            type="button" onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X style={{ width: 14, height: 14, color: "#6b7280" }} />
          </button>
        </div>

        {/* Success overlay */}
        {saved && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 16,
            background: "rgba(255,255,255,0.95)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 10, zIndex: 10,
          }}>
            <span style={{ fontSize: 36 }}>✅</span>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#2ECC71" }}>Goal saved!</p>
          </div>
        )}

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Nome */}
          <div>
            <label style={labelStyle}>Goal Name *</label>
            <input
              type="text" placeholder="e.g. Emergency Fund" maxLength={80}
              value={form.name}
              onChange={e => set("name", e.target.value)}
              style={{ ...inputStyle, borderColor: errors.name ? "#FF5A5A" : "rgba(255,255,255,0.1)" }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = errors.name ? "#FF5A5A" : "#e5e7eb")}
            />
            {errors.name && <p style={errorStyle}>{errors.name}</p>}
          </div>

          {/* Target + Current Amount */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Target Amount € *</label>
              <input
                type="number" min="0" max="999999999" step="0.01" placeholder="0.00"
                value={form.target}
                onChange={e => set("target", e.target.value)}
                style={{ ...inputStyle, borderColor: errors.target ? "#FF5A5A" : "#e5e7eb" }}
                onFocus={e => (e.target.style.borderColor = GOLD)}
                onBlur={e => (e.target.style.borderColor = errors.target ? "#FF5A5A" : "#e5e7eb")}
              />
              {errors.target && <p style={errorStyle}>{errors.target}</p>}
            </div>
            <div>
              <label style={labelStyle}>Current Amount €</label>
              <input
                type="number" min="0" max="999999999" step="0.01" placeholder="0.00"
                value={form.saved}
                onChange={e => set("saved", e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = GOLD)}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>
          </div>

          {/* Deadline + Category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => set("deadline", e.target.value)}
                style={{ ...inputStyle, colorScheme: "light" }}
                onFocus={e => (e.target.style.borderColor = GOLD)}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", colorScheme: "light" }}
                onFocus={e => (e.target.style.borderColor = GOLD)}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              placeholder="Optional description..."
              rows={3}
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              style={{ ...inputStyle, resize: "vertical", minHeight: 72, fontFamily: "inherit" }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
          <button
            type="button" onClick={onClose}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid #e5e7eb",
              background: "transparent", color: "#6b7280", fontSize: 13,
              cursor: "pointer", fontWeight: 500, transition: "all 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleSave}
            style={{
              padding: "10px 22px", borderRadius: 8, border: `1px solid ${GOLD}40`,
              background: `${GOLD}18`, color: GOLD, fontSize: 13,
              cursor: "pointer", fontWeight: 600, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}28`; e.currentTarget.style.borderColor = `${GOLD}70`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${GOLD}18`; e.currentTarget.style.borderColor = `${GOLD}40`; }}
          >
            {isEditing ? "Update Goal" : "Save Goal"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
