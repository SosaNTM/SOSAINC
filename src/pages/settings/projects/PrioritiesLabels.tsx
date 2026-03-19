import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, ChevronUp, ChevronDown, Minus, Circle,
  Play, Eye, CheckCircle, Archive, Pause, XCircle, Clock, Star, Zap,
  Pencil, Trash2, Check, X, Plus, Search, Tag, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTaskPriorities, useTaskLabels } from "../../../hooks/settings";
import type { TaskPriority, TaskLabel } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const COLOR_PRESETS = ["#4ADE80","#C6A961","#60A5FA","#A78BFA","#F59E0B","#EF4444","#EC4899","#14B8A6","#94A3B8","#FB923C","#84CC16","#F43F5E"];

const ICON_OPTIONS = ["Circle","Play","Eye","CheckCircle","Archive","Pause","XCircle","Clock","Star","Zap","AlertCircle","ChevronUp","ChevronDown","Minus"] as const;

const ICON_MAP: Record<string, React.ElementType> = {
  Circle, Play, Eye, CheckCircle, Archive, Pause, XCircle, Clock, Star, Zap,
  AlertCircle, ChevronUp, ChevronDown, Minus,
};

type PriorityForm = { name: string; color: string; icon: string; level: number };
type LabelForm = { name: string; color: string; description: string };

const emptyPriorityForm = (): PriorityForm => ({ name: "", color: "#60A5FA", icon: "Circle", level: 1 });
const emptyLabelForm = (): LabelForm => ({ name: "", color: "#60A5FA", description: "" });

