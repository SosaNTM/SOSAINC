import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Camera, BookOpen, Megaphone, Users, Heart, Package, Star,
  Video, Image, Music, Globe,
  Pencil, Trash2, Check, X, ChevronUp, ChevronDown, Plus, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useContentCategories } from "../../../hooks/settings";
import type { ContentCategory } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const COLOR_PRESETS = ["#4ADE80","#C6A961","#60A5FA","#A78BFA","#F59E0B","#EF4444","#EC4899","#14B8A6","#94A3B8","#FB923C","#84CC16","#F43F5E"];

const ICON_OPTIONS = ["ShoppingBag","Camera","BookOpen","Megaphone","Users","Heart","Package","Star","Video","Image","Music","Globe"] as const;
type IconName = typeof ICON_OPTIONS[number];

const ICON_MAP: Record<IconName, React.ElementType> = {
  ShoppingBag, Camera, BookOpen, Megaphone, Users, Heart, Package, Star, Video, Image, Music, Globe,
};

type PlatformKey = "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "x";

const PLATFORM_LIST: { key: PlatformKey; label: string; color: string }[] = [
  { key: "instagram", label: "Instagram", color: "#E1306C" },
  { key: "facebook",  label: "Facebook",  color: "#1877F2" },
  { key: "linkedin",  label: "LinkedIn",  color: "#0A66C2" },
  { key: "tiktok",    label: "TikTok",    color: "#444444" },
  { key: "youtube",   label: "YouTube",   color: "#FF0000" },
  { key: "x",         label: "X",         color: "#1DA1F2" },
];

type FormState = {
  name: string;
  color: string;
  icon: string;
  platforms: string[];
  frequency: string;
  description: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "", color: "#60A5FA", icon: "ShoppingBag", platforms: [], frequency: "1x settimana",
  description: "", is_active: true,
});

export default function ContentCategories() {
  const { data: categories, loading, create, update, remove } = useContentCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...(categories ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  function openCreate() { setEditingId(null); setForm(emptyForm()); setModalOpen(true); }
  function openEdit(cat: ContentCategory) {
    setEditingId(cat.id);
    setForm({
      name: cat.name, color: cat.color, icon: "ShoppingBag",
      platforms: [...cat.platforms], frequency: cat.frequency ?? "",
      description: cat.description ?? "", is_active: cat.is_active,
    });
    setModalOpen(true);
  }
  async function saveModal() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId !== null) {
        const { error } = await update(editingId, {
          name: form.name, color: form.color, platforms: form.platforms,
          frequency: form.frequency || null, description: form.description || null,
          is_active: form.is_active,
        });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Categoria aggiornata" });
      } else {
        const { error } = await create({
          name: form.name, color: form.color, platforms: form.platforms,
          frequency: form.frequency || null, description: form.description || null,
          is_active: form.is_active, sort_order: (categories?.length ?? 0) + 1,
                  });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Categoria creata" });
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
    toast({ title: "Categoria eliminata" });
  }
  async function moveItem(id: string, dir: -1 | 1) {
    const s = [...(categories ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const idx = s.findIndex(c => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= s.length) return;
    await Promise.all([
      update(s[idx].id, { sort_order: s[target].sort_order }),
      update(s[target].id, { sort_order: s[idx].sort_order }),
    ]);
  }
  function togglePlatform(key: string) {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(key) ? f.platforms.filter(p => p !== key) : [...f.platforms, key],
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
            Categorie Contenuti
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Organizza i tuoi contenuti per tipo e piattaforma
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuova Categoria
        </button>
      </div>

      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: TEXT_MUTED }}>
            <Globe size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>Nessuna categoria. Creane una.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sorted.map((cat, idx) => {
              return (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 0",
                    borderBottom: idx < sorted.length - 1 ? `0.5px solid ${BORDER}` : "none",
                  }}
                >
                  {/* Colored dot */}
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  {/* Name */}
                  <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY, minWidth: 110 }}>{cat.name}</span>
                  {/* Platform dots */}
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {cat.platforms.map(p => {
                      const pl = PLATFORM_LIST.find(x => x.key === p);
                      return pl ? (
                        <div key={p} title={pl.label} style={{
                          width: 18, height: 18, borderRadius: "50%",
                          background: pl.color, fontSize: 9, fontWeight: 700,
                          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {pl.label[0]}
                        </div>
                      ) : null;
                    })}
                  </div>
                  {/* Frequency */}
                  <span style={{ fontSize: 11, color: TEXT_MUTED, flex: 1, minWidth: 0 }}>{cat.frequency}</span>
                  {/* Active badge */}
                  {!cat.is_active && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: TEXT_MUTED,
                      background: "#f3f4f6", borderRadius: 4, padding: "2px 8px",
                      flexShrink: 0,
                    }}>Disattiva</span>
                  )}
                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {deleteConfirm === cat.id ? (
                      <>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Elimina?</span>
                        <button type="button" onClick={() => doDelete(cat.id)} style={iconBtnStyle("#EF4444")}><Check size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} style={iconBtnStyle(TEXT_MUTED)}><X size={13} /></button>
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
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "90vw", maxHeight: "90vh", overflowY: "auto" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {editingId ? "Modifica Categoria" : "Nuova Categoria"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome categoria" />
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
                <div style={labelStyle}>
                  <span style={labelText}>Piattaforme target</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PLATFORM_LIST.map(pl => {
                      const active = form.platforms.includes(pl.key);
                      return (
                        <button type="button" key={pl.key} onClick={() => togglePlatform(pl.key)} style={{
                          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                          border: `0.5px solid ${active ? pl.color : "#e5e7eb"}`,
                          background: active ? `${pl.color}22` : "transparent",
                          color: active ? pl.color : TEXT_MUTED,
                          transition: "all 0.15s",
                          display: "flex", alignItems: "center", gap: 5,
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? pl.color : "currentColor", display: "inline-block" }} />
                          {pl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label style={labelStyle}>
                  <span style={labelText}>Frequenza suggerita</span>
                  <input className="glass-input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} placeholder="Es. 3x settimana" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Descrizione</span>
                  <textarea className="glass-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descrizione opzionale" rows={2} style={{ resize: "vertical" }} />
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

