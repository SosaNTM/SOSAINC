import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Check, X, Copy, Clock, ListChecks, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTaskTemplates } from "../../../hooks/settings";
import type { TaskTemplate } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const PRIORITY_OPTIONS = ["Urgente","Alta","Media","Bassa","Nessuna"] as const;
const PRIORITY_COLORS: Record<string, string> = {
  Urgente: "#EF4444", Alta: "#F97316", Media: "#EAB308", Bassa: "#4ADE80", Nessuna: "#6B7280",
};
const ALL_LABELS = ["Bug","Feature","Improvement","Design","Backend","Frontend","DevOps"];
const LABEL_COLORS: Record<string, string> = {
  Bug: "#EF4444", Feature: "#60A5FA", Improvement: "#4ADE80", Design: "#EC4899",
  Backend: "#A78BFA", Frontend: "#F59E0B", DevOps: "#14B8A6",
};

interface ChecklistItem { id: string; text: string; done: boolean; }

type TemplateForm = {
  name: string;
  description: string;
  priority_id: string | null;
  tags: string[];
  checklist: ChecklistItem[];
  estimated_h: number;
};

const emptyForm = (): TemplateForm => ({
  name: "", description: "", priority_id: null,
  tags: [], checklist: [], estimated_h: 2,
});

let _tmpCheckId = 0;
function newCheckId() { return `tmp-${++_tmpCheckId}`; }

export default function TaskTemplates() {
  const { data: templates, loading, create, update, remove } = useTaskTemplates();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(t: TaskTemplate) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description ?? "",
      priority_id: t.priority_id,
      tags: [...t.tags],
      checklist: t.checklist.map(c => ({ ...c })),
      estimated_h: t.estimated_h ?? 2,
    });
    setModalOpen(true);
  }

  async function duplicate(t: TaskTemplate) {
    const { error } = await create({
      name: `${t.name} (Copia)`,
      description: t.description,
      priority_id: t.priority_id,
      tags: [...t.tags],
      checklist: t.checklist.map(c => ({ ...c, id: newCheckId() })),
      estimated_h: t.estimated_h,
    });
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    toast({ title: "Template duplicato" });
  }

  async function saveModal() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        priority_id: form.priority_id,
        tags: form.tags,
        checklist: form.checklist,
        estimated_h: form.estimated_h || null,
      };
      if (editingId !== null) {
        const { error } = await update(editingId, payload);
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Template aggiornato" });
      } else {
        const { error } = await create({ ...payload });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Template creato" });
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
    toast({ title: "Template eliminato" });
  }

  function addChecklistItem() {
    setForm(f => ({
      ...f,
      checklist: [...f.checklist, { id: newCheckId(), text: "", done: false }],
    }));
  }

  function updateChecklistItem(id: string, text: string) {
    setForm(f => ({ ...f, checklist: f.checklist.map(c => c.id === id ? { ...c, text } : c) }));
  }

  function removeChecklistItem(id: string) {
    setForm(f => ({ ...f, checklist: f.checklist.filter(c => c.id !== id) }));
  }

  function toggleTag(label: string) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(label)
        ? f.tags.filter(l => l !== label)
        : [...f.tags, label],
    }));
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
            Template Task
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Modelli riutilizzabili per creare task in modo rapido
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuovo Template
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
        <AnimatePresence initial={false}>
          {(templates ?? []).map(t => {
            const pColor = PRIORITY_COLORS[t.priority_id ?? ""] || "#94A3B8";
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>{t.name}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {deleteConfirm === t.id ? (
                      <>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, alignSelf: "center", marginRight: 2 }}>Elimina?</span>
                        <button type="button" onClick={() => doDelete(t.id)} style={iconBtnStyle("#EF4444")}><Check size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} style={iconBtnStyle(TEXT_MUTED)}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => openEdit(t)} style={iconBtnStyle(GOLD)} title="Modifica"><Pencil size={13} /></button>
                        <button type="button" onClick={() => duplicate(t)} style={iconBtnStyle("#60A5FA")} title="Duplica"><Copy size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(t.id)} style={iconBtnStyle("#EF4444")} title="Elimina"><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </div>
                {t.description && (
                  <p style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 10, lineHeight: 1.5 }}>{t.description}</p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {t.priority_id && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: pColor,
                      background: `${pColor}1a`, borderRadius: 4, padding: "2px 8px",
                      border: `0.5px solid ${pColor}40`,
                    }}>{t.priority_id}</span>
                  )}
                  {t.tags.map(l => (
                    <span key={l} style={{
                      fontSize: 10, fontWeight: 600,
                      color: LABEL_COLORS[l] || "#94A3B8",
                      background: `${LABEL_COLORS[l] || "#94A3B8"}1a`,
                      borderRadius: 4, padding: "2px 8px",
                      border: `0.5px solid ${LABEL_COLORS[l] || "#94A3B8"}40`,
                    }}>{l}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TEXT_MUTED }}>
                    <ListChecks size={12} />
                    <span>{t.checklist.length} voci checklist</span>
                  </div>
                  {t.estimated_h != null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TEXT_MUTED }}>
                      <Clock size={12} />
                      <span>~{t.estimated_h} ore</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12,
                padding: "24px 28px", maxWidth: 680, width: "90vw",
                maxHeight: "90vh", overflowY: "auto",
              }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {editingId ? "Modifica Template" : "Nuovo Template"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome template" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Descrizione</span>
                  <textarea className="glass-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descrizione opzionale" rows={2} style={{ resize: "vertical" }} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={labelStyle}>
                    <span style={labelText}>Priorità default</span>
                    <select className="glass-input" value={form.priority_id ?? ""} onChange={e => setForm(f => ({ ...f, priority_id: e.target.value || null }))}>
                      <option value="">Nessuna</option>
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>
                    <span style={labelText}>Ore stimate</span>
                    <input type="number" className="glass-input" value={form.estimated_h}
                      onChange={e => setForm(f => ({ ...f, estimated_h: Number(e.target.value) }))} min={0} step={0.5} />
                  </label>
                </div>

                {/* Tag multi-select */}
                <div style={labelStyle}>
                  <span style={labelText}>Tag default</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ALL_LABELS.map(l => {
                      const active = form.tags.includes(l);
                      const c = LABEL_COLORS[l] || "#94A3B8";
                      return (
                        <button type="button" key={l} onClick={() => toggleTag(l)} style={{
                          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                          border: `0.5px solid ${active ? c : "#e5e7eb"}`,
                          background: active ? `${c}22` : "transparent",
                          color: active ? c : TEXT_MUTED,
                          transition: "all 0.15s",
                        }}>{l}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Checklist items */}
                <div style={labelStyle}>
                  <span style={labelText}>Checklist</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {form.checklist.map(item => (
                      <div key={item.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          className="glass-input"
                          value={item.text}
                          onChange={e => updateChecklistItem(item.id, e.target.value)}
                          placeholder="Voce checklist…"
                          style={{ flex: 1 }}
                        />
                        <button type="button" onClick={() => removeChecklistItem(item.id)} style={iconBtnStyle("#EF4444")}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={addChecklistItem}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        fontSize: 12, color: GOLD, background: "transparent", border: `0.5px dashed rgba(198,169,97,0.3)`,
                        borderRadius: 6, padding: "6px 12px", cursor: "pointer", width: "fit-content",
                      }}
                    >
                      <Plus size={12} /> Aggiungi voce
                    </button>
                  </div>
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
