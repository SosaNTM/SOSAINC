import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const GOLD = "#e8ff00";

const CATEGORIES = [
  { value: "Savings",     emoji: "💰", color: "#2ECC71" },
  { value: "Investment",  emoji: "📈", color: "#4A9EFF" },
  { value: "Purchase",    emoji: "🛍️", color: "#f59e0b" },
  { value: "Other",       emoji: "🎯", color: "#e8ff00" },
];

export interface NewGoalData {
  name: string;
  target: number;
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
  netWorth: number;
}

interface FormState {
  name: string;
  target: string;
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
  background: "var(--sosa-bg-2)",
  border: "1px solid var(--sosa-border)",
  borderRadius: 0,
  padding: "10px 12px",
  fontSize: 13.5,
  color: "var(--text-primary)",
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
  fontFamily: "var(--font-mono)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "var(--text-quaternary)",
  textTransform: "uppercase",
  marginBottom: 6,
};

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#FF5A5A",
  marginTop: 4,
};

export function NewGoalModal({ open, onClose, onSave, initialData, netWorth }: NewGoalModalProps) {
  const isEditing = !!initialData;
  const [form, setForm] = useState<FormState>({
    name: "", target: "", deadline: "", category: "Savings", notes: "",
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
          deadline: "",
          category: initialData.category,
          notes: "",
        });
      } else {
        setForm({ name: "", target: "", deadline: "", category: "Savings", notes: "" });
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

    onSave({
      name: form.name.trim(),
      target: Number(form.target),
      deadline: form.deadline || initialData?.deadline || "",
      category: cat.value,
      color: cat.color,
      emoji: cat.emoji,
    });

    setSaved(true);
    setTimeout(() => onClose(), 900);
  }

  const target = Number(form.target) || 0;
  const previewPct = target > 0 ? Math.min(100, Math.max(0, Math.round((netWorth / target) * 100))) : 0;

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
          background: "var(--sosa-bg-3)",
          border: "1px solid var(--sosa-border)",
          borderRadius: 0,
          padding: "32px",
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
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
            style={{ width: 30, height: 30, borderRadius: 0, border: "1px solid var(--sosa-border)", background: "var(--sosa-bg-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X style={{ width: 14, height: 14, color: "var(--sosa-white-40)" }} />
          </button>
        </div>

        {/* Success overlay */}
        {saved && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 0,
            background: "var(--sosa-bg-3)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 10, zIndex: 10,
          }}>
            <span style={{ fontSize: 36 }}>✓</span>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#2ECC71" }}>Goal saved!</p>
          </div>
        )}

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Live Net Worth banner */}
          <div style={{
            background: "rgba(22,163,74,0.08)",
            border: "1px solid rgba(22,163,74,0.2)",
            borderRadius: 0,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 2 }}>Your Current Net Worth</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#22c55e", letterSpacing: "-0.5px" }}>
                â‚¬{netWorth.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            {target > 0 && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 2 }}>Progress Preview</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: previewPct >= 100 ? "#2ECC71" : "var(--text-primary)" }}>{previewPct}%</p>
              </div>
            )}
          </div>

          {/* Nome */}
          <div>
            <label style={labelStyle}>Goal Name *</label>
            <input
              type="text" placeholder="e.g. Emergency Fund" maxLength={80}
              value={form.name}
              onChange={e => set("name", e.target.value)}
              style={{ ...inputStyle, borderColor: errors.name ? "#FF5A5A" : "rgba(255,255,255,0.1)" }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = errors.name ? "#FF5A5A" : "var(--sosa-border)")}
            />
            {errors.name && <p style={errorStyle}>{errors.name}</p>}
          </div>

          {/* Target Amount */}
          <div>
            <label style={labelStyle}>Target Amount â‚¬ *</label>
            <input
              type="number" min="0" max="999999999" step="0.01" placeholder="0.00"
              value={form.target}
              onChange={e => set("target", e.target.value)}
              style={{ ...inputStyle, borderColor: errors.target ? "#FF5A5A" : "var(--sosa-border)" }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = errors.target ? "#FF5A5A" : "var(--sosa-border)")}
            />
            {errors.target && <p style={errorStyle}>{errors.target}</p>}
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
                onBlur={e => (e.target.style.borderColor = "var(--sosa-border)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={form.category}
                onChange={e => set("category", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", colorScheme: "light" }}
                onFocus={e => (e.target.style.borderColor = GOLD)}
                onBlur={e => (e.target.style.borderColor = "var(--sosa-border)")}
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
              background: "transparent", color: "var(--text-quaternary)", fontSize: 13,
              cursor: "pointer", fontWeight: 500, transition: "all 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--sosa-bg-2)")}
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
