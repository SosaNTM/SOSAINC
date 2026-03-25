import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  type Investment,
  type InvestmentType,
  INVESTMENT_TYPE_LABELS,
  INVESTMENT_TYPE_EMOJIS,
} from "@/lib/investmentStore";

const TYPE_OPTIONS: InvestmentType[] = ["stock", "etf", "crypto", "bonds", "real_estate", "other"];

const COLOR_PRESETS = [
  "#4A9EFF", "#2ECC71", "#f59e0b", "#ef4444", "#a78bfa",
  "#C9A84C", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
];

const EMPTY: Omit<Investment, "id"> = {
  name: "", ticker: "", type: "stock",
  units: 0, avgBuyPrice: 0, currentPrice: 0,
  color: "#4A9EFF", emoji: "📈",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Investment, "id">) => void;
  initial?: Investment;
}

export function InvestmentModal({ open, onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<Omit<Investment, "id">>(EMPTY);

  useEffect(() => {
    if (open) setForm(initial ? { name: initial.name, ticker: initial.ticker, type: initial.type, units: initial.units, avgBuyPrice: initial.avgBuyPrice, currentPrice: initial.currentPrice, color: initial.color, emoji: initial.emoji } : EMPTY);
  }, [open, initial]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(type: InvestmentType) {
    set("type", type);
    set("emoji", INVESTMENT_TYPE_EMOJIS[type]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
    onClose();
  }

  const currentValue = form.units * form.currentPrice;
  const pnl = (form.currentPrice - form.avgBuyPrice) * form.units;
  const roi = form.avgBuyPrice > 0 ? ((form.currentPrice - form.avgBuyPrice) / form.avgBuyPrice) * 100 : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "100%", maxWidth: 480, background: "var(--glass-bg)", backdropFilter: "blur(24px)", border: "1px solid var(--glass-border)", borderRadius: 20, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span style={{ fontSize: 22 }}>{form.emoji}</span>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  {initial ? "Edit Investment" : "New Investment"}
                </h2>
              </div>
              <button type="button" onClick={onClose}
                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Name + Ticker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Name *</label>
                  <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Apple Inc." required autoComplete="off"
                    style={{ marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ticker</label>
                  <input value={form.ticker} onChange={(e) => set("ticker", e.target.value.toUpperCase())} placeholder="AAPL" autoComplete="off"
                    style={{ marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                </div>
              </div>

              {/* Type */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TYPE_OPTIONS.map((t) => (
                    <button key={t} type="button" onClick={() => handleTypeChange(t)}
                      style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", transition: "all 0.15s", borderColor: form.type === t ? form.color : "var(--glass-border)", background: form.type === t ? `${form.color}18` : "transparent", color: form.type === t ? form.color : "var(--text-tertiary)" }}>
                      {INVESTMENT_TYPE_EMOJIS[t]} {INVESTMENT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Units + Buy Price + Current Price */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Units / Shares", key: "units" as const, placeholder: "10" },
                  { label: "Avg Buy Price (€)", key: "avgBuyPrice" as const, placeholder: "150.00" },
                  { label: "Current Price (€)", key: "currentPrice" as const, placeholder: "189.00" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                    <input type="number" min="0" step="any" value={form[key] || ""} onChange={(e) => set(key, parseFloat(e.target.value) || 0)} placeholder={placeholder} autoComplete="off"
                      style={{ marginTop: 6, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                  </div>
                ))}
              </div>

              {/* Live preview */}
              {form.units > 0 && form.currentPrice > 0 && (
                <div style={{ display: "flex", gap: 12, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>Current Value</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>€{currentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>P&L</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: pnl >= 0 ? "#2ECC71" : "#FF5A5A" }}>
                      {pnl >= 0 ? "+" : ""}€{Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>ROI</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: roi >= 0 ? "#2ECC71" : "#FF5A5A" }}>
                      {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {/* Color */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Color</label>
                <div className="flex gap-2 mt-2">
                  {COLOR_PRESETS.map((c) => (
                    <button key={c} type="button" onClick={() => set("color", c)}
                      style={{ width: 24, height: 24, borderRadius: 6, background: c, border: form.color === c ? `2px solid white` : "2px solid transparent", cursor: "pointer", transition: "transform 0.15s", transform: form.color === c ? "scale(1.2)" : "scale(1)" }} />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={onClose}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-tertiary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ flex: 2, padding: "10px", borderRadius: 10, border: "none", background: form.color, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {initial ? "Save Changes" : "Add Investment"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
