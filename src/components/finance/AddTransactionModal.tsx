// ── AddTransactionModal ────────────────────────────────────────────────────────
// Dark luxury modal for adding personal finance transactions.
// All labels in English. Uses useCategories() as single source of truth.

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Euro, Calendar, ChevronDown, Repeat, Check, Tag as TagIcon } from "lucide-react";
import { PAYMENT_METHOD_LABELS } from "@/types/finance";
import type { NewPersonalTransaction, PersonalTransaction } from "@/types/finance";
import { useCategories } from "@/hooks/useCategories";

// ── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

const FIELD: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  color: "#111827",
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </p>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p style={{ fontSize: 11, color: "#e54d4d", marginTop: 4 }}>{msg}</p>;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean;
  onClose:      () => void;
  onSave:       (data: NewPersonalTransaction) => Promise<boolean>;
  initialData?: PersonalTransaction;
  title?:       string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AddTransactionModal({ open, onClose, onSave, initialData, title }: Props) {
  const { activeExpenseCategories, activeIncomeCategories } = useCategories();

  const [type,        setType]        = useState<"income" | "expense" | "transfer">("expense");
  const [amount,      setAmount]      = useState("");
  const [category,    setCategory]    = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [date,        setDate]        = useState(today);
  const [payMethod,   setPayMethod]   = useState<NewPersonalTransaction["payment_method"]>("card");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurInterval, setRecurInterval] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [tagsInput,   setTagsInput]   = useState("");
  const [tags,        setTags]        = useState<string[]>([]);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [saving,      setSaving]      = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);

  const catList = type === "income" ? activeIncomeCategories : activeExpenseCategories;

  // Reset form on open — pre-fill when editing
  useEffect(() => {
    if (open) {
      if (initialData) {
        setType(initialData.type);
        setAmount(String(initialData.amount));
        setCategory(initialData.category);
        setSubcategory(initialData.subcategory ?? "");
        setDescription(initialData.description ?? "");
        setDate(initialData.date);
        setPayMethod(initialData.payment_method ?? "card");
        setIsRecurring(initialData.is_recurring ?? false);
        setRecurInterval(initialData.recurring_interval ?? "monthly");
        setTags(initialData.tags ?? []);
      } else {
        setType("expense"); setAmount(""); setCategory(""); setSubcategory("");
        setDescription(""); setDate(today()); setPayMethod("card");
        setIsRecurring(false); setRecurInterval("monthly");
        setTags([]);
      }
      setTagsInput(""); setErrors({});
    }
  }, [open, initialData]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Clear category when type changes
  useEffect(() => { setCategory(""); }, [type]);

  function addTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = tagsInput.trim().replace(/,$/, "");
      if (v && !tags.includes(v)) setTags([...tags, v]);
      setTagsInput("");
    }
  }

  function removeTag(t: string) { setTags(tags.filter((x) => x !== t)); }

  function validate() {
    const e: Record<string, string> = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = "Enter a valid amount greater than 0";
    if (!category) e.category = "Select a category";
    if (!date) e.date = "Enter a valid date";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const ok = await onSave({
      user_id:            "",   // filled by hook
      type,
      amount:             Math.abs(Number(amount)),
      currency:           "EUR",
      category,
      subcategory:        subcategory || undefined,
      description:        description || category,
      date,
      payment_method:     payMethod,
      is_recurring:       isRecurring,
      recurring_interval: isRecurring ? recurInterval : undefined,
      tags:               tags.length > 0 ? tags : undefined,
    });
    setSaving(false);
    if (ok) onClose();
  }

  if (!open) return null;

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}
        >
          {/* Backdrop */}
          <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: "24px 24px 20px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>{title ?? "Add Transaction"}</h2>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 9, background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* ── Type ──────────────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <Label>Type</Label>
              <div style={{ display: "flex", gap: 6 }}>
                {(["expense", "income", "transfer"] as const).map((t) => {
                  const labels = { expense: "Expense", income: "Income", transfer: "Transfer" };
                  const colors = { expense: "#ef4444", income: "#4ade80", transfer: "#e8ff00" };
                  const active = type === t;
                  return (
                    <button key={t} onClick={() => setType(t)}
                      style={{
                        flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: active ? `${colors[t]}15` : "#f3f4f6",
                        border: active ? `1px solid ${colors[t]}55` : "1px solid #e5e7eb",
                        color: active ? colors[t] : "#6b7280",
                        transition: "all 0.15s",
                      }}>
                      {labels[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Title ─────────────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <Label>Title</Label>
              <input
                autoFocus
                value={subcategory} onChange={(e) => setSubcategory(e.target.value)}
                placeholder={type === "expense" ? "e.g. Groceries, Netflix, Rent…" : "e.g. Client payment, Invoice #42…"}
                style={{ ...FIELD, padding: "10px 14px" }}
                autoComplete="off"
              />
            </div>

            {/* ── Amount ────────────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <Label>Amount</Label>
              <div style={{ position: "relative" }}>
                <Euro style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#e8ff00" }} />
                <input
                  type="number" min="0" step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ ...FIELD, padding: "12px 14px 12px 36px", fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}
                />
              </div>
              <FieldError msg={errors.amount} />
            </div>

            {/* ── Category ──────────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <Label>Category</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
                {catList.map((cat) => {
                  const active = category === cat.name;
                  return (
                    <button key={cat.id} onClick={() => setCategory(cat.name)}
                      style={{
                        padding: "7px 10px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                        background: active ? `${cat.color}15` : "#f3f4f6",
                        border: active ? `1px solid ${cat.color}55` : "1px solid #e5e7eb",
                        color: active ? cat.color : "#6b7280",
                        transition: "all 0.15s",
                      }}>
                      <span style={{ fontSize: 14 }}>{cat.icon}</span>
                      {cat.name}
                    </button>
                  );
                })}
              </div>
              <FieldError msg={errors.category} />
            </div>

            {/* ── Description ──────────────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <Label>Description <span style={{ fontWeight: 400, color: "#666" }}>(optional)</span></Label>
              <div style={{ position: "relative" }}>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  placeholder="Free note about the transaction..."
                  rows={2}
                  style={{ ...FIELD, padding: "10px 14px", resize: "none" }}
                />
                <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "#666" }}>
                  {description.length}/200
                </span>
              </div>
            </div>

            {/* ── Date + Method ────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <Label>Date</Label>
                <div style={{ position: "relative" }}>
                  <Calendar style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af", pointerEvents: "none" }} />
                  <input
                    type="date"
                    value={date} onChange={(e) => setDate(e.target.value)}
                    style={{ ...FIELD, padding: "10px 10px 10px 32px" }}
                  />
                </div>
                <FieldError msg={errors.date} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <div style={{ position: "relative" }}>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}
                    style={{ ...FIELD, padding: "10px 32px 10px 12px", appearance: "none", cursor: "pointer" }}>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af", pointerEvents: "none" }} />
                </div>
              </div>
            </div>

            {/* ── Recurring ────────────────────────────────────────── */}
            <div style={{ marginBottom: 16, padding: "12px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Repeat style={{ width: 14, height: 14, color: "#6b7280" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Recurring</span>
                </div>
                <button onClick={() => setIsRecurring(!isRecurring)}
                  style={{
                    width: 40, height: 22, borderRadius: 99, cursor: "pointer", border: "none",
                    background: isRecurring ? "#e8ff00" : "#d1d5db",
                    position: "relative", transition: "background 0.2s",
                  }}>
                  <div style={{
                    position: "absolute", top: 3, left: isRecurring ? 20 : 3,
                    width: 16, height: 16, borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s",
                  }} />
                </button>
              </div>
              {isRecurring && (
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  {(["weekly", "monthly", "yearly"] as const).map((iv) => {
                    const labels = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
                    const active = recurInterval === iv;
                    return (
                      <button key={iv} onClick={() => setRecurInterval(iv)}
                        style={{
                          flex: 1, padding: "6px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          background: active ? "#e8ff0018" : "#ffffff",
                          border: active ? "1px solid #e8ff0055" : "1px solid #e5e7eb",
                          color: active ? "#b8cc00" : "#6b7280", transition: "all 0.15s",
                        }}>
                        {labels[iv]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Tags ─────────────────────────────────────────────── */}
            <div style={{ marginBottom: 20 }}>
              <Label>Tags <span style={{ fontWeight: 400, color: "#666" }}>(press Enter to add)</span></Label>
              <div style={{ ...FIELD, padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 6, minHeight: 42, cursor: "text" }}
                onClick={() => tagRef.current?.focus()}>
                {tags.map((t) => (
                  <span key={t} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px 2px 6px", borderRadius: 99, background: "#e8ff0022", border: "1px solid #e8ff0044", color: "#e8ff00", fontSize: 11, fontWeight: 600 }}>
                    <TagIcon style={{ width: 10, height: 10 }} />
                    {t}
                    <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e8ff00", padding: 0, lineHeight: 1, marginLeft: 2 }}>x</button>
                  </span>
                ))}
                <input
                  ref={tagRef}
                  value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder={tags.length === 0 ? "e.g. vacation, work..." : ""}
                  style={{ border: "none", outline: "none", background: "transparent", color: "#111827", fontSize: 12, minWidth: 80, flex: 1 }}
                />
              </div>
            </div>

            {/* ── Buttons ──────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{
                  flex: 2, padding: "11px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer",
                  background: saving ? "#e5e7eb" : "#ffffff",
                  border: "1px solid #e5e7eb", color: "#111827",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  opacity: saving ? 0.7 : 1, transition: "opacity 0.15s",
                }}>
                {saving ? "Saving..." : <><Check style={{ width: 14, height: 14 }} />Save</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
