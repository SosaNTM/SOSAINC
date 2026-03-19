import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Briefcase, Percent, RotateCcw, TrendingUp, MoreHorizontal,
  DollarSign, Gift, Star, Zap, Package, Award,
  Pencil, Trash2, Check, X, ChevronUp, ChevronDown, Plus, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIncomeCategories } from "../../../hooks/settings";
import type { IncomeCategory } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const COLOR_PRESETS = ["#4ADE80","#C6A961","#60A5FA","#A78BFA","#F59E0B","#EF4444","#EC4899","#14B8A6","#94A3B8","#FB923C","#84CC16","#F43F5E"];
const ICON_OPTIONS = ["ShoppingBag","Briefcase","Percent","RotateCcw","TrendingUp","MoreHorizontal","DollarSign","Gift","Star","Zap","Package","Award"] as const;
type IconName = typeof ICON_OPTIONS[number];

const ICON_MAP: Record<IconName, React.ElementType> = {
  ShoppingBag, Briefcase, Percent, RotateCcw, TrendingUp, MoreHorizontal,
  DollarSign, Gift, Star, Zap, Package, Award,
};

type FormState = { name: string; icon: string; color: string; description: string; is_active: boolean };
const emptyForm = (): FormState => ({ name: "", icon: "ShoppingBag", color: "#4ADE80", description: "", is_active: true });

export default function IncomeCategories() {
  const { data: categories, loading, create, update, remove } = useIncomeCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  function openCreate() { setEditingId(null); setForm(emptyForm()); setModalOpen(true); }
  function openEdit(cat: IncomeCategory) {
    setEditingId(cat.id);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, description: cat.description ?? "", is_active: cat.is_active });
    setModalOpen(true);
  }

  async function saveModal() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editingId) {
      const { error } = await update(editingId, { name: form.name, icon: form.icon, color: form.color, description: form.description, is_active: form.is_active });
      if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
      else { toast({ title: "Categoria aggiornata" }); }
    } else {
      const { error } = await create({ name: form.name, icon: form.icon, color: form.color, description: form.description, is_active: form.is_active, sort_order: categories.length });
      if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
      else { toast({ title: "Categoria creata" }); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function deleteItem(id: string) {
    const { error } = await remove(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
    else { toast({ title: "Categoria eliminata" }); }
    setDeleteConfirm(null);
  }

  async function moveItem(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex(c => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    await update(sorted[idx].id, { sort_order: sorted[target].sort_order });
    await update(sorted[target].id, { sort_order: sorted[idx].sort_order });
  }

  const IconComp = (ICON_MAP[form.icon as IconName] ?? MoreHorizontal) as React.ElementType;

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
            Categorie Entrate
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Gestisci le categorie per classificare le entrate
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuova Categoria
        </button>
      </div>

      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10, color: TEXT_MUTED }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Caricamento...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: TEXT_MUTED }}>
            <ShoppingBag size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>Nessuna categoria. Creane una nuova.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sorted.map((cat, idx) => {
              const Icon = (ICON_MAP[cat.icon as IconName] ?? MoreHorizontal) as React.ElementType;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: idx < sorted.length - 1 ? `0.5px solid ${BORDER}` : "none",
                    opacity: cat.is_active ? 1 : 0.45,
                  }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <Icon size={16} style={{ color: cat.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{cat.name}</div>
                    {cat.description && (
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {cat.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {deleteConfirm === cat.id ? (
                      <>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Sei sicuro?</span>
                        <button type="button" onClick={() => deleteItem(cat.id)} style={iconBtnStyle("#4ADE80")}><Check size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} style={iconBtnStyle("#EF4444")}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => moveItem(cat.id, -1)} disabled={idx === 0} style={iconBtnStyle(TEXT_MUTED, idx === 0)}><ChevronUp size={13} /></button>
                        <button type="button" onClick={() => moveItem(cat.id, 1)} disabled={idx === sorted.length - 1} style={iconBtnStyle(TEXT_MUTED, idx === sorted.length - 1)}><ChevronDown size={13} /></button>
                        <button type="button" onClick={() => openEdit(cat)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(cat.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
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
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,11,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "100%" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {editingId ? "Modifica Categoria" : "Nuova Categoria"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome categoria" />
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
                <label style={labelStyle}>
                  <span style={labelText}>Descrizione</span>
                  <textarea className="glass-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descrizione opzionale" rows={2} style={{ resize: "vertical" }} />
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

function iconBtnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6, border: "none",
    background: "transparent", color, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.3 : 1, transition: "background 0.15s",
  };
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 };

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: checked ? GOLD : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s", display: "block" }} />
    </button>
  );
}
