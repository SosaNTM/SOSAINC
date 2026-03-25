import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Pencil, Trash2, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { useBusinessCOGS, useBusinessSummary } from "@/portals/finance/hooks/useBusinessFinance";
import { COGS_CATEGORIES } from "@/portals/finance/types/businessFinance";
import type { BusinessCOGS } from "@/portals/finance/types/businessFinance";
import { toast } from "sonner";

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#c9a96e"];

function formatEUR(v: number): string {
  return `€${v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function categoryLabel(cat: string): string {
  const found = COGS_CATEGORIES.find((c) => c.value === cat);
  return found ? found.label : cat;
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--glass-bg-elevated, rgba(30,30,40,0.92))",
        border: "0.5px solid var(--glass-border)",
        borderRadius: 10,
        padding: "8px 14px",
        backdropFilter: "blur(12px)",
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{payload[0].name}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: payload[0].payload.fill }}>
        {formatEUR(payload[0].value)}
      </p>
    </div>
  );
}

interface ModalData {
  date: string;
  category: string;
  description: string;
  amount: string;
  vendor: string;
}

const EMPTY_FORM: ModalData = { date: "", category: "raw_materials", description: "", amount: "", vendor: "" };

export default function BusinessCOGSPage() {
  const { data: cogsData, loading, create, update, remove } = useBusinessCOGS();
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const summary = useBusinessSummary(currentPeriod, "monthly");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModalData>({ ...EMPTY_FORM });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeItems = useMemo(
    () => cogsData.filter((c) => !c.is_deleted),
    [cogsData],
  );

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activeItems) {
      map.set(item.category, (map.get(item.category) || 0) + item.amount);
    }
    return Array.from(map.entries()).map(([cat, amount]) => ({
      name: categoryLabel(cat),
      value: amount,
    }));
  }, [activeItems]);

  const cogsRatio = summary.netRevenue > 0
    ? ((summary.totalCogs / summary.netRevenue) * 100).toFixed(1)
    : "0.0";

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(item: BusinessCOGS) {
    setEditingId(item.id);
    setForm({
      date: item.date,
      category: item.category,
      description: item.description || "",
      amount: String(item.amount),
      vendor: item.vendor || "",
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
      description: form.description || null,
      amount: amt,
      vendor: form.vendor || null,
    };
    if (editingId) {
      await update(editingId, payload);
      toast.success("Costo aggiornato.");
    } else {
      await create(payload);
      toast.success("Costo aggiunto.");
    }
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    await remove(id);
    toast.success("Costo eliminato.");
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
              borderRadius: 10,
              background: "rgba(239,68,68,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package style={{ width: 16, height: 16, color: "#ef4444" }} />
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            Costo del Venduto (COGS)
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

      {/* COGS Ratio + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ratio card */}
        <motion.div
          className="glass-card-static"
          style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-quaternary)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            COGS / Ricavi Netti
          </p>
          <p
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#ef4444",
              fontFamily: "var(--font-display)",
              letterSpacing: "-1px",
            }}
          >
            {cogsRatio}%
          </p>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
            Totale COGS: {formatEUR(summary.totalCogs)}
          </p>
        </motion.div>

        {/* Donut */}
        <motion.div
          className="glass-card-static lg:col-span-2"
          style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Ripartizione per Categoria
          </h3>
          {pieData.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "24px 0", textAlign: "center" }}>
              Nessun dato COGS disponibile.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {pieData.map((_entry, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Table */}
      <motion.div
        className="glass-card-static"
        style={{ padding: "16px", borderRadius: "var(--radius-lg)", overflowX: "auto" }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Data", "Categoria", "Descrizione", "Fornitore", "Importo (€)", "Azioni"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h === "Importo (€)" || h === "Azioni" ? "right" : "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-quaternary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--divider)",
                  }}
                >
                  {h}
                </th>
              ))}
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
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {item.date}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                    {categoryLabel(item.category)}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {item.description || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {item.vendor || "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#ef4444",
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatEUR(item.amount)}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        style={{
                          background: "var(--glass-bg)",
                          border: "0.5px solid var(--glass-border)",
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
                            background: "var(--glass-bg)",
                            border: "0.5px solid var(--glass-border)",
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
            Nessun costo del venduto registrato.
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
                maxWidth: 460,
                padding: "24px",
                borderRadius: "var(--radius-lg)",
                margin: "0 16px",
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  {editingId ? "Modifica Costo" : "Nuovo Costo"}
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
                    {COGS_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
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
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Importo (€) *
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
