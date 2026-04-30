import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  type BillingCycle,
  BILLING_CYCLE_LABELS,
  getFirstBillingDateFromStart,
} from "../services/subscriptionCycles";
import { useSubscriptionCategories } from "@/hooks/settings";

// ── Constants ─────────────────────────────────────────────────────────────────

const GOLD = "#e8ff00";

const EMOJIS = [
  "🎬","🎵","☁️","🎨","🤖","🏋️","🔒","🦜","✨","📰",
  "📺","🎮","🛍️","📱","💼","🏠","🚀","💊","📚","🌐",
  "🍔","🚗","✈️","🎓","💡","🔑","🎯","💰","🧠","🎧",
];

const PRESET_COLORS = [
  "#e50914","#1db954","#3b82f6","#f59e0b",
  "#10a37f","#8b5cf6","#e8ff00","#ef4444",
];

// Categories loaded from useCategories hook (see component body)

const CURRENCIES = ["EUR", "USD", "GBP"];

const BILLING_CYCLES: BillingCycle[] = [
  "monthly","quarterly","quadrimestral","biannual","annual",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NewSubFormData {
  name: string;
  icon: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  billing_day: number;
  start_date: string;
  category: string;
  description: string;
  color: string;
  is_active: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewSubFormData) => void;
  initialData?: NewSubFormData;
}

interface FormState {
  name: string;
  icon: string;
  amount: string;
  currency: string;
  billing_cycle: BillingCycle;
  billing_day: string;
  start_date: string;
  category: string;
  description: string;
  color: string;
}