export default function PrioritiesLabels() {
  const [tab, setTab] = useState<"priority" | "label">("priority");

  // Priority hook
  const { data: priorities, loading: pLoading, create: createP, update: updateP, remove: removeP } = useTaskPriorities();
  const [pModalOpen, setPModalOpen] = useState(false);
  const [pEditingId, setPEditingId] = useState<string | null>(null);
  const [pForm, setPForm] = useState<PriorityForm>(emptyPriorityForm());
  const [pDeleteConfirm, setPDeleteConfirm] = useState<string | null>(null);
  const [pSaving, setPSaving] = useState(false);

  // Label hook
  const { data: labels, loading: lLoading, create: createL, update: updateL, remove: removeL } = useTaskLabels();
  const [lModalOpen, setLModalOpen] = useState(false);
  const [lEditingId, setLEditingId] = useState<string | null>(null);
  const [lForm, setLForm] = useState<LabelForm>(emptyLabelForm());
  const [lDeleteConfirm, setLDeleteConfirm] = useState<string | null>(null);
  const [lSaving, setLSaving] = useState(false);
  const [lSearch, setLSearch] = useState("");

  const sortedP = [...(priorities ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const filteredL = (labels ?? []).filter(l => l.name.toLowerCase().includes(lSearch.toLowerCase()));

  function openCreateP() { setPEditingId(null); setPForm(emptyPriorityForm()); setPModalOpen(true); }
  function openEditP(p: TaskPriority) {
    setPEditingId(p.id);
    setPForm({ name: p.name, color: p.color, icon: p.icon, level: p.level });
    setPModalOpen(true);
  }
  async function savePModal() {
    if (!pForm.name.trim()) return;
    setPSaving(true);
    try {
      if (pEditingId !== null) {
        const { error } = await updateP(pEditingId, { name: pForm.name, color: pForm.color, icon: pForm.icon, level: pForm.level });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Priorità aggiornata" });
      } else {
        const { error } = await createP({ name: pForm.name, color: pForm.color, icon: pForm.icon, level: pForm.level, is_default: false, sort_order: (priorities?.length ?? 0) + 1,  });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Priorità creata" });
      }
      setPModalOpen(false);
    } finally {
      setPSaving(false);
    }
  }
  async function deleteP(id: string) {
    const { error } = await removeP(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    setPDeleteConfirm(null);
    toast({ title: "Priorità eliminata" });
  }
  async function movePItem(id: string, dir: -1 | 1) {
    const s = [...(priorities ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const idx = s.findIndex(p => p.id === id);
    const target = idx + dir;
    if (target < 0 || target >= s.length) return;
    await Promise.all([
      updateP(s[idx].id, { sort_order: s[target].sort_order }),
      updateP(s[target].id, { sort_order: s[idx].sort_order }),
    ]);
  }

  function openCreateL() { setLEditingId(null); setLForm(emptyLabelForm()); setLModalOpen(true); }
  function openEditL(l: TaskLabel) {
    setLEditingId(l.id);
    setLForm({ name: l.name, color: l.color, description: l.description ?? "" });
    setLModalOpen(true);
  }
  async function saveLModal() {
    if (!lForm.name.trim()) return;
    setLSaving(true);
    try {
      if (lEditingId !== null) {
        const { error } = await updateL(lEditingId, { name: lForm.name, color: lForm.color, description: lForm.description || null });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Label aggiornata" });
      } else {
        const { error } = await createL({ name: lForm.name, color: lForm.color, description: lForm.description || null,  });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Label creata" });
      }
      setLModalOpen(false);
    } finally {
      setLSaving(false);
    }
  }
  async function deleteL(id: string) {
    const { error } = await removeL(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    setLDeleteConfirm(null);
    toast({ title: "Label eliminata" });
  }

  if (pLoading || lLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
          Priorità &amp; Label
        </h2>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
          Configura le priorità e le etichette per i task
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", borderRadius: 8, padding: 4, width: "fit-content" }}>
        {(["priority", "label"] as const).map(t => (
          <button type="button"
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "6px 18px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, transition: "all 0.15s",
              background: tab === t ? GOLD : "transparent",
              color: tab === t ? "#111113" : TEXT_SECONDARY,
            }}
          >
            {t === "priority" ? "Priorità" : "Label"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "priority" ? (
          <motion.div key="priority" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button type="button" className="glass-btn-primary" onClick={openCreateP} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Nuova Priorità
              </button>
            </div>
            <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
              <AnimatePresence initial={false}>
                {sortedP.map((p, idx) => {
                  const Icon = ICON_MAP[p.icon] || Circle;
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 0",
                        borderBottom: idx < sortedP.length - 1 ? `0.5px solid ${BORDER}` : "none",
                      }}
                    >
                      <Icon size={16} style={{ color: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY, flex: 1 }}>{p.name}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: p.color,
                        background: `${p.color}1a`, borderRadius: 4, padding: "2px 7px",
                        border: `0.5px solid ${p.color}40`, flexShrink: 0,
                      }}>L{p.level}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {pDeleteConfirm === p.id ? (
                          <>
                            <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Elimina?</span>
                            <button type="button" onClick={() => deleteP(p.id)} style={iconBtnStyle("#EF4444")}><Check size={13} /></button>
                            <button type="button" onClick={() => setPDeleteConfirm(null)} style={iconBtnStyle(TEXT_MUTED)}><X size={13} /></button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => movePItem(p.id, -1)} disabled={idx === 0} style={iconBtnStyle(TEXT_MUTED, idx === 0)}><ChevronUp size={13} /></button>
                            <button type="button" onClick={() => movePItem(p.id, 1)} disabled={idx === sortedP.length - 1} style={iconBtnStyle(TEXT_MUTED, idx === sortedP.length - 1)}><ChevronDown size={13} /></button>
                            <button type="button" onClick={() => openEditP(p)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                            <button type="button" onClick={() => setPDeleteConfirm(p.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div key="label" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
              <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED, pointerEvents: "none" }} />
                <input
                  className="glass-input"
                  value={lSearch}
                  onChange={e => setLSearch(e.target.value)}
                  placeholder="Cerca label…"
                  style={{ paddingLeft: 30 }}
                />
              </div>
              <button type="button" className="glass-btn-primary" onClick={openCreateL} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Nuova Label
              </button>
            </div>
            <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
              {filteredL.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: TEXT_MUTED }}>
                  <Tag size={28} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                  <p style={{ fontSize: 13 }}>Nessuna label trovata.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredL.map((l, idx) => (
                    <motion.div
                      key={l.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 0",
                        borderBottom: idx < filteredL.length - 1 ? `0.5px solid ${BORDER}` : "none",
                      }}
                    >
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: l.color,
                        background: `${l.color}1a`, borderRadius: 12, padding: "3px 10px",
                        border: `0.5px solid ${l.color}40`, flexShrink: 0,
                      }}>{l.name}</span>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {lDeleteConfirm === l.id ? (
                          <>
                            <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Elimina?</span>
                            <button type="button" onClick={() => deleteL(l.id)} style={iconBtnStyle("#EF4444")}><Check size={13} /></button>
                            <button type="button" onClick={() => setLDeleteConfirm(null)} style={iconBtnStyle(TEXT_MUTED)}><X size={13} /></button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => openEditL(l)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                            <button type="button" onClick={() => setLDeleteConfirm(l.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Priority Modal */}
      <AnimatePresence>
        {pModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setPModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "90vw" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {pEditingId ? "Modifica Priorità" : "Nuova Priorità"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome priorità" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Icona</span>
                  <select className="glass-input" value={pForm.icon} onChange={e => setPForm(f => ({ ...f, icon: e.target.value }))}>
                    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Livello (0 = più bassa)</span>
                  <input type="number" className="glass-input" value={pForm.level} onChange={e => setPForm(f => ({ ...f, level: Number(e.target.value) }))} min={0} max={10} />
                </label>
                <div style={labelStyle}>
                  <span style={labelText}>Colore</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {COLOR_PRESETS.map(c => (
                      <button type="button" key={c} onClick={() => setPForm(f => ({ ...f, color: c }))}
                        style={{ width: 22, height: 22, borderRadius: 4, background: c, border: pForm.color === c ? "2px solid white" : "2px solid transparent", cursor: "pointer" }} />
                    ))}
                  </div>
                  <input type="color" value={pForm.color} onChange={e => setPForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: 36, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setPModalOpen(false)}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={savePModal} disabled={!pForm.name.trim() || pSaving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {pSaving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Label Modal */}
      <AnimatePresence>
        {lModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setLModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "90vw" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {lEditingId ? "Modifica Label" : "Nuova Label"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={lForm.name} onChange={e => setLForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome label" />
                </label>
                <div style={labelStyle}>
                  <span style={labelText}>Colore</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {COLOR_PRESETS.map(c => (
                      <button type="button" key={c} onClick={() => setLForm(f => ({ ...f, color: c }))}
                        style={{ width: 22, height: 22, borderRadius: 4, background: c, border: lForm.color === c ? "2px solid white" : "2px solid transparent", cursor: "pointer" }} />
                    ))}
                  </div>
                  <input type="color" value={lForm.color} onChange={e => setLForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: 36, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setLModalOpen(false)}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={saveLModal} disabled={!lForm.name.trim() || lSaving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {lSaving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
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
