import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Check, X, Plus, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRecurrenceRules } from "../../../hooks/settings";
import type { RecurrenceRule } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

type Direction = 'entrata' | 'uscita';
type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';

const FREQ_LABELS: Record<Frequency, string> = {
  daily: "Giornaliera",
  weekly: "Settimanale",
  biweekly: "Bisettimanale",
  monthly: "Mensile",
  quarterly: "Trimestrale",
  annual: "Annuale",
};

type FormState = {
  name: string;
  direction: Direction;
  frequency: Frequency;
  next_run_at: string;
  amount: number;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "", direction: "uscita", frequency: "monthly", next_run_at: "", amount: 0, is_active: true,
});

export default function RecurrenceRules() {
  const { data: rules, loading, create, update, remove } = useRecurrenceRules();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() { setEditingId(null); setForm(emptyForm()); setModalOpen(true); }

  function openEdit(r: RecurrenceRule) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      direction: r.direction,
      frequency: r.frequency,
      next_run_at: r.next_run_at ?? "",
      amount: r.amount ?? 0,
      is_active: r.is_active,
    });
    setModalOpen(true);
  }

  async function saveModal() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editingId) {
      const { error } = await update(editingId, {
        name: form.name,
        direction: form.direction,
        frequency: form.frequency,
        next_run_at: form.next_run_at || null,
        amount: form.amount,
        is_active: form.is_active,
      });
      if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
      else { toast({ title: "Regola aggiornata" }); }
    } else {
      const { error } = await create({
        name: form.name,
        direction: form.direction,
        frequency: form.frequency,
        next_run_at: form.next_run_at || null,
        amount: form.amount,
        category_id: null,
        is_active: form.is_active,
      });
      if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
      else { toast({ title: "Regola creata" }); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function deleteItem(id: string) {
    const { error } = await remove(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
    else { toast({ title: "Regola eliminata" }); }
    setDeleteConfirm(null);
  }

  async function toggleActive(r: RecurrenceRule) {
    const { error } = await update(r.id, { is_active: !r.is_active });
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
            Regole Ricorrenze
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Automatizza entrate e uscite periodiche
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuova Regola
        </button>
      </div>

      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10, color: TEXT_MUTED }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Caricamento...</span>
          </div>
        ) : rules.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: TEXT_MUTED }}>
            <RefreshCw size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>Nessuna regola. Creane una nuova.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {rules.map((r, idx) => {
              const typeColor = r.direction === "entrata" ? "#4ADE80" : "#EF4444";
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: idx < rules.length - 1 ? `0.5px solid ${BORDER}` : "none",
                    opacity: r.is_active ? 1 : 0.45,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{r.name}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 99,
                        background: `${typeColor}18`, color: typeColor, fontWeight: 600, textTransform: "capitalize",
                      }}>
                        {r.direction}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                      {FREQ_LABELS[r.frequency]}
                      {r.next_run_at && ` · Prossima: ${r.next_run_at}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {r.amount != null && r.amount > 0 && (
                      <div style={{ fontSize: 14, fontWeight: 600, color: r.direction === "entrata" ? "#4ADE80" : TEXT_PRIMARY }}>
                        {r.direction === "entrata" ? "+" : "-"}€{r.amount.toLocaleString("en-US")}
                      </div>
                    )}
                  </div>
                  <ToggleSwitch checked={r.is_active} onChange={() => toggleActive(r)} />
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {deleteConfirm === r.id ? (
                      <>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Sei sicuro?</span>
                        <button type="button" onClick={() => deleteItem(r.id)} style={iconBtnStyle("#4ADE80")}><Check size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} style={iconBtnStyle("#EF4444")}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => openEdit(r)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(r.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,11,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {editingId ? "Modifica Regola" : "Nuova Regola Ricorrente"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Es. Affitto Ufficio" />
                </label>
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ ...labelStyle, flex: 1 }}>
                    <span style={labelText}>Direzione</span>
                    <select className="glass-input" value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as Direction }))}>
                      <option value="entrata">Entrata</option>
                      <option value="uscita">Uscita</option>
                    </select>
                  </label>
                  <label style={{ ...labelStyle, flex: 1 }}>
                    <span style={labelText}>Importo</span>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED, fontSize: 13 }}>€</span>
                      <input className="glass-input" type="number" min={0} value={form.amount || ""}
                        onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) || 0 }))}
                        placeholder="0" style={{ paddingLeft: 24 }} />
                    </div>
                  </label>
                </div>
                <label style={labelStyle}>
                  <span style={labelText}>Frequenza</span>
                  <select className="glass-input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as Frequency }))}>
                    {(Object.entries(FREQ_LABELS) as [Frequency, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Prossima esecuzione (opzionale)</span>
                  <input className="glass-input" type="date" value={form.next_run_at} onChange={e => setForm(f => ({ ...f, next_run_at: e.target.value }))} />
                </label>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>Attiva</span>
                  <ToggleSwitch checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setModalOpen(false)} disabled={saving}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={saveModal} disabled={!form.name.trim() || saving}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6, border: "none",
    background: "transparent", color, cursor: "pointer",
  };
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 };

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={() => onChange(!checked)}
      style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: checked ? GOLD : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
    >
      <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s", display: "block" }} />
    </button>
  );
}
