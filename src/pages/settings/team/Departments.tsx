import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Building2, Users, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useDepartments } from "../../../hooks/settings";
import type { Department } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";
const COLOR_PRESETS = ["#4ADE80","#C6A961","#60A5FA","#A78BFA","#F59E0B","#EF4444","#EC4899","#14B8A6","#94A3B8","#FB923C","#84CC16","#F43F5E"];

const emptyForm = () => ({ name: "", color: "#60A5FA", description: "" });

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 };

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6, border: "none",
    background: "transparent", color, cursor: "pointer", padding: 0, transition: "background 0.15s",
  };
}

export default function Departments() {
  const { data: departments, loading, create, update, remove } = useDepartments();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(d: Department) {
    setEditingId(d.id);
    setForm({ name: d.name, color: d.color, description: d.description ?? "" });
    setModalOpen(true);
  }

  async function saveModal() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId !== null) {
        const { error } = await update(editingId, { name: form.name, color: form.color, description: form.description || null });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Reparto aggiornato" });
      } else {
        const { error } = await create({ name: form.name, color: form.color, description: form.description || null, head_user_id: null, member_count: 0, sort_order: (departments?.length ?? 0) + 1,  });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Reparto creato" });
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteDept(id: string) {
    const { error } = await remove(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    setDeleteConfirm(null);
    toast({ title: "Reparto eliminato" });
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
            Reparti
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Gestisci i dipartimenti e la struttura organizzativa del team
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuovo Reparto
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
        <AnimatePresence initial={false}>
          {(departments ?? []).map(dept => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              style={{
                background: BG_CARD,
                border: `0.5px solid ${BORDER}`,
                borderLeft: `4px solid ${dept.color}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Top */}
              <div style={{ padding: "14px 16px 10px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 2 }}>{dept.name}</div>
                  </div>
                  <Building2 size={16} style={{ color: dept.color, flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
                </div>
              </div>

              {/* Middle */}
              <div style={{ padding: "0 16px 12px" }}>
                <div style={{
                  fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.5,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                } as React.CSSProperties}>
                  {dept.description || <span style={{ color: TEXT_MUTED, fontStyle: "italic" }}>Nessuna descrizione</span>}
                </div>
              </div>

              {/* Bottom */}
              <div style={{
                padding: "10px 16px", borderTop: `0.5px solid ${BORDER}`,
                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              }}>
                <span style={{
                  display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: TEXT_SECONDARY,
                  background: "#f3f4f6", borderRadius: 5, padding: "2px 7px",
                }}>
                  <Users size={10} /> {dept.member_count} membri
                </span>
                <div style={{ flex: 1 }} />
                <button type="button" onClick={() => openEdit(dept)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                {deleteConfirm === dept.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: TEXT_SECONDARY }}>Elimina?</span>
                    <button type="button" onClick={() => deleteDept(dept.id)} style={{ ...iconBtnStyle("#EF4444"), width: 24, height: 24 }}><Check size={12} /></button>
                    <button type="button" onClick={() => setDeleteConfirm(null)} style={{ ...iconBtnStyle(TEXT_MUTED), width: 24, height: 24 }}><X size={12} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setDeleteConfirm(dept.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {(departments ?? []).length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: TEXT_MUTED }}>
          <Building2 size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>Nessun reparto. Creane uno nuovo.</p>
        </div>
      )}

      {/* Modal */}
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
                {editingId ? "Modifica Reparto" : "Nuovo Reparto"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome reparto" />
                </label>
                <div style={labelStyle}>
                  <span style={labelText}>Colore</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                    {COLOR_PRESETS.map(c => (
                      <button type="button" key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: form.color === c ? "2px solid white" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      style={{ width: 36, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
                    <input className="glass-input" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      placeholder="#RRGGBB" style={{ width: 100 }} />
                  </div>
                </div>
                <label style={labelStyle}>
                  <span style={labelText}>Descrizione</span>
                  <textarea className="glass-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descrizione del reparto" rows={3} style={{ resize: "vertical" }} />
                </label>
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