interface FormErrors {
  name?: string;
  amount?: string;
  billing_day?: string;
  start_date?: string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "var(--btn-glass-bg, rgba(255,255,255,0.05))",
  border: "1px solid var(--btn-glass-border, rgba(255,255,255,0.1))",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 13.5,
  color: "var(--text-primary)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
  colorScheme: "dark",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  color: "var(--text-quaternary)",
  textTransform: "uppercase",
  marginBottom: 7,
};

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#FF5A5A",
  marginTop: 5,
};

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = GOLD;
  e.target.style.boxShadow = `0 0 0 3px rgba(232,255,0,0.12)`;
}
function blurBorder(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  isError = false,
) {
  e.target.style.borderColor = isError ? "#FF5A5A" : "rgba(255,255,255,0.1)";
  e.target.style.boxShadow = "none";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewSubscriptionModal({ isOpen, onClose, onSave, initialData }: Props) {
  const isEditing = !!initialData;
  const { data: subscriptionCategories } = useSubscriptionCategories();
  const defaultCategory = subscriptionCategories[0]?.name ?? "";
  const [form, setForm] = useState<FormState>({
    name: "", icon: "🎬", amount: "", currency: "EUR",
    billing_cycle: "monthly", billing_day: "1",
    start_date: new Date().toISOString().slice(0, 10),
    category: defaultCategory, description: "", color: GOLD,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Populate on open
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        name: initialData.name,
        icon: initialData.icon,
        amount: String(initialData.amount),
        currency: initialData.currency,
        billing_cycle: initialData.billing_cycle,
        billing_day: String(initialData.billing_day),
        start_date: initialData.start_date,
        category: initialData.category,
        description: initialData.description,
        color: initialData.color,
      });
    } else {
      setForm({
        name: "", icon: "🎬", amount: "", currency: "EUR",
        billing_cycle: "monthly", billing_day: "1",
        start_date: new Date().toISOString().slice(0, 10),
        category: defaultCategory, description: "", color: GOLD,
      });
    }
    setErrors({});
    setSaving(false);
    setShowEmojiPicker(false);
  }, [isOpen]);

  // Live next billing date preview
  const nextBillingPreview = useMemo(() => {
    const day = Number(form.billing_day);
    if (!form.start_date || !day || day < 1 || day > 31) return null;
    return getFirstBillingDateFromStart(form.start_date, day);
  }, [form.start_date, form.billing_day]);

  if (!isOpen) return null;

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field in errors) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Name is required";
    const amt = Number(form.amount);
    if (!form.amount || isNaN(amt) || amt < 0.01) errs.amount = "Enter a valid amount";
    const day = Number(form.billing_day);
    if (!form.billing_day || isNaN(day) || day < 1 || day > 31)
      errs.billing_day = "Day must be between 1 and 31";
    if (!form.start_date) errs.start_date = "Start date is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    setSaving(true);
    onSave({
      name: form.name.trim(),
      icon: form.icon,
      amount: Number(form.amount),
      currency: form.currency,
      billing_cycle: form.billing_cycle,
      billing_day: Number(form.billing_day),
      start_date: form.start_date,
      category: form.category,
      description: form.description.trim(),
      color: form.color,
      is_active: true,
    });
  }

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        animation: "subFadeIn 0.18s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--glass-bg-elevated, #1a1a1a)",
          border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
          borderRadius: 20,
          padding: "36px",
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          overflowY: "auto",
          animation: "subSlideUp 0.22s ease-out",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond','Georgia',serif",
            fontSize: 24, fontWeight: 700, color: GOLD, letterSpacing: "0.03em",
          }}>
            {isEditing ? "Edit Subscription" : "New Subscription"}
          </h2>
          <button type="button" onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--btn-glass-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 14, height: 14, color: "var(--text-secondary)" }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Nome + Emoji ── */}
          <div>
            <label style={labelStyle}>Subscription Name *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {/* Emoji button */}
              <button type="button"
                onClick={() => setShowEmojiPicker((p) => !p)}
                style={{
                  width: 48, height: 48, flexShrink: 0, borderRadius: 10, border: "1px solid var(--btn-glass-border)",
                  background: "var(--btn-glass-bg)", cursor: "pointer", fontSize: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {form.icon}
              </button>
              {/* Name input */}
              <input
                type="text" placeholder="e.g. Netflix, Spotify, Adobe..."
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                style={{ ...inputBase, flex: 1, borderColor: errors.name ? "#FF5A5A" : "rgba(255,255,255,0.08)" }}
                onFocus={focusBorder}
                onBlur={(e) => blurBorder(e, !!errors.name)}
              />
            </div>
            {/* Emoji picker — inline flow, no clipping */}
            {showEmojiPicker && (
              <div style={{
                marginTop: 8,
                background: "var(--glass-bg-elevated, #1e1e1e)", border: "1px solid var(--glass-border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                borderRadius: 12, padding: 10,
                display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4,
              }}>
                {EMOJIS.map((em) => (
                  <button key={em} type="button"
                    onClick={() => { set("icon", em); setShowEmojiPicker(false); }}
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent",
                      cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >{em}</button>
                ))}
              </div>
            )}
            {errors.name && <p style={errorStyle}>{errors.name}</p>}
          </div>

          {/* ── Amount + Currency ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <div>
              <label style={labelStyle}>Amount *</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-quaternary)", fontSize: 14, pointerEvents: "none",
                }}>€</span>
                <input
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  style={{ ...inputBase, paddingLeft: 28, borderColor: errors.amount ? "#FF5A5A" : "rgba(255,255,255,0.08)" }}
                  onFocus={focusBorder}
                  onBlur={(e) => blurBorder(e, !!errors.amount)}
                />
              </div>
              {errors.amount && <p style={errorStyle}>{errors.amount}</p>}
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                style={{ ...inputBase, width: 90, cursor: "pointer", colorScheme: "dark" }}
                onFocus={focusBorder} onBlur={(e) => blurBorder(e)}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* ── Ciclo fatturazione ── */}
          <div>
            <label style={labelStyle}>Billing Cycle</label>
            <select
              value={form.billing_cycle}
              onChange={(e) => set("billing_cycle", e.target.value as BillingCycle)}
              style={{ ...inputBase, cursor: "pointer", colorScheme: "dark" }}
              onFocus={focusBorder} onBlur={(e) => blurBorder(e)}
            >
              {BILLING_CYCLES.map((c) => (
                <option key={c} value={c}>{BILLING_CYCLE_LABELS[c]}</option>
              ))}
            </select>
            {nextBillingPreview && (
              <p style={{ fontSize: 11.5, color: "rgba(232,255,0,0.7)", marginTop: 6 }}>
                Next charge:{" "}
                <strong style={{ color: GOLD }}>
                  {nextBillingPreview.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                </strong>
              </p>
            )}
          </div>

          {/* ── Giorno + Data inizio ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Billing Day *</label>
              <input
                type="number" min="1" max="31" placeholder="1–31"
                value={form.billing_day}
                onChange={(e) => set("billing_day", e.target.value)}
                style={{ ...inputBase, borderColor: errors.billing_day ? "#FF5A5A" : "rgba(255,255,255,0.08)" }}
                onFocus={focusBorder}
                onBlur={(e) => blurBorder(e, !!errors.billing_day)}
              />
              {errors.billing_day && <p style={errorStyle}>{errors.billing_day}</p>}
            </div>
            <div>
              <label style={labelStyle}>First Charge Date *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                style={{ ...inputBase, colorScheme: "dark", borderColor: errors.start_date ? "#FF5A5A" : "rgba(255,255,255,0.08)" }}
                onFocus={focusBorder}
                onBlur={(e) => blurBorder(e, !!errors.start_date)}
              />
              {errors.start_date && <p style={errorStyle}>{errors.start_date}</p>}
            </div>
          </div>

          {/* ── Category ── */}
          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              style={{ ...inputBase, cursor: "pointer", colorScheme: "dark" }}
              onFocus={focusBorder} onBlur={(e) => blurBorder(e)}
            >
              {subscriptionCategories.length === 0 && (
                <option value="">No categories — add in Settings</option>
              )}
              {subscriptionCategories.map((c) => (
                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* ── Descrizione ── */}
          <div>
            <label style={labelStyle}>
              Description
              <span style={{ marginLeft: 6, color: "rgba(255,255,255,0.25)" }}>
                ({form.description.length}/200)
              </span>
            </label>
            <textarea
              rows={2}
              maxLength={200}
              placeholder="Optional notes about the subscription..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              style={{ ...inputBase, resize: "vertical", minHeight: 64, fontFamily: "inherit" }}
              onFocus={focusBorder} onBlur={(e) => blurBorder(e)}
            />
          </div>

          {/* ── Colore badge ── */}
          <div>
            <label style={labelStyle}>Badge Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button"
                  onClick={() => set("color", c)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", background: c, border: "none",
                    cursor: "pointer", outline: form.color === c ? `3px solid ${c}` : "none",
                    outlineOffset: 2, transition: "outline 0.1s",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
          <button type="button" onClick={onClose}
            style={{
              flex: 1, height: 48, borderRadius: 10,
              border: "1px solid var(--glass-border)",
              background: "transparent", color: "var(--text-quaternary)",
              fontSize: 13, cursor: "pointer", fontWeight: 500,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{
              flex: 2, height: 48, borderRadius: 10, border: "none",
              background: saving ? "rgba(232,255,0,0.5)" : GOLD,
              color: "#000", fontSize: 13, cursor: saving ? "default" : "pointer",
              fontWeight: 600,
              transition: "filter 0.15s",
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.filter = "brightness(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
          >
            {saving ? "Saving..." : isEditing ? "Update Subscription" : "Save Subscription"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes subFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes subSlideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @media (max-width: 639px) {
          [data-sub-modal] { align-items: flex-end !important; padding: 0 !important; }
          [data-sub-modal-inner] {
            border-radius: 20px 20px 0 0 !important;
            max-height: 95vh !important;
            padding: 24px 20px 32px !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
