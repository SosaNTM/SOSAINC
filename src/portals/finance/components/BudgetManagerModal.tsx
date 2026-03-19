import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Check, Pencil, Info } from "lucide-react";
import type { BudgetCategoryDef } from "./BudgetCategoryPanel";

interface Props {
  open: boolean;
  onClose: () => void;
  categories: BudgetCategoryDef[];
  totalBudget: number;
  onSetTotalBudget: (amount: number) => void;
  onUpdateLimit: (categoryName: string, limit: number) => void;
}

// ── Shared input style ─────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 9,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  color: "#111827",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 5,
  display: "block",
};

// ── Category row (list view) ───────────────────────────────────────────────
function CategoryRow({
  category, onEdit,
}: {
  category: BudgetCategoryDef;
  onEdit: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 0",
      borderBottom: "1px solid #f3f4f6",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: `${category.color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: category.color,
      }}>
        {category.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{category.name}</p>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
          {category.budget > 0
            ? `€${category.budget.toLocaleString("en-US")} / month`
            : "No limit set"}
        </p>
      </div>
      <button onClick={onEdit} style={{ width: 30, height: 30, borderRadius: 8, background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
        <Pencil style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}

// ── Limit editor form ──────────────────────────────────────────────────────
function LimitForm({
  category,
  onSave,
  onCancel,
}: {
  category: BudgetCategoryDef;
  onSave: (limit: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(category.budget > 0 ? String(category.budget) : "");
  const valid = Number(draft) > 0;

  return (
    <div>
      {/* Category info header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px", borderRadius: 12, marginBottom: 18,
        background: `${category.color}0a`, border: `1px solid ${category.color}22`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${category.color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: category.color, fontSize: 18,
        }}>
          {category.icon}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{category.name}</p>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
            Currently spent: €{category.spent.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {/* Limit input */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Monthly Budget Limit (€)</label>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af", pointerEvents: "none" }}>€</span>
          <input
            autoFocus
            type="number"
            min="1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && valid) onSave(Number(draft)); if (e.key === "Escape") onCancel(); }}
            placeholder="0"
            style={{ ...inputStyle, paddingLeft: 26 }}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, height: 38, borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={() => valid && onSave(Number(draft))}
          disabled={!valid}
          style={{
            flex: 2, height: 38, borderRadius: 9, border: "none",
            background: valid ? "#C9A84C" : "#e5e7eb",
            color: valid ? "#fff" : "#9ca3af",
            fontSize: 13, fontWeight: 700, cursor: valid ? "pointer" : "default",
            transition: "all 0.15s",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Total budget editor row ────────────────────────────────────────────────
function TotalBudgetEditor({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");

  const startEdit = () => { setDraft(String(value)); setEditing(true); };
  const commit    = () => {
    const n = Number(draft);
    if (n > 0) onChange(n);
    setEditing(false);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 14px",
      borderRadius: 12,
      background: "linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.04))",
      border: "1px solid rgba(201,168,76,0.22)",
      marginBottom: 16,
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#b8860b", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Total Monthly Budget
        </p>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 14, color: "#9ca3af" }}>€</span>
            <input
              autoFocus
              type="number"
              min="1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
              onBlur={commit}
              style={{ width: 100, height: 30, padding: "0 8px", borderRadius: 8, border: "1.5px solid #C9A84C", background: "#fff", fontSize: 14, fontWeight: 700, color: "#111827", outline: "none" }}
            />
          </div>
        ) : (
          <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "2px 0 0", letterSpacing: "-0.3px" }}>
            €{value.toLocaleString("en-US")}
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>/ month</span>
          </p>
        )}
      </div>
      {!editing && (
        <button
          onClick={startEdit}
          style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,168,76,0.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#b8860b" }}
        >
          <Pencil style={{ width: 13, height: 13 }} />
        </button>
      )}
      {editing && (
        <button
          onClick={commit}
          style={{ width: 30, height: 30, borderRadius: 8, background: "#C9A84C", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
        >
          <Check style={{ width: 13, height: 13 }} />
        </button>
      )}
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────
type View = "list" | { edit: string };

export function BudgetManagerModal({ open, onClose, categories, totalBudget, onSetTotalBudget, onUpdateLimit }: Props) {
  const [view, setView] = useState<View>("list");

  // Reset view on close
  useEffect(() => { if (!open) setTimeout(() => setView("list"), 300); }, [open]);

  // ESC closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { if (view !== "list") setView("list"); else onClose(); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [view, onClose]);

  const editingCategory = typeof view === "object" ? categories.find((c) => c.id === view.edit) : null;

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          {/* Backdrop */}
          <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              width: "100%", maxWidth: 440,
              maxHeight: "85vh",
              background: "#ffffff",
              borderRadius: 20,
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
              <AnimatePresence mode="wait">
                {view !== "list" ? (
                  <motion.button
                    key="back"
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    onClick={() => setView("list")}
                    style={{ width: 30, height: 30, borderRadius: 8, background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
                  >
                    <ChevronLeft style={{ width: 15, height: 15 }} />
                  </motion.button>
                ) : null}
              </AnimatePresence>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                  {view === "list" ? "Budget Manager" : "Set Budget Limit"}
                </h2>
                {view === "list" && (
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
                    {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                style={{ width: 30, height: 30, borderRadius: 8, background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              <AnimatePresence mode="wait">
                {view === "list" ? (
                  <motion.div key="list" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
                    <TotalBudgetEditor value={totalBudget} onChange={onSetTotalBudget} />
                    {categories.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 13 }}>
                        No categories yet. Add categories from the Transactions page.
                      </div>
                    ) : (
                      categories.map((cat) => (
                        <CategoryRow
                          key={cat.id}
                          category={cat}
                          onEdit={() => setView({ edit: cat.id })}
                        />
                      ))
                    )}

                    {/* Info hint */}
                    <div style={{
                      marginTop: 16,
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "10px 12px", borderRadius: 10,
                      background: "#f0f9ff", border: "1px solid #bae6fd",
                    }}>
                      <Info style={{ width: 14, height: 14, color: "#0284c7", flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 11, color: "#0369a1", margin: 0, lineHeight: 1.5 }}>
                        Categories are managed from the Transactions page. New categories you create there will automatically appear here.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    {editingCategory && (
                      <LimitForm
                        category={editingCategory}
                        onSave={(limit) => {
                          onUpdateLimit(editingCategory.name, limit);
                          setView("list");
                        }}
                        onCancel={() => setView("list")}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
