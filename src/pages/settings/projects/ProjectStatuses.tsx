import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Circle, Play, Eye, CheckCircle, Archive, Pause, XCircle, Clock, Star, Zap,
  Pencil, Trash2, Check, X, ChevronUp, ChevronDown, Plus, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useProjectStatuses } from "../../../hooks/settings";
import type { ProjectStatus } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const COLOR_PRESETS = ["#4ADE80","#C6A961","#60A5FA","#A78BFA","#F59E0B","#EF4444","#EC4899","#14B8A6","#94A3B8","#FB923C","#84CC16","#F43F5E"];

const ICON_OPTIONS = ["Circle","Play","Eye","CheckCircle","Archive","Pause","XCircle","Clock","Star","Zap"] as const;
type IconName = typeof ICON_OPTIONS[number];

const ICON_MAP: Record<IconName, React.ElementType> = {
  Circle, Play, Eye, CheckCircle, Archive, Pause, XCircle, Clock, Star, Zap,
};

type FormState = { name: string; color: string; icon: string; is_final: boolean };
const emptyForm = (): FormState => ({ name: "", color: "#60A5FA", icon: "Circle", is_final: false });

export default function ProjectStatuses() {
  const { data: statuses, loading, create, update, remove } = useProjectStatuses();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...(statuses ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(s: ProjectStatus) {
    setEditingId(s.id);
    setForm({ name: s.name, color: s.color, icon: s.icon, is_final: s.is_final });
    setModalOpen(true);
  }

  async function saveModal() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId !== null) {
        const { error } = await update(editingId, { name: form.name, color: form.color, icon: form.icon, is_final: form.is_final });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Stato aggiornato" });
      } else {
        const { error } = await create({ name: form.name, color: form.color, icon: form.icon, is_final: form.is_final, is_default: false, sort_order: (statuses?.length ?? 0) + 1,  });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Stato creato" });
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(id: string) {
    const { error } = await remove(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    setDeleteConfirm(null);
    toast({ title: "Stato eliminato" });
  }

  async function moveItem(id: string, dir: -1 | 1) {
    const s = [...(statuses ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const idx = s.findIndex(c => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= s.length) return;
    await Promise.all([
      update(s[idx].id, { sort_order: s[target].sort_order }),
      update(s[target].id, { sort_order: s[idx].sort_order }),
    ]);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
            Stati Progetto
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Configura gli stati del ciclo di vita dei progetti
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuovo Stato
        </button>
      </div>

      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: TEXT_MUTED }}>
            <Circle size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>Nessuno stato. Creane uno.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sorted.map((st, idx) => {
              const Icon = (ICON_MAP as Record<string, React.ElementType>)[st.icon] || Circle;
              return (
                <motion.div
                  key={st.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: idx < sorted.length - 1 ? `0.5px solid ${BORDER}` : "none",
                  }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                  <Icon size={15} style={{ color: st.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: TEXT_MUTED, flexShrink: 0 }}>{st.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY, flex: 1, minWidth: 0 }}>{st.name}</span>
                  {st.is_final && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: GOLD,
                      background: "rgba(198,169,97,0.12)", borderRadius: 4, padding: "2px 7px",
                      border: `0.5px solid rgba(198,169,97,0.25)`, flexShrink: 0,
                    }}>FINALE</span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {deleteConfirm === st.id ? (
                      <>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Elimina?</span>
                        <button type="button" onClick={() => doDelete(st.id)} style={iconBtnStyle("#EF4444")}><Check size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} style={iconBtnStyle(TEXT_MUTED)}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => moveItem(st.id, -1)} disabled={idx === 0} style={iconBtnStyle(TEXT_MUTED, idx === 0)}><ChevronUp size={13} /></button>
                        <button type="button" onClick={() => moveItem(st.id, 1)} disabled={idx === sorted.length - 1} style={iconBtnStyle(TEXT_MUTED, idx === sorted.length - 1)}><ChevronDown size={13} /></button>
                        <button type="button" onClick={() => openEdit(st)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(st.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "90vw" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {editingId ? "Modifica Stato" : "Nuovo Stato"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome stato" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Icona</span>
                  <select className="glass-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>
                    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </label>
                <div style={labelStyle}>
                  <span style={labelText}>Colore</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {COLOR_PRESETS.map(c => (
                      <button type="button" key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{ width: 22, height: 22, borderRadius: 4, background: c, border: form.color === c ? "2px solid white" : "2px solid transparent", cursor: "pointer" }} />
                    ))}
                  </div>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: 36, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 13, color: TEXT_PRIMARY }}>È uno stato finale?</span>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>Gli stati finali indicano completamento o chiusura</div>
                  </div>
                  <ToggleSwitch checked={form.is_final} onChange={v => setForm(f => ({ ...f, is_final: v }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setModalOpen(false)}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={saveModal} disabled={!form.name.trim() || saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
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

function iconBtnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6, border: "none",
    background: "transparent", color, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.3 : 1, transition: "background 0.15s",
  };
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: "#374151", fontWeight: 500 };

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: checked ? GOLD : "#d1d5db", position: "relative", transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: "50%", background: "white",
        transition: "left 0.2s", display: "block",
      }} />
    </button>
  );
}
