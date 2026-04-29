// TODO: removed from navigation during audit â€” routes disabled in App.tsx. Re-enable when business finance module is ready.
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plus, Pencil, Trash2, X } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { useBusinessOPEX, useBusinessSummary } from "@/portals/finance/hooks/useBusinessFinance";
import { OPEX_CATEGORIES } from "@/portals/finance/types/businessFinance";
import type { BusinessOPEX } from "@/portals/finance/types/businessFinance";
import { toast } from "sonner";

const AREA_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#e8ff00", "#14b8a6", "#f97316", "#6366f1"];

const FREQ_LABELS: Record<string, string> = {
  monthly: "Mensile",
  quarterly: "Trimestrale",
  annual: "Annuale",
  one_time: "Una tantum",
};

function formatEUR(v: number): string {
  return `â‚¬${v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function categoryLabel(cat: string): string {
  const found = OPEX_CATEGORIES.find((c) => c.value === cat);
  return found ? found.label : cat;
}

interface ModalData {
  date: string;
  category: string;
  subcategory: string;
  description: string;
  amount: string;
  vendor: string;
  is_recurring: boolean;
  frequency: string;
}

const EMPTY_FORM: ModalData = {
  date: "",
  category: "marketing",
  subcategory: "",
  description: "",
  amount: "",
  vendor: "",
  is_recurring: false,
  frequency: "monthly",
};

// NOTE: Custom tooltip â€” too specialized for GlassTooltip (colored category boxes, EUR formatting per entry)
function StackedAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--glass-bg-elevated, rgba(30,30,40,0.92))",
        border: "1px solid var(--sosa-border)",
        borderRadius: 0,
        padding: "10px 14px",
        backdropFilter: "blur(12px)",
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2" style={{ marginTop: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{entry.name}:</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            {formatEUR(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BusinessOPEXPage() {
  const { data: opexData, loading, create, update, remove } = useBusinessOPEX();
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const summary = useBusinessSummary(currentPeriod, "monthly");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModalData>({ ...EMPTY_FORM });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeItems = useMemo(
    () => opexData.filter((o) => !o.is_deleted),
    [opexData],
  );

  // Monthly stacked area chart data (last 12 months)
  const areaData = useMemo(() => {
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const categories = [...new Set(activeItems.map((o) => o.category))];
    return months.map((m) => {
      const row: Record<string, any> = { month: m };
      for (const cat of categories) {
        row[cat] = activeItems
          .filter((o) => o.date.startsWith(m) && o.category === cat)
          .reduce((s, o) => s + o.amount, 0);
      }
      return row;
    });
  }, [activeItems]);

  const areaCategories = useMemo(
    () => [...new Set(activeItems.map((o) => o.category))],
    [activeItems],
  );

  // Burn rate (avg monthly OPEX last 12 months)
  const burnRate = useMemo(() => {
    const months12 = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months12.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const total = activeItems
      .filter((o) => months12.has(o.date.slice(0, 7)))
      .reduce((s, o) => s + o.amount, 0);
    return total / 12;
  }, [activeItems]);

  // Fixed vs Variable
  const fixedTotal = useMemo(
    () => activeItems.filter((o) => o.is_recurring).reduce((s, o) => s + o.amount, 0),
    [activeItems],
  );
  const variableTotal = useMemo(
    () => activeItems.filter((o) => !o.is_recurring).reduce((s, o) => s + o.amount, 0),
    [activeItems],
  );

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(item: BusinessOPEX) {
    setEditingId(item.id);
    setForm({
      date: item.date,
      category: item.category,
      subcategory: item.subcategory || "",
      description: item.description || "",
      amount: String(item.amount),
      vendor: item.vendor || "",
      is_recurring: item.is_recurring,
      frequency: item.frequency || "monthly",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const amt = parseFloat(form.amount);
    if (!form.date || isNaN(amt) || amt <= 0) {
      toast.error("Compila tutti i campi obbligatori.");
      return;
    }
    const payload = {
      date: form.date,
      category: form.category,
      subcategory: form.subcategory || null,
      description: form.description || null,
      amount: amt,
      vendor: form.vendor || null,
      is_recurring: form.is_recurring,
      frequency: form.is_recurring ? (form.frequency as BusinessOPEX["frequency"]) : null,
    };
    if (editingId) {
      await update(editingId, payload);
      toast.success("Spesa aggiornata.");
    } else {
      await create(payload);
      toast.success("Spesa aggiunta.");
    }
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    await remove(id);
    toast.success("Spesa eliminata.");
    setDeleteId(null);
  }

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 0,
              background: "rgba(245,158,11,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 style={{ width: 16, height: 16, color: "#f59e0b" }} />
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            Spese Operative (OPEX)
          </h2>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="glass-btn-primary flex items-center gap-1.5"
          style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8 }}
        >
          <Plus className="w-3.5 h-3.5" /> Aggiungi
        </button>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          className="glass-card-static"
          style={{ padding: "18px 20px", borderRadius: "var(--radius-lg)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Burn Rate Mensile
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}>
            {formatEUR(burnRate)}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Media ultimi 12 mesi</p>
        </motion.div>

        <motion.div
          className="glass-card-static"
          style={{ padding: "18px 20px", borderRadius: "var(--radius-lg)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Costi Fissi
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#3b82f6", fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}>
            {formatEUR(fixedTotal)}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Ricorrenti</p>
        </motion.div>

        <motion.div
          className="glass-card-static"
          style={{ padding: "18px 20px", borderRadius: "var(--radius-lg)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Costi Variabili
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#8b5cf6", fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}>
            {formatEUR(variableTotal)}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Una tantum</p>
        </motion.div>
      </div>

      {/* Stacked area chart */}
      {areaCategories.length > 0 && (
        <motion.div
          className="glass-card-static"
          style={{ padding: "20px 16px", borderRadius: "var(--radius-lg)" }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, paddingLeft: 4 }}>
            OPEX Mensili per Categoria
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={areaData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--divider)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `â‚¬${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<StackedAreaTooltip />} />
              {areaCategories.map((cat, idx) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={categoryLabel(cat)}
                  stackId="1"
                  stroke={AREA_COLORS[idx % AREA_COLORS.length]}
                  fill={AREA_COLORS[idx % AREA_COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Table */}
      <motion.div
        className="glass-card-static"
        style={{ padding: "16px", borderRadius: "var(--radius-lg)", overflowX: "auto" }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Data", "Categoria", "Sottocategoria", "Descrizione", "Fornitore", "Importo", "Ricorrente", "Frequenza", "Azioni"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Importo" || h === "Azioni" ? "right" : "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-quaternary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "8px 10px",
                      borderBottom: "1px solid var(--divider)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {activeItems.map((item) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ borderBottom: "1px solid var(--divider)" }}
                >
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                    {item.date}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                    {categoryLabel(item.category)}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {item.subcategory || "â€”"}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {item.description || "â€”"}
                  </td>
                  <td style={{ padding: "10px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {item.vendor || "â€”"}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#f59e0b",
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatEUR(item.amount)}
                  </td>
                  <td style={{ padding: "10px" }}>
                    {item.is_recurring ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#22c55e",
                          background: "rgba(34,197,94,0.12)",
                          border: "0.5px solid rgba(34,197,94,0.25)",
                          borderRadius: 6,
                          padding: "2px 8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Si
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>â€”</span>
                    )}
                  </td>
                  <td style={{ padding: "10px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {item.frequency ? FREQ_LABELS[item.frequency] || item.frequency : "â€”"}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        style={{
                          background: "var(--sosa-bg-2)",
                          border: "1px solid var(--sosa-border)",
                          borderRadius: 6,
                          padding: "5px 7px",
                          cursor: "pointer",
                        }}
                      >
                        <Pencil style={{ width: 13, height: 13, color: "var(--text-secondary)" }} />
                      </button>
                      {deleteId === item.id ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          style={{
                            background: "rgba(239,68,68,0.15)",
                            border: "0.5px solid rgba(239,68,68,0.3)",
                            borderRadius: 6,
                            padding: "5px 10px",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#ef4444",
                          }}
                        >
                          Conferma
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteId(item.id)}
                          style={{
                            background: "var(--sosa-bg-2)",
                            border: "1px solid var(--sosa-border)",
                            borderRadius: 6,
                            padding: "5px 7px",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 style={{ width: 13, height: 13, color: "var(--text-secondary)" }} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {activeItems.length === 0 && (
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-tertiary)", padding: "24px 0" }}>
            Nessuna spesa operativa registrata.
          </p>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center glass-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="glass-card-static"
              style={{
                width: "100%",
                maxWidth: 480,
                padding: "24px",
                borderRadius: "var(--radius-lg)",
                margin: "0 16px",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  {editingId ? "Modifica Spesa" : "Nuova Spesa"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                >
                  <X style={{ width: 18, height: 18, color: "var(--text-tertiary)" }} />
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Data *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="glass-input"
                    style={{ width: "100%", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-md)" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                      Categoria *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="glass-input"
                      style={{ width: "100%", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-md)" }}
                    >
                      {OPEX_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                      Sottocategoria
                    </label>
                    <input
                      type="text"
                      value={form.subcategory}
                      onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                      placeholder="Opzionale"
                      className="glass-input"
                      style={{ width: "100%", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-md)" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descrizione opzionale"
                    className="glass-input"
                    style={{ width: "100%", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-md)" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                      Importo (â‚¬) *
                    </label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="glass-input"
                      style={{ width: "100%", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-md)" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                      Fornitore
                    </label>
                    <input
                      type="text"
                      value={form.vendor}
                      onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                      placeholder="Nome fornitore"
                      className="glass-input"
                      style={{ width: "100%", fontSize: 13, padding: "8px 12px", borderRadius: "var(--radius-md)" }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_recurring}
                      onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                      style={{ accentColor: "var(--accent-primary)" }}
                    />
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                      Ricorrente
                    </span>
                  </label>
                  {form.is_recurring && (
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                      className="glass-input"
                      style={{ fontSize: 13, padding: "6px 10px", borderRadius: "var(--radius-md)", width: 140 }}
                    >
                      <option value="monthly">Mensile</option>
                      <option value="quarterly">Trimestrale</option>
                      <option value="annual">Annuale</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="glass-btn"
                  style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8 }}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="glass-btn-primary"
                  style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8 }}
                >
                  {editingId ? "Salva" : "Aggiungi"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
