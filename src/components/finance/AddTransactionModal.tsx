import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Euro, Calendar, ChevronDown, Check, Tag as TagIcon, Loader2 } from "lucide-react";
import { PAYMENT_METHOD_LABELS } from "@/types/finance";
import type { NewPersonalTransaction, PersonalTransaction } from "@/types/finance";
import { useIncomeCategories, useExpenseCategories } from "@/hooks/settings";

const today = () => new Date().toISOString().slice(0, 10);

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)",
      letterSpacing: "0.08em", textTransform: "uppercase",
      marginBottom: 6, fontFamily: "var(--font-mono)",
    }}>
      {children}
    </p>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p style={{ fontSize: 11, color: "var(--color-error)", marginTop: 4 }}>{msg}</p>;
}

interface Props {
  open:         boolean;
  onClose:      () => void;
  onSave:       (data: NewPersonalTransaction) => Promise<boolean>;
  initialData?: PersonalTransaction;
  title?:       string;
}

export function AddTransactionModal({ open, onClose, onSave, initialData, title }: Props) {
  const { data: allIncomeCategories } = useIncomeCategories();
  const { data: allExpenseCategories } = useExpenseCategories();
  const activeIncomeCategories = allIncomeCategories.filter((c) => c.is_active);
  const activeExpenseCategories = allExpenseCategories.filter((c) => c.is_active);

  const [type,          setType]          = useState<"income" | "expense" | "transfer">("expense");
  const [amount,        setAmount]        = useState("");
  const [category,      setCategory]      = useState("");
  const [subcategory,   setSubcategory]   = useState("");
  const [description,   setDescription]   = useState("");
  const [date,          setDate]          = useState(today);
  const [payMethod,     setPayMethod]     = useState<NewPersonalTransaction["payment_method"]>("card");
  const [tagsInput,     setTagsInput]     = useState("");
  const [tags,          setTags]          = useState<string[]>([]);
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [saving,        setSaving]        = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);

  const catList = type === "income" ? activeIncomeCategories : activeExpenseCategories;

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
        setTags(initialData.tags ?? []);
      } else {
        setType("expense"); setAmount(""); setCategory(""); setSubcategory("");
        setDescription(""); setDate(today()); setPayMethod("card"); setTags([]);
      }
      setTagsInput(""); setErrors({});
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

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
      e.amount = "Inserisci un importo valido";
    if (!category) e.category = "Seleziona una categoria";
    if (!date) e.date = "Inserisci una data valida";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const ok = await onSave({
      user_id:            "",
      type,
      amount:             Math.abs(Number(amount)),
      currency:           "EUR",
      category,
      subcategory:        subcategory || undefined,
      description:        description || category,
      date,
      payment_method:     payMethod,
      is_recurring:       false,
      tags:               tags.length > 0 ? tags : undefined,
    });
    setSaving(false);
    if (ok) onClose();
  }

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "var(--glass-bg, rgba(255,255,255,0.04))",
    border: "1px solid var(--glass-border)",
    borderRadius: 10,
    color: "var(--text-primary)",
    fontSize: 13,
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const TYPE_COLORS = {
    expense:  { active: "#ef4444", label: "Uscita" },
    income:   { active: "#22c55e", label: "Entrata" },
    transfer: { active: "var(--accent-primary)", label: "Trasferimento" },
  };

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px 16px",
          }}
        >
          <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)" }} />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              width: "100%", maxWidth: 560,
              maxHeight: "90vh", overflowY: "auto",
              background: "var(--glass-bg-elevated)",
              backdropFilter: "var(--glass-blur-heavy)",
              WebkitBackdropFilter: "var(--glass-blur-heavy)",
              border: "1px solid var(--glass-border)",
              borderRadius: 18,
              padding: "24px 24px 20px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-body)" }}>
                {title ?? "Aggiungi Transazione"}
              </h2>
              <button onClick={onClose} style={{
                width: 30, height: 30, borderRadius: 8,
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-secondary)", transition: "background 0.15s",
              }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Type */}
            <div style={{ marginBottom: 16 }}>
              <Label>Tipo</Label>
              <div style={{ display: "flex", gap: 6 }}>
                {(["expense", "income", "transfer"] as const).map((t) => {
                  const { active: color, label } = TYPE_COLORS[t];
                  const isActive = type === t;
                  return (
                    <button key={t} onClick={() => setType(t)} style={{
                      flex: 1, padding: "8px 4px", borderRadius: 10,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      background: isActive ? `${color}18` : "var(--glass-bg)",
                      border: isActive ? `1px solid ${color}55` : "1px solid var(--glass-border)",
                      color: isActive ? color : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <Label>Titolo</Label>
              <input
                autoFocus
                value={subcategory} onChange={(e) => setSubcategory(e.target.value)}
                placeholder={type === "expense" ? "es. Spesa, Netflix, Affitto…" : "es. Pagamento cliente, Fattura #42…"}
                style={{ ...inputStyle, padding: "10px 14px" }}
                autoComplete="off"
              />
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 16 }}>
              <Label>Importo</Label>
              <div style={{ position: "relative" }}>
                <Euro style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  width: 15, height: 15, color: "var(--accent-primary)", pointerEvents: "none",
                }} />
                <input
                  type="number" min="0" step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle, padding: "12px 14px 12px 36px", fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}
                />
              </div>
              <FieldError msg={errors.amount} />
            </div>

            {/* Category */}
            <div style={{ marginBottom: 16 }}>
              <Label>Categoria</Label>
              <div style={{ position: "relative" }}>
                {category && (() => {
                  const sel = catList.find((c) => c.name === category);
                  return sel ? (
                    <span style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      fontSize: 16, pointerEvents: "none", zIndex: 1,
                    }}>{sel.icon}</span>
                  ) : null;
                })()}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    ...inputStyle,
                    padding: category ? "10px 36px 10px 36px" : "10px 36px 10px 14px",
                    appearance: "none", cursor: "pointer",
                  }}
                >
                  <option value="">Seleziona categoria...</option>
                  {catList.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  width: 14, height: 14, color: "var(--text-tertiary)", pointerEvents: "none",
                }} />
              </div>
              <FieldError msg={errors.category} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <Label>Descrizione <span style={{ fontWeight: 400, opacity: 0.6 }}>(opzionale)</span></Label>
              <div style={{ position: "relative" }}>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  placeholder="Nota libera sulla transazione..."
                  rows={2}
                  style={{ ...inputStyle, padding: "10px 14px", resize: "none" }}
                />
                <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "var(--text-quaternary)", fontFamily: "var(--font-mono)" }}>
                  {description.length}/200
                </span>
              </div>
            </div>

            {/* Date + Method */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <Label>Data</Label>
                <div style={{ position: "relative" }}>
                  <Calendar style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-tertiary)", pointerEvents: "none" }} />
                  <input
                    type="date"
                    value={date} onChange={(e) => setDate(e.target.value)}
                    style={{ ...inputStyle, padding: "10px 10px 10px 32px" }}
                  />
                </div>
                <FieldError msg={errors.date} />
              </div>
              <div>
                <Label>Metodo di Pagamento</Label>
                <div style={{ position: "relative" }}>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}
                    style={{ ...inputStyle, padding: "10px 32px 10px 12px", appearance: "none", cursor: "pointer" }}>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-tertiary)", pointerEvents: "none" }} />
                </div>
              </div>
            </div>


            {/* Tags */}
            <div style={{ marginBottom: 20 }}>
              <Label>Tag <span style={{ fontWeight: 400, opacity: 0.6 }}>(premi Invio per aggiungere)</span></Label>
              <div
                style={{
                  ...inputStyle, padding: "8px 10px",
                  display: "flex", flexWrap: "wrap", gap: 6, minHeight: 42, cursor: "text",
                }}
                onClick={() => tagRef.current?.focus()}
              >
                {tags.map((t) => (
                  <span key={t} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "2px 8px 2px 6px", borderRadius: 99,
                    background: "var(--accent-primary-soft)",
                    border: "1px solid var(--accent-primary)",
                    color: "var(--accent-primary)", fontSize: 11, fontWeight: 600,
                  }}>
                    <TagIcon style={{ width: 10, height: 10 }} />
                    {t}
                    <button onClick={() => removeTag(t)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--accent-primary)", padding: 0, lineHeight: 1, marginLeft: 2,
                    }}>×</button>
                  </span>
                ))}
                <input
                  ref={tagRef}
                  value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder={tags.length === 0 ? "es. vacanza, lavoro..." : ""}
                  style={{
                    border: "none", outline: "none", background: "transparent",
                    color: "var(--text-primary)", fontSize: 12,
                    fontFamily: "var(--font-body)", minWidth: 80, flex: 1,
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)", fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "var(--font-body)",
                transition: "background 0.15s",
              }}>
                Annulla
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 2, padding: "11px 0", borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer",
                background: "var(--accent-primary)",
                border: "none", color: "#000",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                opacity: saving ? 0.7 : 1, transition: "opacity 0.15s",
                fontFamily: "var(--font-body)",
              }}>
                {saving
                  ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  : <><Check style={{ width: 14, height: 14 }} />Salva</>
                }
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
